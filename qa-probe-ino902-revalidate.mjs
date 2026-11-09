#!/usr/bin/env node
// INO-902 independent re-validation after INO-926 fix (commit be266a5).
// QALead-authored. Probes the live docs page, not source review, per §2.1 rule 3.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4931';
const EVIDENCE_DIR = process.env.QA_EVIDENCE_DIR || '/tmp';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ headless: true });

async function freshPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await page.goto(`${BASE}/docs/components/galleria`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  return page;
}

async function setTheme(page, theme) {
  const btn = page.locator('.docs-theme-switcher button', { hasText: theme });
  await btn.click();
  await page.waitForTimeout(150);
}

const page = await freshPage();
const bodyText = await page.locator('body').innerText();
check('page renders (not "Component not found")', !/component not found/i.test(bodyText));

// ---- Re-verify item 5-6 fullscreen fix (HIGH findings 1-4 from INO-926) ----
const basicGalleria = page.locator('.demo-section', { hasText: 'Basic Gallery' }).locator('ino-galleria');
const fsBtn = basicGalleria.locator('.ino-galleria__fullscreen-btn');
const fsDialog = page.locator('.ino-galleria__fullscreen-content[role="dialog"]');

await fsBtn.focus();
await fsBtn.click();
await page.waitForTimeout(250);
check('fullscreen: dialog opens with role=dialog', (await fsDialog.count()) === 1);
const activeRightAfterOpen = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
check('fullscreen: focus moves INTO the dialog on open (APG modal requirement)', activeRightAfterOpen.includes('ino-galleria__fullscreen') && !activeRightAfterOpen.includes('fullscreen-btn'), `activeElement=${activeRightAfterOpen}`);

// Escape from the default post-click focus position (now inside dialog) must close it
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
const dialogClosedAfterEsc = (await fsDialog.count()) === 0;
check('fullscreen: Escape closes the dialog in the normal click-to-open flow', dialogClosedAfterEsc, dialogClosedAfterEsc ? 'closed' : 'STILL OPEN — regression of INO-926 finding 1/2');

const activeAfterEsc = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName || null);
check('fullscreen: focus RESTORED to trigger button after Escape (SPEC.md §7)', !!activeAfterEsc && activeAfterEsc.includes('ino-galleria__fullscreen-btn'), `document.activeElement=${activeAfterEsc}`);

// Focus trap: reopen, tab 8x, confirm focus never leaves the dialog subtree
await fsBtn.click();
await page.waitForTimeout(250);
check('fullscreen: reopened for trap check', (await fsDialog.count()) === 1);
let trapHeld = true;
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => !!document.activeElement?.closest('.ino-galleria__fullscreen-content'));
  if (!inside) { trapHeld = false; break; }
}
check('fullscreen: focus TRAPPED inside dialog across 8 Tabs (no escape to background)', trapHeld);

// Close via close button, confirm focus restoration on that path too
await page.locator('.ino-galleria__fullscreen-close').click();
await page.waitForTimeout(250);
check('fullscreen: close button closes dialog', (await fsDialog.count()) === 0);
const activeAfterCloseBtn = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName || null);
check('fullscreen: focus restored to trigger after close-BUTTON path', !!activeAfterCloseBtn && activeAfterCloseBtn.includes('ino-galleria__fullscreen-btn'), `document.activeElement=${activeAfterCloseBtn}`);

// ---- Re-verify disabled state fix (finding 5) ----
const disabledGalleria = page.locator('.demo-section', { hasText: 'Gallery - Disabled State' }).locator('ino-galleria');
check('disabled: host carries data-disabled', (await disabledGalleria.getAttribute('data-disabled')) === 'true');
check('disabled: host carries aria-disabled=true', (await disabledGalleria.getAttribute('aria-disabled')) === 'true');
const disabledNextBtn = disabledGalleria.locator('.ino-galleria__control-btn--next');
check('disabled: next/prev control actually disabled', await disabledNextBtn.isDisabled());
await disabledGalleria.locator('.ino-galleria__thumbnail').nth(2).click({ force: true });
await page.waitForTimeout(150);
const disabledActiveAfterClick = await disabledGalleria.locator('.ino-galleria__thumbnail--active').getAttribute('aria-label');
check('disabled: clicking a thumbnail does NOT navigate', disabledActiveAfterClick === 'Image 1', `activeAfterClick=${disabledActiveAfterClick}`);
// keyboard path too — onKeydown gating claim
await disabledGalleria.locator('.ino-galleria__stage').focus({ timeout: 2000 }).catch(() => {});
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
const disabledActiveAfterKey = await disabledGalleria.locator('.ino-galleria__thumbnail--active').getAttribute('aria-label');
check('disabled: ArrowRight keyboard nav does NOT advance', disabledActiveAfterKey === 'Image 1', `activeAfterKey=${disabledActiveAfterKey}`);

// ---- Re-verify density fix (finding 6) against the REAL new demo pane, not a simulation ----
const densitySection = page.locator('.demo-section', { hasText: 'Gallery - Density Comparison' });
check('density: comparison section present in live demo', (await densitySection.count()) === 1);
const densePane = densitySection.locator('[data-density="dense"] ino-galleria');
const fluidPane = densitySection.locator('[data-density="fluid"] ino-galleria');
check('density: dense pane mounts ino-galleria', (await densePane.count()) === 1);
check('density: fluid pane mounts ino-galleria', (await fluidPane.count()) === 1);
const denseBtnWidth = await densePane.locator('.ino-galleria__control-btn').first().evaluate((el) => getComputedStyle(el).width).catch(() => null);
const fluidBtnWidth = await fluidPane.locator('.ino-galleria__control-btn').first().evaluate((el) => getComputedStyle(el).width).catch(() => null);
check('density: dense vs fluid control-btn widths differ on the REAL demo pane', !!denseBtnWidth && !!fluidBtnWidth && denseBtnWidth !== fluidBtnWidth, `dense=${denseBtnWidth} fluid=${fluidBtnWidth}`);
const denseThumbWidth = await densePane.locator('.ino-galleria__thumbnail').first().evaluate((el) => getComputedStyle(el).width).catch(() => null);
const fluidThumbWidth = await fluidPane.locator('.ino-galleria__thumbnail').first().evaluate((el) => getComputedStyle(el).width).catch(() => null);
check('density: dense vs fluid thumbnail widths differ on the REAL demo pane', !!denseThumbWidth && !!fluidThumbWidth && denseThumbWidth !== fluidThumbWidth, `dense=${denseThumbWidth} fluid=${fluidThumbWidth}`);

await page.close();

// ---- 3-theme contrast + screenshots sanity (unchanged by INO-926, spot-check only) ----
for (const theme of ['light', 'dark', 'high-contrast']) {
  const p = await freshPage();
  await setTheme(p, theme);
  await p.waitForTimeout(200);
  const g = p.locator('.demo-section', { hasText: 'Basic Gallery' }).locator('ino-galleria');
  await g.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${EVIDENCE_DIR}/ino902-revalidate-${theme}.png`, fullPage: false });
  check(`screenshot captured: ${theme}`, true);
  await p.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log(`\nFAILURES:\n${failed.map((f) => `- ${f.name}${f.detail ? ` (${f.detail})` : ''}`).join('\n')}`);
process.exit(failed.length ? 1 : 0);
