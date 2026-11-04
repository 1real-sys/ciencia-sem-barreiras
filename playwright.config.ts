import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:14200',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath:
        process.env.CHROME_BIN || (process.env.CI ? undefined : '/usr/bin/google-chrome'),
      args: ['--no-sandbox'],
    },
  },
  webServer: [
    {
      command: 'npm start -- --host 127.0.0.1 --port 14200',
      url: 'http://localhost:14200',
      reuseExistingServer: false,
    },
    {
      command: 'npm run demo',
      url: 'http://localhost:18787/health',
      reuseExistingServer: false,
      env: {
        DEMO_PORT: '18787',
        DEMO_ALLOWED_ORIGINS: 'http://localhost:14200,http://localhost:4174',
        DEMO_PASSWORD: 'local-testing-password-2026',
        DEMO_DIR: '/tmp/csb-e2e-' + process.pid,
      },
    },
  ],
});
