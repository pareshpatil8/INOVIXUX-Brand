#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/qa-ino-432';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4300';
const THEMES = ['light', 'dark', 'high-contrast'];

const browser = await chromium.launch();

for (const theme of THEMES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2000 } });
  await page.addInitScript((value) => {
    try { window.localStorage.setItem('ino-theme', value); } catch {}
    document.documentElement.setAttribute('data-theme', value);
  }, theme);
  await page.goto(`${BASE}/docs/components/panel-menu`, { waitUntil: 'networkidle' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('h2:text-is("Accessibility") + .docs-markdown, h2:text-is("Accessibility contract") + .docs-markdown').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/panel-menu-${theme}.png`, fullPage: true });

  if (theme === 'light') {
    const rowCount = await page.locator('app-panel-menu-demo nav.ino-panel-menu, app-panel-menu-demo nav').count();
    console.log('PANEL_MENU_NAV_COUNT:', rowCount);

    const rtlCount = await page.locator('app-panel-menu-demo [dir="rtl"]').count();
    console.log('RTL_PANE_COUNT:', rtlCount);

    const a11yHtml = await page.locator('h2:text-is("Accessibility") + .docs-markdown, h2:text-is("Accessibility contract") + .docs-markdown').first().innerHTML().catch(() => '(not found)');
    console.log('A11Y_SECTION_SNIPPET:', a11yHtml.slice(0, 200).replace(/\n/g, ' '));

    const notesHtml = await page.locator('h2:text-is("Notes") + .docs-markdown, h2:text-is("Deliberate omissions") + .docs-markdown').first().innerHTML().catch(() => '(not found)');
    console.log('NOTES_SECTION_SNIPPET:', notesHtml.slice(0, 200).replace(/\n/g, ' '));

    const mobileHtml = await page.locator('h2:text-is("Mobile") + .docs-markdown, h2:text-is("Mobile parity") + .docs-markdown').first().innerHTML().catch(() => '(not found)');
    console.log('MOBILE_SECTION_SNIPPET:', mobileHtml.slice(0, 200).replace(/\n/g, ' '));
  }
  await page.close();
}

// Keyboard-only walkthrough on the live (light-theme) page.
const page = await browser.newPage({ viewport: { width: 1280, height: 2000 } });
await page.addInitScript((value) => {
  try { window.localStorage.setItem('ino-theme', value); } catch {}
  document.documentElement.setAttribute('data-theme', value);
}, 'light');
await page.goto(`${BASE}/docs/components/panel-menu`, { waitUntil: 'domcontentloaded' });
await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });

const activeDesc = async () => page.evaluate(() => {
  const el = document.activeElement;
  if (!el) return '(none)';
  const attrs = ['role', 'aria-expanded', 'aria-controls', 'aria-disabled', 'disabled', 'tabindex']
    .map((a) => (el.getAttribute(a) !== null ? `${a}="${el.getAttribute(a)}"` : ''))
    .filter(Boolean).join(' ');
  const text = (el.textContent || '').trim().slice(0, 40);
  return `<${el.tagName.toLowerCase()} ${attrs}> "${text}"`;
});

console.log('--- KEYBOARD WALKTHROUGH: single-open demo pane (first ino-panel-menu) ---');
const firstNav = page.locator('app-panel-menu-demo nav').first();
await firstNav.waitFor({ state: 'visible', timeout: 10000 });
const firstHeader = firstNav.locator('button').first();
await firstHeader.focus();
console.log('1. Focus "Payments" header via .focus():', await activeDesc());

await page.keyboard.press('Enter');
await page.waitForTimeout(80);
console.log('2. Enter toggles expand:', await activeDesc());

await page.keyboard.press('Tab');
await page.waitForTimeout(50);
console.log('3. Tab moves into first revealed child ("Transactions" leaf):', await activeDesc());

// Navigate to the second top-level header ("Settlements") via repeated Tab, verify single-open
// collapses "Payments" when "Settlements" opens (multiple=false default pane).
let desc = '';
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(40);
  desc = await activeDesc();
  if (desc.includes('Settlements')) break;
}
console.log('4. Tabbed forward to "Settlements" header:', desc);
await page.keyboard.press('Enter');
await page.waitForTimeout(80);
const paymentsExpanded = await firstNav.locator('button:has-text("Payments")').getAttribute('aria-expanded');
console.log('5. After opening "Settlements", "Payments" aria-expanded (expect false, single-open accordion):', paymentsExpanded);

console.log('--- Disabled group: never reachable, never expandable ---');
const disabledPane = page.locator('app-panel-menu-demo').locator('text=disabled group').locator('..').locator('nav');
const disabledHeader = page.locator('app-panel-menu-demo button:has-text("Archived")').first();
const isDisabled = await disabledHeader.evaluate((el) => el.disabled || el.getAttribute('aria-disabled'));
console.log('6. "Archived (locked)" header disabled/aria-disabled:', isDisabled);
await disabledHeader.evaluate((el) => el.focus()).catch(() => {});
const focusedDisabled = await page.evaluate(() => document.activeElement === document.activeElement); // noop guard
const activeAfterAttempt = await activeDesc();
console.log('7. document.activeElement after attempting to focus disabled header (expect it did NOT take focus):', activeAfterAttempt);

console.log('--- Loading state ---');
const loadingNav = page.locator('app-panel-menu-demo nav[aria-busy="true"]');
console.log('8. loading pane nav[aria-busy="true"] count (expect 1):', await loadingNav.count());

console.log('--- Empty state ---');
const emptyText = await page.locator('app-panel-menu-demo').locator('text=No menu items configured').count();
console.log('9. empty pane renders emptyLabel text (expect 1):', emptyText);

await page.close();
await browser.close();
console.log('DONE. Screenshots in', OUT);
