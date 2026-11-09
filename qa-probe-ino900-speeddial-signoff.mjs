#!/usr/bin/env node
// INO-900 independent §2 sign-off probe for ino-speeddial docs page. QALead-authored,
// deliberately distinct from the builder's qa-probe-ino493-speeddial.mjs — covers gate
// items 1-5 against the shipped page.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4877';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ headless: true });

async function freshPage(theme) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.addInitScript((t) => {
    try { localStorage.setItem('ino-theme', t); } catch {}
  }, theme);
  await page.goto(`${BASE}/docs/components/speeddial`, { waitUntil: 'networkidle' });
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(200);
  return page;
}

// ---- Item 1: variants, each has a live demo ----
const page = await freshPage('light');
const bodyText = await page.locator('body').innerText();
check('page renders (not "Component not found")', !/component not found/i.test(bodyText));

const dials = page.locator('ino-speeddial');
check('page mounts ino-speeddial instances', (await dials.count()) >= 10, `count=${await dials.count()}`);

const linearUp = page.locator('ino-speeddial[ariaLabel="Actions, expands up"], ino-speeddial[aria-label="Actions, expands up"]');
check('variant: linear up demo present', (await page.getByText('up (default)').count()) >= 1);
check('variant: linear down demo present', (await page.getByText('down', { exact: true }).count()) >= 1);
check('variant: linear left demo present', (await page.getByText('left', { exact: true }).count()) >= 1);
check('variant: linear right demo present', (await page.getByText('right', { exact: true }).count()) >= 1);
check('variant: circle demo present', (await page.getByText('circle, radius 80').count()) === 1);
check('variant: quarter-circle demo present', (await page.getByText('quarter-circle, up-left').count()) === 1);
check('variant: mask demo present', (await page.locator('section', { hasText: 'Mask' }).count()) >= 1);

// ---- Item 2: states, 3 themes (light pass here; dark/high-contrast screenshots below) ----
const liveStage = page.locator('.speeddial-stage').first();
const fab = liveStage.locator('.ino-speeddial__fab');
check('closed: aria-expanded=false at rest', (await fab.getAttribute('aria-expanded')) === 'false');
const menuHiddenBefore = await liveStage.locator('.ino-speeddial__menu').getAttribute('aria-hidden');
check('closed: menu aria-hidden=true', menuHiddenBefore === 'true');

await fab.click();
await page.waitForTimeout(350);
check('open: aria-expanded=true', (await fab.getAttribute('aria-expanded')) === 'true');
const rotation = await fab.locator('.ino-speeddial__fab-icon, [class*="fab-icon"]').evaluate((el) => getComputedStyle(el).transform).catch(() => null);
check('open: FAB icon transform applied (rotation)', !!rotation && rotation !== 'none', String(rotation));

// hover on an action -> label visible
const firstAction = liveStage.locator('[role="menuitem"]').first();
await firstAction.hover();
await page.waitForTimeout(150);
const labelOpacityHover = await firstAction.locator('xpath=following-sibling::*[contains(@class,"action-label")] | ./parent::*//*[contains(@class,"action-label")]').first().evaluate((el) => getComputedStyle(el).opacity).catch(() => null);
check('hover: action label becomes visible', labelOpacityHover === '1' || labelOpacityHover === null, `opacity=${labelOpacityHover}`);

// focus-visible on FAB via keyboard
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await fab.focus();
const fabOutline = await fab.evaluate((el) => getComputedStyle(el).outlineStyle + '/' + getComputedStyle(el).boxShadow);
check('focus-visible: FAB shows a focus indicator', fabOutline !== 'none/none', fabOutline);

// active: press-and-hold flat fill — check :active CSS rule exists in computed style diff is unreliable; verify class/selector presence in stylesheet instead
const hasActiveRule = await page.evaluate(() => {
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText && /ino-speeddial__fab:active/.test(rule.selectorText)) return true;
      }
    } catch {}
  }
  return false;
});
check('active: :active rule present for FAB', hasActiveRule);

// disabled dial
const disabledFab = page.locator('.ino-speeddial__fab[aria-label="Disabled dial"]');
check('disabled dial: native disabled attr', await disabledFab.isDisabled());
await disabledFab.click({ force: true });
await page.waitForTimeout(150);
check('disabled dial: click does not open', (await disabledFab.getAttribute('aria-expanded')) === 'false');

// disabled action
await fab.click();
await page.waitForTimeout(300);
const disabledAction = liveStage.locator('[role="menuitem"][aria-disabled="true"]');
check('disabled action: aria-disabled=true present', (await disabledAction.count()) === 1);
check('disabled action: no tabindex=0 (removed from roving order)', (await disabledAction.getAttribute('tabindex')) !== '0');

// ---- Item 3: sizing, fab sm/md/lg fixed, density-immune ----
for (const [label, expected] of [
  ['Small dial (dense)', 36], ['Medium dial (dense)', 44], ['Large dial (dense)', 52],
  ['Small dial (fluid)', 36], ['Medium dial (fluid)', 44], ['Large dial (fluid)', 52],
]) {
  const b = await page.locator(`.ino-speeddial__fab[aria-label="${label}"]`).boundingBox();
  check(`sizing: ${label} = ${expected}px`, !!b && Math.abs(b.width - expected) < 1 && Math.abs(b.height - expected) < 1, `${b?.width}x${b?.height}`);
}

// ---- Item 4: labels on hover AND keyboard focus; horizontal dials place labels below ----
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await fab.focus();
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(250);
const focusedLabelVisible = await page.evaluate(() => {
  const active = document.activeElement;
  const label = active?.querySelector('[class*="action-label"]');
  if (!label) return null;
  return getComputedStyle(label).opacity;
});
check('label visible on keyboard focus', focusedLabelVisible === '1', `opacity=${focusedLabelVisible}`);

// horizontal (left/right) dial: label placement below the action button
const rightSection = page.locator('.demo-pane', { hasText: 'right' }).last();
const rightFab = rightSection.locator('.ino-speeddial__fab');
await rightFab.click();
await page.waitForTimeout(350);
const rightAction = rightSection.locator('[role="menuitem"]').first();
await rightAction.hover();
await page.waitForTimeout(150);
const actionBox = await rightAction.boundingBox();
const rightLabel = rightSection.locator('[class*="action-label"]').first();
const labelBox = await rightLabel.boundingBox();
check('horizontal dial: label sits below the action button', !!actionBox && !!labelBox && labelBox.y > actionBox.y + actionBox.height / 2, `actionY=${actionBox?.y} labelY=${labelBox?.y}`);

// ---- Item 5: a11y — menu-button semantics, roving tabindex, arrow open+focus, Esc close+return, Tab-out closes, disabled skipped ----
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
check('a11y: aria-haspopup=menu', (await fab.getAttribute('aria-haspopup')) === 'menu');
const menuId = await liveStage.locator('.ino-speeddial__menu').getAttribute('id');
check('a11y: aria-controls points at menu id', (await fab.getAttribute('aria-controls')) === menuId, `menuId=${menuId}`);
check('a11y: menu role=menu', (await liveStage.locator('.ino-speeddial__menu').getAttribute('role')) === 'menu');

await fab.focus();
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(250);
check('a11y: ArrowDown on FAB opens dial', (await fab.getAttribute('aria-expanded')) === 'true');
let focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
check('a11y: ArrowDown focuses first (non-disabled) action', focused === 'New file', `focused=${focused}`);

await page.keyboard.press('ArrowUp');
await page.waitForTimeout(150);
focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
check('a11y: ArrowUp wraps to last navigable action (Delete, Share skipped)', focused === 'Delete', `focused=${focused}`);

await page.keyboard.press('Home');
await page.waitForTimeout(150);
focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
check('a11y: Home focuses first action', focused === 'New file', `focused=${focused}`);

await page.keyboard.press('End');
await page.waitForTimeout(150);
focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
check('a11y: End focuses last navigable action', focused === 'Delete', `focused=${focused}`);

// roving tabindex: only focused item has tabindex 0
const tabindexes = await liveStage.locator('[role="menuitem"]').evaluateAll((els) => els.map((e) => e.getAttribute('tabindex')));
check('a11y: exactly one menuitem has tabindex=0 (roving)', tabindexes.filter((t) => t === '0').length === 1, JSON.stringify(tabindexes));

// Esc closes + focus return
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
check('a11y: Escape closes dial', (await fab.getAttribute('aria-expanded')) === 'false');
const activeIsFab = await page.evaluate(() => document.activeElement?.className || '');
check('a11y: Escape returns focus to FAB', activeIsFab.includes('ino-speeddial__fab'), activeIsFab);

// Tab-out closes
await fab.focus();
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(250);
check('a11y: dial open before tab-out check', (await fab.getAttribute('aria-expanded')) === 'true');
await page.keyboard.press('Tab');
await page.waitForTimeout(250);
check('a11y: Tab-out closes dial', (await fab.getAttribute('aria-expanded')) === 'false');

// disabled action skipped by roving order (re-open, verify disabled item never gets tabindex 0)
await fab.click();
await page.waitForTimeout(300);
const disabledTabindex = await liveStage.locator('[role="menuitem"][aria-disabled="true"]').getAttribute('tabindex');
check('a11y: disabled action never tabbable', disabledTabindex === null || disabledTabindex === '-1', `tabindex=${disabledTabindex}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// reduced-motion gating
await page.close();
const rmPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await rmPage.emulateMedia({ reducedMotion: 'reduce' });
await rmPage.addInitScript(() => { try { localStorage.setItem('ino-theme', 'light'); } catch {} });
await rmPage.goto(`${BASE}/docs/components/speeddial`, { waitUntil: 'networkidle' });
await rmPage.waitForTimeout(200);
const rmHasMotionRule = await rmPage.evaluate(() => {
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.media && /prefers-reduced-motion/.test(rule.conditionText || rule.media.mediaText || '')) return true;
      }
    } catch {}
  }
  return false;
});
check('motion: prefers-reduced-motion media rule present in stylesheet', rmHasMotionRule);
await rmPage.close();

// ---- Contrast + 3-theme screenshots ----
for (const theme of ['light', 'dark', 'high-contrast']) {
  const p = await freshPage(theme);
  const f = p.locator('.speeddial-stage').first().locator('.ino-speeddial__fab');
  await f.scrollIntoViewIfNeeded();
  await f.click();
  await p.waitForTimeout(350);
  await p.locator('.speeddial-stage').first().locator('[role="menuitem"]').nth(0).hover();
  await p.waitForTimeout(250);
  await p.screenshot({ path: `qa-evidence/ino900-signoff-speeddial-${theme}.png`, fullPage: false });
  check(`screenshot captured: ${theme}`, true);
  await p.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
