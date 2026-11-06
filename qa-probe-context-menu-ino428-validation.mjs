#!/usr/bin/env node
// Independent QALead §2 validation probe for ino-context-menu (INO-428).
// Not based on the builder's INO-810 probe script — re-derives every check from the live page.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/qa-ino-428-validation';
mkdirSync(OUT, { recursive: true });
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

  // Open the menu before screenshotting so the open state is captured (row 2/5 evidence).
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/context-menu-open-${theme}.png`, fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  if (theme === 'light') {
    console.log('=== STRUCTURE / REGISTRATION (row 1) ===');
    console.log('DIRECTIVE_BOUND_TARGET_COUNT:', await page.locator('[inoContextMenu]').count());
    console.log('INO_CONTEXT_MENU_HOST_COUNT:', await page.locator('ino-context-menu').count());

    console.log('=== NOTES RENDERING (row 6) ===');
    const rawPreCount = await page.locator('pre.docs-markdown').count();
    console.log('RAW_MARKDOWN_PRE_COUNT (expect 0):', rawPreCount);
    const notesHtml = await page.locator('h2:text-is("Notes") + *').first().innerHTML().catch(() => '(not found)');
    console.log('NOTES_SECTION_SNIPPET:', notesHtml.slice(0, 200).replace(/\n/g, ' '));

    console.log('=== MOBILE DISPOSITION (row 7) ===');
    const mobileHtml = await page.locator('h2:text-is("Mobile parity") + *').first().innerHTML().catch(() => '(not found)');
    console.log('MOBILE_SECTION_SNIPPET:', mobileHtml.slice(0, 200).replace(/\n/g, ' '));

    console.log('=== A11Y SECTION PRESENT (row 5) ===');
    const a11yHtml = await page.locator('h2:text-is("Accessibility") + *').first().innerHTML().catch(() => '(not found)');
    console.log('A11Y_SECTION_SNIPPET:', a11yHtml.slice(0, 200).replace(/\n/g, ' '));
  }
  await page.close();
}

// --- Independent keyboard-only walkthrough (row 5 required evidence) ---
console.log('\n=== KEYBOARD-ONLY WALKTHROUGH ===');
const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
await page.addInitScript((value) => {
  try { window.localStorage.setItem('ino-theme', value); } catch {}
  document.documentElement.setAttribute('data-theme', value);
}, 'light');
await page.goto(`${BASE}/docs/components/context-menu`, { waitUntil: 'domcontentloaded' });
await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });

const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
await trigger.waitFor({ state: 'visible' });

// 1. Right-click opens, focus moves to first item.
await trigger.click({ button: 'right' });
await page.waitForTimeout(300);
const menuVisible = await page.locator('[role="menu"]').first().isVisible();
console.log('1. Right-click trigger -> menu opens with role="menu":', menuVisible);
const firstItemFocused = await page.evaluate(() => {
  const el = document.activeElement;
  return el && el.getAttribute('role') === 'menuitem';
});
console.log('2. Focus moves to first menu item on open:', firstItemFocused);

// 2. ArrowDown moves roving tabindex.
const beforeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(100);
const afterText = await page.evaluate(() => document.activeElement?.textContent?.trim());
console.log('3. ArrowDown moves focus (before -> after):', beforeText, '->', afterText, '| moved:', beforeText !== afterText);

// 3. Home/End jump.
await page.keyboard.press('End');
await page.waitForTimeout(100);
const endText = await page.evaluate(() => document.activeElement?.textContent?.trim());
await page.keyboard.press('Home');
await page.waitForTimeout(100);
const homeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
console.log('4. End -> Home jump observed:', endText, '/', homeText);

// 4. Disabled item skipped by ArrowDown navigation.
const disabledCount = await page.locator('[role="menuitem"][aria-disabled="true"]').count();
console.log('5. Disabled menuitem present:', disabledCount > 0, '(count:', disabledCount, ')');

// 5. Separator present, role=separator, not focusable.
const sepCount = await page.locator('[role="separator"]').count();
console.log('6. Separator role count:', sepCount);

// 6. Right arrow opens nested submenu (if a children-bearing item is reachable).
const submenuParent = page.locator('[role="menuitem"]', { hasText: '›' }).first();
let submenuOpened = false;
if (await submenuParent.count() > 0) {
  await submenuParent.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  submenuOpened = (await page.locator('[role="menu"]').count()) > 1;
}
console.log('7. Right Arrow on nested item opens submenu:', submenuOpened);

// 7. Escape closes (submenu first, then root) and returns focus to the invoking target.
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const stillOpenAfterFirstEscape = (await page.locator('[role="menu"]').count()) > 0;
if (stillOpenAfterFirstEscape) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}
const menuClosedAfterEscape = (await page.locator('[role="menu"]').count()) === 0;
const focusReturned = await page.evaluate(() => {
  const el = document.activeElement;
  return el && (el.matches('.demo-trigger') || el.hasAttribute('inoContextMenu') || el.getAttribute('ng-reflect-ino-context-menu') !== null);
});
console.log('8. Escape closes menu entirely:', menuClosedAfterEscape, '| focus returned to invoking target:', focusReturned, '| activeElement tag/class:', await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 120)));

// 8. Click-outside closes and returns focus.
await trigger.click({ button: 'right' });
await page.waitForTimeout(200);
await page.mouse.click(10, 10);
await page.waitForTimeout(200);
console.log('9. Click-outside closes menu:', (await page.locator('[role="menu"]').count()) === 0);

await page.close();
await browser.close();
console.log('\nDONE. Screenshots in', OUT);
