import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4356';
const OUT = `${process.env.PAPERCLIP_SCRATCH_DIR || '.'}/image-evidence`;
mkdirSync(OUT, { recursive: true });

const results = [];
function log(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} — ${detail}`);
}

const browser = await chromium.launch();

async function themeShot(theme, name) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/docs/components/image`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: theme, exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ino908-${name}.png`, fullPage: true });
  await page.close();
}
await themeShot('light', 'live-light');
await themeShot('dark', 'live-dark');
await themeShot('high-contrast', 'live-high-contrast');

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${BASE}/docs/components/image`, { waitUntil: 'networkidle' });

const trigger = page.locator('.ino-image__trigger').first();
await trigger.waitFor({ state: 'visible' });
await trigger.focus();
log('1-tab-focus', await trigger.evaluate((el) => el === document.activeElement), 'trigger button focused');

await page.keyboard.press('Enter');
await page.waitForTimeout(200);
const dialog = page.locator('[role="dialog"]').first();
log('2-enter-opens-dialog', await dialog.isVisible().catch(() => false), 'Enter on trigger opened role=dialog lightbox');
const dialogAriaLabel = await dialog.getAttribute('aria-label').catch(() => null);
log('2b-dialog-aria-label', !!dialogAriaLabel, `aria-label="${dialogAriaLabel}"`);
await page.screenshot({ path: `${OUT}/ino908-kbd-01-open.png` });

// Rotate first (rotate buttons never disable, so this is a clean read)
await page.keyboard.press('r');
await page.waitForTimeout(150);
const rotR = await page.locator('.ino-image__lightbox-img').evaluate((el) => el.style.transform);
log('3-r-rotates-cw', rotR.includes('rotate(90deg)'), `after r="${rotR}"`);

await page.keyboard.press('Shift+R');
await page.waitForTimeout(150);
const rotShiftR = await page.locator('.ino-image__lightbox-img').evaluate((el) => el.style.transform);
log('4-shift-r-rotates-ccw', rotShiftR.includes('rotate(0deg)'), `after shift+r="${rotShiftR}"`);

for (let i = 0; i < 4; i++) { await page.keyboard.press('r'); await page.waitForTimeout(80); }
const rotWrap = await page.locator('.ino-image__lightbox-img').evaluate((el) => el.style.transform);
log('5-rotation-wraps-360', rotWrap.includes('rotate(0deg)'), `after 4x r from 0 (360->0)="${rotWrap}"`);

await page.keyboard.press('0');
await page.waitForTimeout(150);
const afterReset = await page.locator('.ino-image__lightbox-img').evaluate((el) => el.style.transform);
log('6-zero-resets', afterReset.includes('scale(1)') && afterReset.includes('rotate(0deg)'), `after 0="${afterReset}"`);

// Escape from a clean (non-disabled-focus) state — must close and return focus
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
log('7-escape-closes-clean-state', !(await dialog.isVisible().catch(() => false)), 'dialog closed via Escape from a clean focus state');
log('7b-focus-returns-to-trigger', await trigger.evaluate((el) => el === document.activeElement).catch(() => false), 'focus returned to trigger button');

// Reopen; zoom in with + repeatedly (zoom-in button holds initial focus since zoom-out starts disabled)
await trigger.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
const focusAfterOpen = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
log('8-initial-focus-on-zoom-in', focusAfterOpen === 'Zoom in', `initial focus element aria-label="${focusAfterOpen}"`);

for (let i = 0; i < 6; i++) { await page.keyboard.press('+'); await page.waitForTimeout(80); }
const zoomMax = await page.locator('.ino-image__lightbox-img').evaluate((el) => el.style.transform);
log('9-zoom-clamps-4x', zoomMax.includes('scale(4)'), `after 6x plus (1x->4x in 0.5 steps)="${zoomMax}"`);

// BUG REPRO: the focused Zoom-in button is now [disabled] (canZoomIn()=false at the 4x ceiling).
// A disabled form control cannot hold focus — the browser auto-blurs it to <body>, which is
// OUTSIDE the lightbox's keydown listener's bubble path, so every documented key dies.
const activeIsBody = await page.evaluate(() => document.activeElement === document.body);
log('10-BUG-focus-auto-blurred-to-body', activeIsBody, 'zoom-in button disabled at ceiling while focused -> focus fell to <body>, outside the dialog');

await page.screenshot({ path: `${OUT}/ino908-kbd-02-focus-lost-at-ceiling.png` });

await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const stillOpenAfterEscape = await dialog.isVisible().catch(() => false);
log('11-BUG-escape-silently-fails', stillOpenAfterEscape, 'Escape pressed while focus is on <body> — dialog did NOT close (documented "Escape closes" contract violated)');

const zeroDidNothing = await page.keyboard.press('0').then(() => page.waitForTimeout(150)).then(() =>
  page.locator('.ino-image__lightbox-img').evaluate((el) => el.style.transform));
log('12-BUG-zero-silently-fails', zeroDidNothing.includes('scale(4)'), `'0' pressed while focus is on <body> — reset did not apply, transform still="${zeroDidNothing}"`);

// Recovery path: Tab brings focus back inside the panel; only then do keys work again
await page.keyboard.press('Tab');
await page.waitForTimeout(150);
const recoveredInside = await page.evaluate(() => {
  const panel = document.querySelector('.ino-image__lightbox-panel');
  return panel ? panel.contains(document.activeElement) : false;
});
log('13-tab-recovers-focus-into-panel', recoveredInside, 'undocumented recovery: pressing Tab moves focus back inside the dialog');

await page.keyboard.press('Escape');
await page.waitForTimeout(200);
log('14-escape-works-after-tab-recovery', !(await dialog.isVisible().catch(() => false)), 'Escape now closes, after the undocumented Tab recovery step');

// Fallback / error state (empty src or broken src -> role=img + aria-label)
const fallbacks = page.locator('.ino-image__fallback');
const fallbackCount = await fallbacks.count();
let fallbackOk = fallbackCount > 0;
let fallbackDetail = `count=${fallbackCount}`;
if (fallbackCount > 0) {
  const role = await fallbacks.first().getAttribute('role');
  const label = await fallbacks.first().getAttribute('aria-label');
  fallbackOk = fallbackOk && role === 'img' && !!label;
  fallbackDetail = `role="${role}" aria-label="${label}"`;
}
log('15-fallback-role-img-labeled', fallbackOk, fallbackDetail);

// Focus-trap Tab containment, tested in a clean (non-bug) state
await trigger.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
let trapHeld = true;
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(40);
  const inside = await page.evaluate(() => {
    const panel = document.querySelector('.ino-image__lightbox-panel');
    return panel ? panel.contains(document.activeElement) : false;
  });
  if (!inside) { trapHeld = false; break; }
}
log('16-focus-trap-contains-tab-in-clean-state', trapHeld, 'focus stayed inside lightbox panel across 8 Tab presses (no zoom/rotate performed)');

// Scroll lock
const overflowOpen = await page.evaluate(() => document.body.style.overflow);
log('17-scroll-locked-while-open', overflowOpen === 'hidden', `body overflow="${overflowOpen}"`);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const overflowClosed = await page.evaluate(() => document.body.style.overflow);
log('18-scroll-restored-after-close', overflowClosed === '', `body overflow after close="${overflowClosed}"`);

await page.close();
await browser.close();

const failed = results.filter((r) => !r.ok && !r.label.includes('BUG'));
const bugsConfirmed = results.filter((r) => r.label.includes('BUG') && r.ok);
console.log(`\n${results.length} checks run. Unexpected failures: ${failed.length}. Confirmed bug repros: ${bugsConfirmed.length}.`);
if (failed.length) {
  console.log('UNEXPECTED FAILURES:', JSON.stringify(failed, null, 2));
}
