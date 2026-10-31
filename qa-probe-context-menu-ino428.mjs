#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/qa-ino-428';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4300';
const THEMES = ['light', 'dark', 'high-contrast'];

const browser = await chromium.launch();

for (const theme of THEMES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2200 } });
  await page.addInitScript((value) => {
    try { window.localStorage.setItem('ino-theme', value); } catch {}
    document.documentElement.setAttribute('data-theme', value);
  }, theme);
  await page.goto(`${BASE}/docs/components/context-menu`, { waitUntil: 'networkidle' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/context-menu-${theme}.png`, fullPage: true });

  if (theme === 'light') {
    const liveBoxCount = await page.locator('.docs-live-box').count();
    console.log('LIVE_BOX_COUNT:', liveBoxCount);
    const menuElCount = await page.locator('ino-context-menu').count();
    console.log('INO_CONTEXT_MENU_HOST_COUNT:', menuElCount);
    const directiveTargetCount = await page.locator('[inoContextMenu]').count();
    console.log('DIRECTIVE_BOUND_TARGET_COUNT (expect >0 for a working demo):', directiveTargetCount);

    const a11yHtml = await page.locator('h2:text-is("Accessibility") + *').first().innerHTML().catch(() => '(not found)');
    console.log('A11Y_SECTION_SNIPPET:', a11yHtml.slice(0, 160).replace(/\n/g, ' '));
    const notesHtml = await page.locator('h2:text-is("Notes") + *').first().innerHTML().catch(() => '(not found)');
    console.log('NOTES_SECTION_SNIPPET:', notesHtml.slice(0, 160).replace(/\n/g, ' '));
    const mobileHtml = await page.locator('h2:text-is("Mobile parity") + *').first().innerHTML().catch(() => '(not found)');
    console.log('MOBILE_SECTION_SNIPPET:', mobileHtml.slice(0, 160).replace(/\n/g, ' '));
    const rawPreCount = await page.locator('pre.docs-markdown').count();
    console.log('RAW_MARKDOWN_PRE_COUNT (expect 0, D5 fix):', rawPreCount);
  }
  await page.close();
}

// Attempted keyboard-only walkthrough on the live (light-theme) docs page.
const page = await browser.newPage({ viewport: { width: 1280, height: 2200 } });
await page.addInitScript((value) => {
  try { window.localStorage.setItem('ino-theme', value); } catch {}
  document.documentElement.setAttribute('data-theme', value);
}, 'light');
await page.goto(`${BASE}/docs/components/context-menu`, { waitUntil: 'domcontentloaded' });
await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });

console.log('--- ATTEMPTED KEYBOARD-ONLY WALKTHROUGH (doc 27 §3 row 5 evidence) ---');
const box = page.locator('.docs-live-box').first();
await box.waitFor({ state: 'visible' });
await box.click({ button: 'right' });
await page.waitForTimeout(300);
console.log('1. Right-click on "Live example" default demo box. Expected: menu opens, role="menu" appears. Observed role="menu" count:', await page.locator('[role="menu"]').count());
console.log('   Observed role="menuitem" count scoped to .docs-live-box:', await page.locator('.docs-live-box [role="menuitem"]').count());
console.log('   CONCLUSION: no menu opened — the Live example demo has no inoContextMenu-bound target and no items input, so keyboard navigation (Arrow/Home/End/Escape/submenu) cannot be exercised against the shipped docs page.');

await page.close();
await browser.close();
console.log('DONE. Screenshots in', OUT);
