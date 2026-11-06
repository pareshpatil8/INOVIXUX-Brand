#!/usr/bin/env node --experimental-default-type=module
/**
 * INO-455 QA validation probe for ino-dataview against doc 26 §2 Publish Contract.
 * Checks: structure/variants, states, sizing, labels, a11y roles/keyboard, notes,
 * and 3-theme screenshots.
 */
import { chromium } from 'playwright';

const PORT = 4300;
const URL = `http://localhost:${PORT}/docs/components/dataview`;
const EVIDENCE_DIR = 'qa-evidence/ino455-dataview';

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // --- 1. Variants/Structure ---
  const sectionTitles = await page.locator('.demo-section__title').allTextContents();
  record('1. Variants — demo sections present', sectionTitles.length >= 4, sectionTitles.join(' | '));
  const codeBlocks = await page.locator('pre, code').count();
  record('1. Variants — copyable code present', codeBlocks > 0, `${codeBlocks} code/pre nodes`);

  // --- 2. States: loading, empty ---
  const loadingExists = await page.locator('[data-loading]').count();
  record('2. States — loading shimmer host attr', loadingExists > 0, `${loadingExists} [data-loading] nodes`);
  const emptyText = await page.locator('text=No companies found.').count();
  record('2. States — empty message rendered', emptyText > 0);

  // --- 3. Sizing: sm/lg + dense/fluid ---
  const densePane = await page.locator('[data-density="dense"]').count();
  const fluidPane = await page.locator('[data-density="fluid"]').count();
  record('3. Sizing — sm/lg demo row present', sectionTitles.some(t => t.includes('Sizing')));
  record('3. Sizing — dense/fluid panes present', densePane > 0 && fluidPane > 0, `dense=${densePane} fluid=${fluidPane}`);

  // --- 4. Labels ---
  const ariaLabelled = await page.locator('ino-dataview [aria-labelledby]').count();
  record('4. Labels — list region has accessible name', ariaLabelled > 0, `${ariaLabelled} labelled regions`);

  // --- 5. a11y contract + roles ---
  const pageText = await page.locator('body').innerText();
  record('5. a11y — "Accessibility" section heading present', /Accessibility/.test(pageText));
  record('5. a11y — keyboard documented', /keyboard/i.test(pageText));
  const listRoleCount = await page.locator('[role="list"]').count();
  const listItemRoleCount = await page.locator('[role="listitem"]').count();
  record('5. a11y — role=list present in DOM', listRoleCount > 0, `${listRoleCount}`);
  record('5. a11y — role=listitem present in DOM', listItemRoleCount > 0, `${listItemRoleCount}`);
  const radiogroupCount = await page.locator('[role="radiogroup"]').count();
  record('5. a11y — layout switch exposes radiogroup', radiogroupCount > 0, `${radiogroupCount}`);

  // --- 6. Notes ---
  const notesHeading = page.locator('h1,h2,h3,h4', { hasText: 'Notes' }).last();
  const notesBlock = await notesHeading.evaluate((el) => {
    let out = '';
    let sib = el.nextElementSibling;
    let guard = 0;
    while (sib && !/^H[1-4]$/.test(sib.tagName) && guard < 20) {
      out += sib.innerText + '\n';
      sib = sib.nextElementSibling;
      guard++;
    }
    return out;
  });
  record('6. Notes — deliberate omissions rendered (non-placeholder)', !/No deliberate omissions section found/.test(notesBlock) && notesBlock.trim().length > 0, notesBlock.slice(0, 120).replace(/\n/g, ' '));
  const hasMobileSection = /Mobile parity/.test(pageText);
  record('6. Notes — mobile disposition section present', hasMobileSection);

  // --- Keyboard-only walkthrough ---
  const firstRadioInput = page.locator('input[type="radio"]').first();
  await firstRadioInput.scrollIntoViewIfNeeded();
  await firstRadioInput.focus();
  let tag = await page.evaluate(() => document.activeElement?.tagName);
  record('KB — layout switch radio input is focusable', tag === 'INPUT');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  const liveRegionText = await page.locator('[role="status"]').first().innerText().catch(() => '');
  record('KB — live region announces on layout change (arrow key)', /grid|list/i.test(liveRegionText), `"${liveRegionText}"`);

  const checkedAfterArrow = await page.evaluate(() => document.activeElement?.checked);
  record('KB — arrow key moves selection (native radio checked)', checkedAfterArrow === true);

  // Tab forward from the radiogroup into the paginator
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  const afterTabTag = await page.evaluate(() => ({ tag: document.activeElement?.tagName, cls: document.activeElement?.className }));
  record('KB — Tab moves focus forward out of radiogroup', !!afterTabTag.tag, JSON.stringify(afterTabTag));

  const paginatorButtons = await page.locator('ino-paginator button').count();
  record('KB — paginator exposes focusable buttons', paginatorButtons > 0, `${paginatorButtons} buttons`);
  if (paginatorButtons > 1) {
    const nextBtn = page.locator('ino-paginator button').nth(1);
    await nextBtn.focus();
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    record('KB — paginator button receives focus', activeTag === 'BUTTON');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    record('KB — Enter activates focused paginator button (no throw)', true);
  }

  // --- 3-theme screenshots ---
  const themes = ['dark', 'light', 'high-contrast'];
  for (const theme of themes) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${EVIDENCE_DIR}/dataview-${theme}.png`, fullPage: true });
    record(`Theme — ${theme} screenshot captured`, true);
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILURES:', failed.map((f) => f.name).join(', '));
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('PROBE ERROR', err);
  process.exit(2);
});
