import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4300';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 500 } });
await page.goto(`${BASE}/docs/components/paginator`, { waitUntil: 'networkidle' });
await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 30000 });
for (const theme of ['dark', 'light', 'high-contrast']) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(300);
  const el = page.locator('.ino-paginator__btn--active').first();
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `/tmp/qa-ino-871/active-btn-${theme}.png` });
}
await browser.close();
console.log('done');
