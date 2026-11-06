import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
const slugs = [
  'aquario-nascente-rio',
  'aquario-fundo-rio',
  'aquario-lagoa',
  'aquario-marinho',
  'aquario-praia',
  'diorama-manguezal',
  'diorama-restinga',
  'diorama-mata-atlantica',
  'diorama-mata-atlantica-2',
];
test.beforeEach(async ({ context }) => {
  await context.route('https://vlibras.gov.br/**', (r) => r.abort());
  await context.route('**/config.json', (r) =>
    r.fulfill({
      json: {
        apiBaseUrl: 'http://localhost:18787',
        publicBaseUrl: 'https://example.github.io/csb/',
        supabaseUrl: '',
        supabasePublishableKey: '',
      },
    }),
  );
});
for (const width of [320, 360, 375, 390, 414, 768, 1024, 1440])
  test('responsive home ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Explore os espaços');
    await expect(page.locator('.space-card')).toHaveCount(9);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.locator('footer')).toContainText('Projeto acadêmico independente');
    await page.screenshot({ path: 'test-results/home-' + width + '.png', fullPage: true });
    if (width === 390 || width === 1440) {
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
    }
  });
test('all nine pages and QR resource focus survive refresh', async ({ page }) => {
  for (const slug of slugs) {
    await page.goto('/#/ambientes/' + slug + '?recurso=libras');
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
    await expect(page.locator('#libras')).toBeVisible();
    await expect(page.locator('#libras')).toBeFocused();
    await expect(page.locator('.resource-nav a')).toHaveText([
      'Texto',
      'Fotos',
      'Libras',
      'Audiodescrição',
      'Atividades',
    ]);
    expect(
      await page
        .locator('app-content > section')
        .evaluateAll((sections) => sections.map((section) => section.id)),
    ).toEqual(['texto', 'fotos', 'libras', 'audiodescricao', 'atividades']);
    await expect(page.getByRole('heading', { name: 'Audiodescrição', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Ouça o conteúdo', exact: true })).toHaveCount(
      0,
    );
    await expect(page.locator('#audio')).toHaveCount(0);
    await expect(
      page
        .getByRole('navigation', { name: 'Recursos do ambiente' })
        .getByRole('link', { name: 'Áudio', exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#libras')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('keyboard skip link, menu and accessible admin', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Pular para o conteúdo')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.goto('/#/admin');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel('Senha de acesso').fill('incorrect');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Não foi possível entrar');
});
test('editor draft isolation, upload, publish, refresh, remove section, restore, logout', async ({
  page,
}) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/#/admin');
  await page.getByLabel('Senha de acesso').fill('local-testing-password-2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gerenciar ambientes' })).toBeVisible();
  await expect(page.locator('.space-card')).toHaveCount(9);
  await expect(
    page.locator('.space-card .art-label').filter({ hasText: 'Fotografia' }),
  ).toHaveCount(7);
  await expect(page.locator('.space-card img[src="imagens/MataAtlantica1.jpeg"]')).toHaveCount(1);
  await expect(page.locator('.space-card img[src="imagens/MataAtlantica2.jpeg"]')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Diorama da Mata Atlântica 1', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Diorama da Mata Atlântica 2', exact: true }),
  ).toBeVisible();
  await page
    .locator('.space-card')
    .filter({ hasText: 'Aquário Marinho' })
    .getByRole('button', { name: 'Editar' })
    .click();
  for (const width of [320, 360, 390, 414, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByLabel('Destino', { exact: true }).selectOption('libras');
  await expect(page.getByRole('img', { name: 'QR Code para o destino exibido' })).toBeVisible();
  await expect(page.locator('.qr .wrap')).toContainText(
    'https://example.github.io/csb/#/ambientes/aquario-marinho?recurso=libras',
  );
  for (const format of ['PNG', 'SVG']) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar ' + format }).click();
    const d = await pending;
    const path = await d.path();
    const bytes = await readFile(path!);
    if (format === 'PNG')
      expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    else expect(bytes.toString()).toContain('<svg');
  }
  await page.getByRole('button', { name: 'Adicionar parte' }).click();
  const block = page.locator('textarea[id^="text-"]').last();
  const text = 'Descoberta de teste ' + Date.now() + ' <img src=x onerror=alert(1)>';
  await block.fill(text);
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Rascunho salvo');
  const publicPage = await page.context().newPage();
  await publicPage.route('https://vlibras.gov.br/**', (r) => r.abort());
  await publicPage.goto('/#/ambientes/aquario-marinho');
  await expect(publicPage.locator('#texto')).not.toContainText(text);
  await page.getByLabel('Anexar Fotos (máximo 50 MB)').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/p8AAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByRole('status')).toContainText('Arquivo recebido');
  const photo = page.locator('.media-editor').last();
  await photo.getByLabel('Descrição da imagem').fill('Ilustração de teste');
  await photo.getByLabel('Crédito e licença').fill('Arquivo de teste, criado para QA');
  await photo.getByLabel('Confirmo o direito de uso desta imagem').check();
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Atualização publicada');
  await publicPage.reload();
  await expect(publicPage.locator('#texto')).toContainText(text);
  await expect(publicPage.getByRole('img', { name: 'Ilustração de teste' })).toBeVisible();
  expect(await publicPage.locator('#texto img').count()).toBe(0);
  const priorImage = await publicPage
    .getByRole('img', { name: 'Ilustração de teste' })
    .getAttribute('src');
  await photo.getByLabel('Substituir arquivo').setInputFiles({
    name: 'replacement.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/p8AAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByRole('status')).toContainText('Arquivo recebido');
  await expect(photo.getByLabel('Confirmo o direito de uso desta imagem')).toBeChecked();
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Atualização publicada');
  await publicPage.reload();
  await expect(publicPage.getByRole('img', { name: 'Ilustração de teste' })).not.toHaveAttribute(
    'src',
    priorImage!,
  );
  await page.screenshot({ path: 'test-results/admin-390.png', fullPage: true });
  await page.getByLabel('Exibir texto ao publicar').uncheck();
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Atualização publicada');
  await publicPage.reload();
  await expect(publicPage.locator('#texto')).toContainText('Conteúdo em preparação');
  await page.getByRole('button', { name: 'Recuperar versão' }).first().click();
  await expect(page.getByRole('status')).toContainText('Versão recuperada');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByLabel('Senha de acesso')).toBeVisible();
  await publicPage.close();
});
test('network failure provides a retry', async ({ page }) => {
  await page.route('**/public/spaces/aquario-praia', (r) => r.abort());
  await page.goto('/#/ambientes/aquario-praia');
  await expect(page.getByRole('alert')).toContainText('Não foi possível buscar');
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
});

test('PDFs in Texto and Atividades and multiple photos stay private until publication', async ({
  page,
}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/#/admin');
  await page.getByLabel('Senha de acesso').fill('local-testing-password-2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page
    .locator('.space-card')
    .filter({ hasText: 'Aquário Lagoa' })
    .getByRole('button', { name: 'Editar' })
    .click();
  const pdf = await readFile('tests/fixtures/document.pdf');
  for (const [kind, name] of [
    ['text_pdf', 'Texto para leitura'],
    ['activity_pdf', 'Atividade em PDF'],
  ]) {
    await page
      .locator('#upload-' + kind)
      .setInputFiles({ name: name + '.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(page.getByRole('status')).toContainText('Arquivo recebido');
    const resource = page.locator('.media-editor').last();
    await resource.getByLabel('Título do PDF').fill(name);
    await resource.getByLabel('Crédito e licença').fill('Documento de teste criado para QA');
    await expect(resource.getByRole('link', { name: 'Abrir PDF em nova aba' })).toHaveAttribute(
      'target',
      '_blank',
    );
  }
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/p8AAAAASUVORK5CYII=',
    'base64',
  );
  const photos = page.getByLabel('Anexar Fotos (máximo 50 MB)');
  await expect(photos).toHaveAttribute('multiple', '');
  await photos.setInputFiles(
    ['Primeira foto', 'Segunda foto'].map((name) => ({
      name: name + '.png',
      mimeType: 'image/png',
      buffer: png,
    })),
  );
  await expect(page.getByRole('status')).toContainText('2 arquivos recebidos');
  const images = page
    .locator('.media-editor')
    .filter({ has: page.getByLabel('Descrição da imagem', { exact: true }) });
  await expect(images).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await images
      .nth(i)
      .getByLabel('Descrição da imagem', { exact: true })
      .fill('Foto de teste ' + i);
    await images.nth(i).getByLabel('Crédito e licença').fill('Criada para QA');
    await images.nth(i).getByLabel('Confirmo o direito de uso desta imagem').check();
  }
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Rascunho salvo');
  const visitor = await page.context().newPage();
  await visitor.goto('/#/ambientes/aquario-lagoa?recurso=atividades');
  await expect(visitor.locator('#atividades')).toBeFocused();
  await expect(visitor.locator('#texto a, #atividades a')).toHaveCount(0);
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Atualização publicada');
  await visitor.reload();
  await expect(visitor.locator('#texto a')).toContainText('Texto para leitura');
  await expect(visitor.locator('#texto .pending')).toHaveCount(0);
  await expect(visitor.locator('#atividades a')).toContainText('Atividade em PDF');
  await expect(visitor.locator('#fotos img')).toHaveCount(2);
  const previous = await visitor.locator('#atividades a').getAttribute('href');
  const response = await visitor.request.get(previous!);
  expect(response.headers()['content-type']).toBe('application/pdf');
  expect(await response.body()).toEqual(pdf);
  const activity = page
    .locator('.media-editor')
    .filter({ has: page.getByLabel('Título do PDF', { exact: true }) })
    .last();
  await activity
    .getByLabel('Substituir arquivo')
    .setInputFiles({ name: 'Substituida.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByRole('status')).toContainText('Arquivo recebido');
  await page.getByLabel('Exibir texto ao publicar').uncheck();
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Atualização publicada');
  await visitor.reload();
  await expect(visitor.locator('#texto a')).toHaveCount(0);
  await expect(visitor.locator('#atividades a')).not.toHaveAttribute('href', previous!);
  expect((await new AxeBuilder({ page: visitor }).analyze()).violations).toEqual([]);
  await visitor.close();
});
