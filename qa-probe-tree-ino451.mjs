import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = '/tmp/qa-ino451-tree';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = {};

// --- 3-theme screenshots + render/console check ---
for (const theme of ['light', 'dark', 'high-contrast']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  await page.goto('http://localhost:4327/docs/components/tree', { waitUntil: 'networkidle' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible' });
  await page.locator(`.docs-theme-switcher button:text-is("${theme}")`).click();
  await page.waitForTimeout(300);
  const pressed = await page.locator(`.docs-theme-switcher button:text-is("${theme}")`).getAttribute('aria-pressed');
  const demo = page.locator('app-tree-demo');
  await demo.waitFor({ state: 'visible' });
  const treeRole = await page.locator('[role="tree"]').count();
  const rowCount = await page.locator('[role="treeitem"]').count();
  await page.screenshot({ path: `${OUT}/tree-${theme}.png`, fullPage: true });
  results[`theme_${theme}`] = { pressed, treeRole, rowCount, consoleErrors: consoleErrors.slice(0, 5) };
  await page.close();
}

// --- Keyboard-only walkthrough (light theme) ---
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
const kbErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') kbErrors.push(msg.text()); });
page.on('pageerror', (err) => kbErrors.push('pageerror: ' + err.message));
await page.goto('http://localhost:4327/docs/components/tree', { waitUntil: 'networkidle' });

const tree = page.locator('[role="tree"]').first();
await tree.waitFor({ state: 'visible' });

async function activeRow() {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    return {
      role: el.getAttribute('role'),
      level: el.getAttribute('aria-level'),
      expanded: el.getAttribute('aria-expanded'),
      checked: el.getAttribute('aria-checked'),
      tabindex: el.getAttribute('tabindex'),
      text: el.textContent?.trim().slice(0, 40),
    };
  });
}

const steps = [];
// Tab into the tree (focus first interactive row via click to establish baseline, then test keyboard-only from there)
await page.keyboard.press('Tab');
let guard = 0;
while (guard < 15) {
  const info = await activeRow();
  if (info && info.role === 'treeitem') break;
  await page.keyboard.press('Tab');
  guard++;
}
steps.push({ action: 'Tab to first treeitem', state: await activeRow() });

await page.keyboard.press('ArrowDown');
steps.push({ action: 'ArrowDown', state: await activeRow() });

await page.keyboard.press('ArrowRight');
steps.push({ action: 'ArrowRight (expand)', state: await activeRow() });

await page.keyboard.press('ArrowDown');
steps.push({ action: 'ArrowDown into child', state: await activeRow() });

await page.keyboard.press('ArrowLeft');
steps.push({ action: 'ArrowLeft (to parent)', state: await activeRow() });

await page.keyboard.press('End');
steps.push({ action: 'End', state: await activeRow() });

await page.keyboard.press('Home');
steps.push({ action: 'Home', state: await activeRow() });

await page.keyboard.press('Enter');
steps.push({ action: 'Enter (activate)', state: await activeRow() });

await page.keyboard.press('Space');
steps.push({ action: 'Space (activate)', state: await activeRow() });

// Filter box tab-order + ArrowDown-into-tree transition
await page.keyboard.press('Shift+Tab');
let filterGuard = 0;
let onFilter = false;
while (filterGuard < 15) {
  onFilter = await page.evaluate(() => document.activeElement?.tagName === 'INPUT');
  if (onFilter) break;
  await page.keyboard.press('Shift+Tab');
  filterGuard++;
}
steps.push({ action: 'Shift+Tab to filter input', onFilter });
if (onFilter) {
  await page.keyboard.press('ArrowDown');
  steps.push({ action: 'ArrowDown from filter into tree', state: await activeRow() });
}

await page.screenshot({ path: `${OUT}/tree-keyboard-final.png`, fullPage: true });
results.keyboard = { steps, consoleErrors: kbErrors.slice(0, 5) };
await page.close();

// --- Isolated repro: ArrowRight (expand) ejects DOM focus to <body> ---
// SPEC.md §1/§2 requires real DOM focus to stay on the roving-tabindex treeitem row at all times.
// `ino-tree.component.ts` `recomputeRows()` returns a brand-new row-object array on every expand,
// and the `*ngFor` has no `trackBy`, so Angular tears down and rebuilds every <li>. `focusActiveRow()`
// (line ~439-447) tries to restore focus via `queueMicrotask(() => querySelector(...).focus())`,
// but that microtask loses the race against Angular's own change-detection flush, so it queries for
// the new <li> before it exists, finds nothing, and the just-destroyed old <li> drops focus to <body>.
const reproPage = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
await reproPage.goto('http://localhost:4327/docs/components/tree', { waitUntil: 'networkidle' });
async function activeInfo(p) {
  return p.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, role: el?.getAttribute?.('role'), text: el?.textContent?.trim().slice(0, 30), inTree: !!el?.closest?.('[role="tree"]') };
  });
}
const firstRow = reproPage.locator('[role="tree"]').first().locator('[role="treeitem"]').first();
await firstRow.focus();
const before = await activeInfo(reproPage);
await reproPage.keyboard.press('ArrowRight');
await reproPage.waitForTimeout(400);
const afterExpand = await activeInfo(reproPage);
await reproPage.keyboard.press('ArrowDown');
await reproPage.waitForTimeout(200);
const afterArrowDownStuck = await activeInfo(reproPage);
results.focus_loss_repro = { before, afterExpand, afterArrowDownStuck };
await reproPage.close();

await browser.close();
console.log(JSON.stringify(results, null, 2));
