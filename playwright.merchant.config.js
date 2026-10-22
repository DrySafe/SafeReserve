import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/merchant', outputDir: 'test-results-merchant', workers: 1, reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175', browserName: 'chromium',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] },
    viewport: { width: 390, height: 844 }, serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run build:merchant-test && npx vite preview --host 127.0.0.1 --outDir dist-merchant-test --port 4175',
    url: 'http://127.0.0.1:4175', reuseExistingServer: false,
  },
});
