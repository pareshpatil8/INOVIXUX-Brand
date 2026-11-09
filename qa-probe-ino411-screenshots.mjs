import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = '/tmp/qa-ino411-revalidate';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const theme of ['light', 'dark', 'high-contrast']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto('http://localhost:4327/docs/components/select-button', { waitUntil: 'networkidle' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible' });
  await page.locator(`.docs-theme-switcher button:text-is("${theme}")`).click();
  await page.waitForTimeout(300);
  const pressed = await page.locator(`.docs-theme-switcher button:text-is("${theme}")`).getAttribute('aria-pressed');
  const demo = page.locator('app-select-button-demo');
  await demo.waitFor({ state: 'visible' });
  const optionCount = await demo.locator('ino-select-button-option').count();
  await page.screenshot({ path: `${OUT}/select-button-${theme}.png`, fullPage: true });
  console.log(theme, 'pressed=', pressed, 'options=', optionCount, 'consoleErrors=', consoleErrors.length, consoleErrors.slice(0,2));
  await page.close();
}
await browser.close();
