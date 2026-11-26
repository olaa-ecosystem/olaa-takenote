import { defineConfig, devices } from '@playwright/test';

// One server at prototypes/ so each device folder can load ../shared/. Each project runs its own spec file.
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: { trace: 'off' },
  webServer: { command: 'python3 -m http.server 4173 --bind 127.0.0.1', url: 'http://127.0.0.1:4173/ipad-home/', reuseExistingServer: true },
  projects: [
    { name: 'ipad-landscape', testMatch: 'ipad.spec.mjs', use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 }, baseURL: 'http://127.0.0.1:4173/ipad-home/' } },
    { name: 'iphone-portrait', testMatch: 'iphone.spec.mjs', use: { ...devices['iPhone 15'], defaultBrowserType: 'chromium', browserName: 'chromium', baseURL: 'http://127.0.0.1:4173/iphone-home/' } },
  ],
});
