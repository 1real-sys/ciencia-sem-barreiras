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
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.jpeg': 'image/jpeg',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
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
  for (const route of ['#/', '#/ambientes']) {
    await page.goto('http://localhost:4174' + base + route);
    const cards = page.locator('.space-card');
    await expect(cards).toHaveCount(9);
    const files = [
      'aquario-nascente-rio.svg',
      'aquario-fundo-rio.svg',
      'imagens/AquarioLagoa.jpeg',
      'imagens/AquarioMarinho.jpeg',
      'imagens/AquarioPraia.jpeg',
      'imagens/Manguezal.jpeg',
      'imagens/Restinga.jpeg',
      'imagens/MataAtlantica1.jpeg',
      'imagens/MataAtlantica2.jpeg',
    ];
    for (const [index, file] of files.entries()) {
      const card = cards.nth(index);
      const cover = card.locator('img');
      await cover.scrollIntoViewIfNeeded();
      await expect(cover).toHaveAttribute('src', file);
      await expect
        .poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      await expect(card.locator('.art-label')).toHaveText(index < 2 ? 'Ilustração' : 'Fotografia');
      expect(await cover.evaluate((img) => getComputedStyle(img).filter)).toBe('none');
    }
  }
  const pdf = await readFile('tests/fixtures/document.pdf');
  await page.route('**/built-review.pdf', (route) =>
    route.fulfill({ contentType: 'application/pdf', body: pdf }),
  );
  await page.route('**/public/spaces/aquario-marinho', (route) =>
    route.fulfill({
      json: {
        revision: 1,
        content: {
          blocks: [],
          textEnabled: true,
          media: [
            {
              id: 'ed2f07ae-e9c6-4c71-923c-26422c5ac099',
              kind: 'text_pdf',
              enabled: true,
              url: 'http://localhost:4174' + base + 'built-review.pdf',
              alt: 'Leitura no build',
              credit: 'QA',
            },
          ],
        },
      },
    }),
  );
  await page.goto('http://localhost:4174' + base + '#/ambientes/aquario-marinho?recurso=texto');
  await expect(page.locator('#texto')).toBeFocused();
  const readerAssets: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/pdfjs/')) readerAssets.push(request.url());
  });
  await page.getByRole('button', { name: 'Leitura no build (PDF)', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Leitura no build', exact: true });
  await expect(modal.locator('canvas').first()).toBeVisible();
  await expect(modal.locator('.textLayer')).toContainText('Documento de teste para QA');
  expect(readerAssets.some((url) => url.includes(base + 'pdfjs/pdf.worker.min.mjs'))).toBe(true);
  expect(readerAssets.some((url) => url.includes(base + 'pdfjs/pdf_viewer.css'))).toBe(true);
  await modal.getByRole('button', { name: 'Fechar PDF' }).click();
  await expect(modal).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => history.state?.csbPdf || null)).toBe(null);
  await page.reload();
  await expect(page.locator('#texto')).toBeFocused();
  expect(errors).toEqual([]);
  expect((await readFile(output + '/.nojekyll')).byteLength).toBe(0);
});
