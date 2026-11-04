import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
let server: Server;
let base: string;
const output = resolve('dist/ciencia-sem-barreiras/browser');
test.beforeAll(async () => {
  const html = await readFile(output + '/index.html', 'utf8');
  base = html.match(/<base href="([^"]+)"/)![1];
  server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url!, 'http://localhost').pathname;
      if (!path.startsWith(base)) {
        res.writeHead(404);
        res.end();
        return;
      }
      const relative = decodeURIComponent(path.slice(base.length)) || 'index.html';
      const file = resolve(output, relative);
      if (!file.startsWith(output + '/')) {
        res.writeHead(403);
        res.end();
        return;
      }
      const mime: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
      };
      const bytes = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(4174, '127.0.0.1', r));
});
test.afterAll(async () => {
  await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
});
test('built Pages artifact serves assets and reopens hash routes under configured base', async ({
  page,
}) => {
  await page.route('https://vlibras.gov.br/**', (r) => r.abort());
  await page.route('**/config.json', (r) =>
    r.fulfill({
      json: {
        apiBaseUrl: 'http://localhost:18787',
        publicBaseUrl: '',
        supabaseUrl: '',
        supabasePublishableKey: '',
      },
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4174' + base + '#/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Explore os espaços');
  const image = page.locator('.hero-art img');
  await expect(image).toBeVisible();
  expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.goto('http://localhost:4174' + base + '#/ambientes/aquario-marinho?recurso=texto');
  await expect(page.locator('#texto')).toBeFocused();
  await page.reload();
  await expect(page.locator('#texto')).toBeFocused();
  expect(errors).toEqual([]);
  expect((await readFile(output + '/.nojekyll')).byteLength).toBe(0);
});
