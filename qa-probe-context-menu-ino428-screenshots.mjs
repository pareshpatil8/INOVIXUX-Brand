#!/usr/bin/env node
// QALead independent 3-theme open-state evidence for INO-428, captured against current HEAD.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4200';
const THEMES = ['light', 'dark', 'high-contrast'];
const browser = await chromium.launch();
for (const theme of THEMES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  await page.addInitScript((value) => {
    try { window.localStorage.setItem('ino-theme', value); } catch {}
    document.documentElement.setAttribute('data-theme', value);
  }, theme);
  await page.goto(`${BASE}/docs/components/context-menu`, { waitUntil: 'networkidle' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await trigger.waitFor({ state: 'visible' });
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `artifacts/qa-evidence/context-menu/ino428-${theme}.png`, fullPage: true });
  await page.close();
}
await browser.close();
console.log('done');
