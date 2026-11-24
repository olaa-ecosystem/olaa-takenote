import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'off' },
  webServer: { command: 'python3 -m http.server 4173 --bind 127.0.0.1', url: 'http://127.0.0.1:4173/', reuseExistingServer: true },
  projects: [
    { name: 'ipad-landscape', use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 } } },
  ],
});
