import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const preview = process.env.PLAYWRIGHT_PREVIEW === '1';
const port = preview ? 4173 : 5173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: '**/browser.spec.ts',
  outputDir: './test-results/artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'test-results/html', open: 'never' }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined,
      headless: true,
      args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--renderer-process-limit=2', '--num-raster-threads=2'],
    },
  },
  webServer: {
    command: `npm run ${preview ? 'preview' : 'dev'} -- --host 0.0.0.0 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
