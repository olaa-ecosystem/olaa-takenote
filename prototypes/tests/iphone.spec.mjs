// Smoke tests for the iPhone build (iphone-home/), with touch at iPhone 15 size in Chromium. Real iPhone Safari still needs a check by hand.
import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test.beforeEach(async ({ page }, info) => {
  const problems = [];
  page.on('pageerror', e => problems.push(`script error: ${e.message}`));
  page.on('console', m => { if ((m.type() === 'error' && !/fonts\.g|ERR_INTERNET_DISCONNECTED/.test(m.text())) || /Content Security Policy/i.test(m.text())) problems.push(m.text()); });
  info.problems = problems;
  await page.goto('./');
  await expect(page.locator('#noteMeta')).toContainText('Draft');
});

test.afterEach(async ({}, info) => { expect(info.problems, 'no script errors or CSP violations').toEqual([]); });

test('the note fills the screen between the top bar and the toolbar', async ({ page }) => {
  const vw = page.viewportSize().width;
  const note = await page.locator('#sheet .paper').boundingBox(), top = await page.locator('#topWin').boundingBox(), dock = await page.locator('#dock .win').boundingBox();
  expect(note.width).toBeGreaterThan(vw - 24);
  expect(note.y).toBeGreaterThan(top.y + top.height - 1);
  expect(note.y + note.height).toBeLessThan(dock.y + 1);
  expect(top.width).toBeLessThanOrEqual(vw);
  await expect(page.locator('#files > .item').first()).toBeHidden();      // files live behind the Files button
});

test('one finger draws', async ({ page }) => {
  const r = await page.locator('#sheet .paper').boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 60, y }] });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 60 + i * 12, y: y + i * 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => { const c = document.querySelector('#base'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })).toBeGreaterThan(50);
});

test('Files shows every file, and a file opens the width of the phone', async ({ page }) => {
  await page.locator('#qFiles').tap();
  await expect(page.locator('#files > .item', { hasText: 'ideas.txt' })).toBeVisible();
  await page.waitForTimeout(1200);      // the grid flies into place first
  await page.locator('#files > .item', { hasText: 'ideas.txt' }).locator('.tile').tap({ force: true });
  await expect(page.locator('#panel')).toBeVisible();
  await page.waitForTimeout(800);      // the window grows out of the file's icon first
  const p = await page.locator('#panel').boundingBox();
  expect(p.width).toBeGreaterThan(page.viewportSize().width - 24);
});

test('an imported file shows up in Files (the desk is hidden on iPhone)', async ({ page }) => {
  const file = join(tmpdir(), 'olaa-phone.txt'); writeFileSync(file, 'hello from the iPhone test');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#qImport').tap()]);
  await chooser.setFiles(file);
  await expect(page.locator('#files > .item', { hasText: 'olaa-phone.txt' })).toBeVisible();
});

test('the toolbar fits the screen and scrolls sideways', async ({ page }) => {
  const d = await page.locator('#dock .win').boundingBox(), vw = page.viewportSize().width;
  expect(d.x).toBeGreaterThanOrEqual(0); expect(d.x + d.width).toBeLessThanOrEqual(vw + 1);
  expect(await page.locator('#dock .win').evaluate(w => w.scrollWidth > w.clientWidth)).toBe(true);
});

test('installs as an app and opens offline', async ({ page, context }) => {
  const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  expect(manifest.display).toBe('standalone');
  expect(manifest.orientation).toBe('portrait');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#noteMeta')).toContainText('Draft');
  await context.setOffline(false);
});
