import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SPACES } from '../../shared/content';

test.beforeEach(async ({ context }) => {
  await context.route('https://vlibras.gov.br/**', (route) => route.abort());
  await context.route('**/config.json', (route) =>
    route.fulfill({
      json: {
        apiBaseUrl: 'http://localhost:18787',
        publicBaseUrl: '',
        supabaseUrl: '',
        supabasePublishableKey: '',
      },
    }),
  );
});

for (const width of [320, 360, 375, 390, 414, 768, 1024, 1440]) {
  test(`environment listing and nine detail pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/ambientes');
    await expect(page.locator('.space-card')).toHaveCount(9);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/environments-list-${width}.png`, fullPage: true });
    if ([320, 768, 1440].includes(width)) {
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    for (const [slug, title] of SPACES) {
      await page.locator(`.space-card[href="#/ambientes/${slug}"]`).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.locator('app-content > section')).toHaveCount(5);
      await expect
        .poll(() =>
          page.locator('.space-cover img').evaluate((img: HTMLImageElement) => img.naturalWidth),
        )
        .toBeGreaterThan(0);
      for (const link of await page.locator('.resource-nav a').all()) {
        const box = await link.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByRole('link', { name: '← Todos os ambientes' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explore os nove ambientes');
    }
    await page.goto('/#/ambientes/aquario-marinho');
    await expect(page.locator('#texto')).toBeVisible();
    await page.screenshot({ path: `test-results/environment-detail-${width}.png`, fullPage: true });
    if ([320, 768, 1440].includes(width)) {
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  });
}

test('environment resource keyboard navigation, QR refresh and adjacent routes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/ambientes/aquario-marinho');
  await expect(page.locator('#texto')).toBeVisible();
  for (const id of ['texto', 'fotos', 'libras', 'audiodescricao', 'atividades']) {
    const link = page.locator(`.resource-nav a[href$="recurso=${id}"]`);
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#' + id)).toBeFocused();
    await expect(link).toHaveAttribute('aria-current', 'location');
    await page.reload();
    await expect(page.locator('#' + id)).toBeFocused();
  }
  for (let index = 3; index < SPACES.length - 1; index++) {
    await page.getByRole('link', { name: /Próximo ambiente/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(SPACES[index + 1][1]);
  }
  await expect(page.getByRole('link', { name: /Próximo ambiente/ })).toHaveCount(0);
  for (let index = SPACES.length - 1; index > 0; index--) {
    await page.getByRole('link', { name: /Ambiente anterior/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(SPACES[index - 1][1]);
  }
  await expect(page.getByRole('link', { name: /Ambiente anterior/ })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '34px';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
