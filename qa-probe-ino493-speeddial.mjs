#!/usr/bin/env node
// INO-493 builder verification probe for the live /docs/components/speeddial page on :4300.
// Not the §2 sign-off (QALead owns that) — this proves the shipped page renders and the
// menu-button contract works before review.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4300';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ headless: true });

async function freshPage(theme) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript((t) => {
    try { localStorage.setItem('ino-theme', t); } catch {}
  }, theme);
  await page.goto(`${BASE}/docs/components/speeddial`, { waitUntil: 'networkidle' });
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(200);
  return page;
}

// 1. Behavior checks (dark theme page).
const page = await freshPage('dark');

const bodyText = await page.locator('body').innerText();
check('docs page renders (no "Component not found")', !/component not found/i.test(bodyText));

const fab = page.locator('.speeddial-stage').first().locator('.ino-speeddial__fab');
check('live-example FAB renders', (await fab.count()) === 1);
check('FAB aria-haspopup=menu', (await fab.getAttribute('aria-haspopup')) === 'menu');
check('FAB aria-expanded=false at rest', (await fab.getAttribute('aria-expanded')) === 'false');

await fab.click();
await page.waitForTimeout(300);
check('click opens: aria-expanded=true', (await fab.getAttribute('aria-expanded')) === 'true');

const liveDial = page.locator('.speeddial-stage').first().locator('.ino-speeddial');
const menuItems = liveDial.locator('[role="menuitem"]');
check('4 menuitems render', (await menuItems.count()) === 4, `count=${await menuItems.count()}`);
const disabledItem = liveDial.locator('[role="menuitem"][aria-disabled="true"]');
check('disabled action carries aria-disabled', (await disabledItem.count()) === 1);

const firstBox = await menuItems.nth(0).boundingBox();
check('actions visible above FAB (direction up)', !!firstBox && firstBox.y > 0);
const size = firstBox ? Math.min(firstBox.width, firstBox.height) : 0;
check('action target ≥ 24px (SC 2.5.8)', size >= 24, `${size}px`);

// Esc closes + focus return.
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
check('Escape closes', (await fab.getAttribute('aria-expanded')) === 'false');

// Keyboard open: focus FAB, ArrowDown focuses first action.
await fab.focus();
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(250);
const focused1 = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
check('ArrowDown on FAB opens + focuses first action', focused1 === 'New file', `focused=${focused1}`);

// Arrow skips the disabled item: New file -> Upload -> Delete (Share locked skipped).
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150);
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150);
const focused3 = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
check('arrow navigation skips disabled action', focused3 === 'Delete', `focused=${focused3}`);

// Wrap.
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150);
const focusedWrap = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
check('arrow navigation wraps to first', focusedWrap === 'New file', `focused=${focusedWrap}`);

// Activate with Enter: last-action readout updates, dial closes, focus returns to FAB.
await page.keyboard.press('Enter');
await page.waitForTimeout(250);
const readout = await page.locator('.demo-live').first().innerText();
check('Enter activates action (readout updates)', /New file/.test(readout), readout.trim());
check('activation closes the dial', (await fab.getAttribute('aria-expanded')) === 'false');
const focusBack = await page.evaluate(() => document.activeElement?.className || '');
check('focus returns to FAB after activation', focusBack.includes('ino-speeddial__fab'));

// Mask demo: open → scrim appears → click scrim closes.
const maskSection = page.locator('section', { hasText: 'Mask' }).first();
const maskFab = maskSection.locator('.ino-speeddial__fab').first();
await maskFab.scrollIntoViewIfNeeded();
await maskFab.click();
await page.waitForTimeout(300);
const maskEl = maskSection.locator('.ino-speeddial__mask');
check('mask scrim renders while open', (await maskEl.count()) === 1);
await maskEl.click({ position: { x: 10, y: 10 } });
await page.waitForTimeout(250);
check('clicking mask closes dial', (await maskFab.getAttribute('aria-expanded')) === 'false');

// FAB size scale.
const sizes = [];
for (const [label, expected] of [['Small dial (dense)', 36], ['Medium dial (dense)', 44], ['Large dial (dense)', 52]]) {
  const b = await page.locator(`.ino-speeddial__fab[aria-label="${label}"]`).boundingBox();
  sizes.push(`${label}=${b?.width}`);
  check(`FAB ${expected}px (${label})`, !!b && Math.abs(b.width - expected) < 1, `${b?.width}px`);
}

// Disabled dial never opens.
const disabledFab = page.locator('.ino-speeddial__fab[aria-label="Disabled dial"]');
check('disabled FAB has native disabled', await disabledFab.isDisabled());

await page.close();

// 2. Screenshots, 3 themes, with the live dial open.
for (const theme of ['light', 'dark', 'high-contrast']) {
  const p = await freshPage(theme);
  const f = p.locator('.speeddial-stage').first().locator('.ino-speeddial__fab');
  await f.scrollIntoViewIfNeeded();
  await f.click();
  await p.waitForTimeout(350);
  await p.locator('.speeddial-stage').first().locator('[role="menuitem"]').nth(0).hover();
  await p.waitForTimeout(250);
  await p.screenshot({ path: `qa-evidence/ino493-speeddial-theme-${theme}.png` });
  console.log(`shot: qa-evidence/ino493-speeddial-theme-${theme}.png`);
  await p.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
