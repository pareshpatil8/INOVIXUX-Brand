// INO-470 re-verification after INO-909 fix (commit 3eb82e6)
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4555';
const URL = `${BASE}/docs/components/knob`;
const EVID = '/Users/apple/INOVIXUX/.worktrees/INO-31-brand-architecture-identity-creation/artifacts/qa-evidence/knob';

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URL, { waitUntil: 'networkidle' });

// 1. Structure (anatomy) section present
const anatomyHeading = await page.locator('h3:has-text("Structure (anatomy)")').count();
check('Structure (anatomy) heading renders', anatomyHeading > 0);

const anatomyRows = await page.locator('table.demo-table tbody tr').count();
check('Anatomy table has 5 part rows', anatomyRows === 5, `found ${anatomyRows}`);

const partNames = await page.locator('table.demo-table tbody tr td:first-child').allTextContents();
check(
  'Anatomy table lists Range arc, Value arc, Handle, Indicator, Value label',
  JSON.stringify(partNames) === JSON.stringify(['Range arc', 'Value arc', 'Handle', 'Indicator', 'Value label']),
  partNames.join(', ')
);

const anatomyKnob = page.locator('.demo-section:has-text("Structure (anatomy)") ino-knob');
check('Anatomy reference dial renders', (await anatomyKnob.count()) > 0);

// 2. Long-label wrap demo present
const longLabelText = await page.locator('text=Maximum monthly spend across all linked payment instruments').count();
check('Long-label demo text renders', longLabelText > 0);

const longLabelKnobBox = page.locator('ino-knob[size="sm"]').last();
const labelEl = page.locator('ino-label:has-text("Maximum monthly spend")').first();
const labelBox = await labelEl.boundingBox().catch(() => null);
check('Long-label demo label element is present with a bounding box', !!labelBox, JSON.stringify(labelBox));
if (labelBox) {
  check('Long-label wraps (rendered height > single line ~20px)', labelBox.height > 30, `height=${labelBox.height}`);
}

// 3. Keyboard walkthrough on the anatomy reference dial (handle is role=slider)
const handle = anatomyKnob.locator('[role="slider"]');
await handle.focus();
const before = await handle.getAttribute('aria-valuenow');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
const afterRight = await handle.getAttribute('aria-valuenow');
check('ArrowRight increments aria-valuenow', Number(afterRight) > Number(before), `${before} -> ${afterRight}`);
await page.keyboard.press('PageUp');
await page.waitForTimeout(150);
const afterPageUp = await handle.getAttribute('aria-valuenow');
check('PageUp increments by 10x step', Number(afterPageUp) === Number(afterRight) + 10, `${afterRight} -> ${afterPageUp}`);
await page.keyboard.press('Home');
await page.waitForTimeout(150);
const afterHome = await handle.getAttribute('aria-valuenow');
check('Home sets to min (aria-valuenow)', Number(afterHome) === 0, `afterHome=${afterHome}`);
await page.keyboard.press('End');
await page.waitForTimeout(150);
const afterEnd = await handle.getAttribute('aria-valuenow');
check('End sets to max (aria-valuenow)', Number(afterEnd) === 100, `afterEnd=${afterEnd}`);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(150);
const afterLeft = await handle.getAttribute('aria-valuenow');
check('ArrowLeft decrements from max', Number(afterLeft) < 100, `afterLeft=${afterLeft}`);
await page.keyboard.press('PageDown');
await page.waitForTimeout(150);
const afterPageDown = await handle.getAttribute('aria-valuenow');
check('PageDown decrements by 10x step', Number(afterPageDown) === Number(afterLeft) - 10, `${afterLeft} -> ${afterPageDown}`);

// Tab order: handle is one tab stop
const tabIndex = await handle.getAttribute('tabindex');
check('Handle has tabindex 0 (single tab stop)', tabIndex === '0' || tabIndex === null, `tabindex=${tabIndex}`);

await page.screenshot({ path: `${EVID}/ino470-reverify-anatomy-sm-long-label.png`, fullPage: true });

// 4. 3-theme screenshots
async function setTheme(theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.waitForTimeout(200);
}

for (const theme of ['light', 'dark', 'high-contrast']) {
  await setTheme(theme);
  await page.screenshot({ path: `${EVID}/ino470-reverify-${theme}.png`, fullPage: true });
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILURES:', failed.map((f) => f.name).join('; '));
  process.exit(1);
}
