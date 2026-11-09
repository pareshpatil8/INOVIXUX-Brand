// INO-436 QA validation probe for ino-accordion (INO-435), against doc 26 §2 Publish Contract.
// Drives the shipped /docs/components/accordion page in a real browser: checklist assertions
// (variants/structure, states, sizing/density, labels/RTL, a11y) + a keyboard-only walkthrough +
// 3-theme screenshots as evidence. Run against a clean `ng serve --port 4321`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/qa-ino-436';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4321';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 2000 } });
await page.goto(`${BASE}/docs/components/accordion`, { waitUntil: 'networkidle' });
await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 30000 });
await page.locator('app-accordion-demo').waitFor({ state: 'visible', timeout: 30000 });

const ok = [];
const bad = [];
const check = (name, pass, detail) => (pass ? ok : bad).push(`${name}: ${detail}`);

/* ---- 1. Variants/Structure ---- */
const accordionCount = await page.locator('app-accordion-demo ino-accordion').count();
check('variants/accordion-count', accordionCount >= 8, `${accordionCount} <ino-accordion> instances rendered (single/multi, icon start/end, nested x2, states x3, sizing x3, keyboard, rtl)`);

const headingButtons = page.locator('app-accordion-demo ino-accordion-tab h3 > button, app-accordion-demo ino-accordion-tab h4 > button');
check('variants/heading-button-structure', (await headingButtons.count()) > 0, `${await headingButtons.count()} heading>button tab headers found`);

const nestedPane = page.locator('app-accordion-demo .demo-pane', { hasText: 'nested' });
const nestedInner = nestedPane.locator('ino-accordion ino-accordion ino-accordion-tab');
check('variants/nested-demoed', (await nestedInner.count()) >= 2, `${await nestedInner.count()} inner tab(s) inside nested accordion`);

/* ---- 2. States ---- */
const expandedPanel = page.locator('app-accordion-demo ino-accordion-tab button[aria-expanded="true"]').first();
check('states/expanded-exists', (await expandedPanel.count()) >= 1, `${await page.locator('app-accordion-demo button[aria-expanded="true"]').count()} aria-expanded="true" header(s)`);

const disabledTabBtn = page.locator('app-accordion-demo .demo-pane', { hasText: 'disabled tab' }).locator('button[disabled]');
check('states/disabled-tab', (await disabledTabBtn.count()) >= 1, `${await disabledTabBtn.count()} disabled tab header button(s)`);

const disabledAccordionHost = page.locator('app-accordion-demo .demo-pane', { hasText: 'accordion disabled' }).locator('ino-accordion[aria-disabled="true"], ino-accordion[disabled]');
const disabledHostCount = await page.locator('app-accordion-demo .demo-pane', { hasText: 'accordion disabled' }).locator('ino-accordion').count();
check('states/disabled-accordion', disabledHostCount >= 1, `accordion-level disabled pane rendered (${disabledHostCount} host(s))`);

const loadingPane = page.locator('app-accordion-demo .demo-pane', { hasText: 'loading' });
const loadingBusy = loadingPane.locator('[aria-busy="true"]');
check('states/loading-aria-busy', (await loadingBusy.count()) >= 1, `${await loadingBusy.count()} aria-busy="true" node(s) in loading pane`);

/* ---- 3. Sizing / density ---- */
const compactPane = page.locator('app-accordion-demo .demo-pane', { hasText: 'compact' }).first();
const comfortablePane = page.locator('app-accordion-demo .demo-pane', { hasText: 'comfortable (default)' });
const fluidPane = page.locator('app-accordion-demo .demo-pane[data-density="fluid"]');
check('sizing/compact-comfortable-fluid-panes', (await compactPane.count()) >= 1 && (await comfortablePane.count()) >= 1 && (await fluidPane.count()) >= 1, 'compact, comfortable, and fluid-density panes all present');

const compactPadding = await compactPane.locator('ino-accordion-tab button').first().evaluate(el => getComputedStyle(el).paddingInlineStart);
const comfortablePadding = await comfortablePane.locator('ino-accordion-tab button').first().evaluate(el => getComputedStyle(el).paddingInlineStart);
check('sizing/compact-lt-comfortable', parseFloat(compactPadding) < parseFloat(comfortablePadding), `compact=${compactPadding} comfortable=${comfortablePadding}`);

/* ---- 4. Labels / RTL ---- */
const rtlPane = page.locator('app-accordion-demo .demo-pane[dir="rtl"]');
check('labels/rtl-pane-present', (await rtlPane.count()) === 1, `${await rtlPane.count()} dir="rtl" pane(s)`);
const rtlHeaderText = await rtlPane.locator('ino-accordion-tab').first().locator('button').textContent();
check('labels/rtl-text-renders', /المنتجات/.test(rtlHeaderText || ''), `rtl header text: "${rtlHeaderText?.trim()}"`);

/* ---- 5. a11y: static ARIA wiring ---- */
const firstTabBtn = page.locator('app-accordion-demo ino-accordion-tab button').first();
const ariaControls = await firstTabBtn.getAttribute('aria-controls');
const panelId = await page.locator('app-accordion-demo ino-accordion-tab [role="region"]').first().getAttribute('id');
check('a11y/aria-controls-matches-region-id', !!ariaControls && ariaControls === panelId, `aria-controls="${ariaControls}" region id="${panelId}"`);

const regionLabelledby = await page.locator('app-accordion-demo ino-accordion-tab [role="region"]').first().getAttribute('aria-labelledby');
const firstBtnId = await firstTabBtn.getAttribute('id');
check('a11y/region-labelledby-matches-button-id', !!regionLabelledby && regionLabelledby === firstBtnId, `aria-labelledby="${regionLabelledby}" button id="${firstBtnId}"`);

// a11y contract section rendered formatted (not raw markdown)
const a11ySection = page.locator('app-docs-component-detail, .docs-component-detail, body');
const rawMarkdownLeak = await page.locator('pre:has-text("## Accessibility"), pre:has-text("**Role")').count();
check('a11y/no-raw-markdown-in-contract', rawMarkdownLeak === 0, `${rawMarkdownLeak} <pre> block(s) containing raw markdown headers`);

/* ---- 6. Notes: formatted, not raw markdown ---- */
const rawMarkdownAnywhere = await page.locator('pre:has-text("Deliberate omissions"), pre:has-text("##")').count();
check('notes/formatted-not-raw', rawMarkdownAnywhere === 0, `${rawMarkdownAnywhere} <pre> block(s) with raw "##" markdown`);
const notesHeading = await page.getByRole('heading', { name: /deliberate omissions/i }).count();
check('notes/omissions-heading-rendered', notesHeading >= 1, `${notesHeading} rendered "Deliberate omissions" heading(s)`);

/* ---- 7. Mobile: RN + Flutter mentioned ---- */
const mobileText = await page.locator('body').innerText();
check('mobile/rn-mentioned', /React Native/.test(mobileText), 'page text contains "React Native"');
check('mobile/flutter-mentioned', /Flutter/.test(mobileText), 'page text contains "Flutter"');

/* ---- Keyboard-only walkthrough (APG accordion pattern) ---- */
const kbPane = page.locator('app-accordion-demo .demo-pane', { hasText: 'keyboard walkthrough' });
const kbHeaders = kbPane.locator('ino-accordion-tab button');
const kbLog = [];

await kbHeaders.first().focus();
kbLog.push(`1. Focus first header via .focus() — ${await kbHeaders.first().evaluate(el => el === document.activeElement)} focused, aria-expanded=${await kbHeaders.first().getAttribute('aria-expanded')}`);

await page.keyboard.press('ArrowDown');
let activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
kbLog.push(`2. ArrowDown — active element: "${activeText}" (expect "Second Section")`);
check('a11y/kb-arrowdown', /Second Section/.test(activeText || ''), `active="${activeText}"`);

await page.keyboard.press('ArrowDown');
activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
kbLog.push(`3. ArrowDown again — active element: "${activeText}" (expect "Third Section")`);
check('a11y/kb-arrowdown-2', /Third Section/.test(activeText || ''), `active="${activeText}"`);

await page.keyboard.press('ArrowUp');
activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
kbLog.push(`4. ArrowUp — active element: "${activeText}" (expect "Second Section")`);
check('a11y/kb-arrowup', /Second Section/.test(activeText || ''), `active="${activeText}"`);

await page.keyboard.press('End');
activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
kbLog.push(`5. End — active element: "${activeText}" (expect "Fourth Section")`);
check('a11y/kb-end', /Fourth Section/.test(activeText || ''), `active="${activeText}"`);

await page.keyboard.press('Home');
activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
kbLog.push(`6. Home — active element: "${activeText}" (expect "First Section (Tab here to start)")`);
check('a11y/kb-home', /First Section/.test(activeText || ''), `active="${activeText}"`);

// roving tabindex: only focused header is tabbable
const tabindexes = await kbHeaders.evaluateAll(els => els.map(el => el.getAttribute('tabindex')));
kbLog.push(`7. Roving tabindex after Home: ${JSON.stringify(tabindexes)} (expect exactly one "0")`);
check('a11y/roving-tabindex', tabindexes.filter(t => t === '0').length === 1, `tabindexes=${JSON.stringify(tabindexes)}`);

// Enter toggles the focused (first) tab, which starts expanded -> should collapse
const beforeExpanded = await kbHeaders.first().getAttribute('aria-expanded');
await page.keyboard.press('Enter');
const afterExpanded = await kbHeaders.first().getAttribute('aria-expanded');
kbLog.push(`8. Enter on focused (first) header — aria-expanded ${beforeExpanded} -> ${afterExpanded} (expect true -> false)`);
check('a11y/kb-enter-toggle', beforeExpanded === 'true' && afterExpanded === 'false', `${beforeExpanded} -> ${afterExpanded}`);

await page.keyboard.press('Space');
const afterSpace = await kbHeaders.first().getAttribute('aria-expanded');
kbLog.push(`9. Space on same header — aria-expanded ${afterExpanded} -> ${afterSpace} (expect false -> true)`);
check('a11y/kb-space-toggle', afterExpanded === 'false' && afterSpace === 'true', `${afterExpanded} -> ${afterSpace}`);

// focus-visible outline present
const outlineStyle = await kbHeaders.first().evaluate(el => getComputedStyle(el).outlineStyle);
kbLog.push(`10. Computed outline-style on focused header: "${outlineStyle}" (expect not "none")`);
check('a11y/focus-visible-outline', outlineStyle !== 'none', `outline-style=${outlineStyle}`);

/* ---- Screenshots: 3 themes, representative "states" pane (shows expanded/disabled/loading) ---- */
const themeService = ['dark', 'light', 'high-contrast'];
for (const theme of themeService) {
  await page.locator('.docs-theme-switcher button', { hasText: theme }).click();
  await page.waitForTimeout(300);
  const statesPane = page.locator('app-accordion-demo .demo-grid').nth(3); // States section grid
  await statesPane.screenshot({ path: `${OUT}/accordion-states-${theme}.png` });
  await page.locator('app-accordion-demo').screenshot({ path: `${OUT}/accordion-full-${theme}.png` });
}

console.log('=== PASS ===');
ok.forEach(l => console.log('  ✓', l));
console.log('=== FAIL ===');
bad.forEach(l => console.log('  ✗', l));
console.log('\n=== KEYBOARD WALKTHROUGH LOG ===');
kbLog.forEach(l => console.log(' ', l));
console.log(`\nTotals: ${ok.length} pass, ${bad.length} fail`);
console.log(`Screenshots written to ${OUT}`);

await browser.close();
process.exit(bad.length > 0 ? 1 : 0);
