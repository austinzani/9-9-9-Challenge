import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'node ../../node_modules/.pnpm/node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',
    cwd: '.',
    timeout: 60_000,
    reuseExistingServer: true,
  },
});
