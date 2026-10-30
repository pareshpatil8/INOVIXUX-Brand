import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/qa-ino-438';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4300';
const THEMES = ['light', 'dark', 'high-contrast'];

const browser = await chromium.launch();

for (const theme of THEMES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2200 } });
  await page.addInitScript((value) => {
    try { window.localStorage.setItem('ino-theme', value); } catch {}
    document.documentElement.setAttribute('data-theme', value);
  }, theme);
  await page.goto(`${BASE}/docs/components/panel`, { waitUntil: 'networkidle' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('h2:text-is("Accessibility") + .docs-markdown, h2:text-is("Accessibility contract") + .docs-markdown').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/panel-${theme}.png`, fullPage: true });

  if (theme === 'light') {
    const panelCount = await page.locator('section.ino-panel').count();
    console.log('PANEL_COUNT:', panelCount);

    const notesHtml = await page.locator('h2:text-is("Notes") + .docs-markdown, h2:text-is("Deliberate omissions") + .docs-markdown').first().innerHTML().catch(() => '(not found)');
    console.log('NOTES_SECTION_HTML_SNIPPET:', notesHtml.slice(0, 300));

    const mobileHtml = await page.locator('h2:text-is("Mobile") + .docs-markdown, h2:text-is("Mobile parity") + .docs-markdown').first().innerHTML().catch(() => '(not found)');
    console.log('MOBILE_SECTION_HTML_SNIPPET:', mobileHtml.slice(0, 300));
  }
  await page.close();
}

// Keyboard-only walkthrough on the live (light-theme, default) page.
const page = await browser.newPage({ viewport: { width: 1280, height: 2200 } });
await page.addInitScript((value) => {
  try { window.localStorage.setItem('ino-theme', value); } catch {}
  document.documentElement.setAttribute('data-theme', value);
}, 'light');
await page.goto(`${BASE}/docs/components/panel`, { waitUntil: 'domcontentloaded' });
await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });

const afterCd = async () => page.waitForTimeout(50);

const activeDesc = async () => page.evaluate(() => {
  const el = document.activeElement;
  if (!el) return '(none)';
  const attrs = ['role', 'aria-expanded', 'aria-controls', 'aria-disabled', 'disabled', 'tabindex']
    .map((a) => (el.getAttribute(a) !== null ? `${a}="${el.getAttribute(a)}"` : ''))
    .filter(Boolean).join(' ');
  const text = (el.textContent || '').trim().slice(0, 40);
  return `<${el.tagName.toLowerCase()} ${attrs}> "${text}"`;
});

console.log('--- KEYBOARD WALKTHROUGH: collapsible toggle ("Advanced options", Variants/Structure demo) ---');
const toggle = page.locator('.ino-panel__toggle').first();
await toggle.waitFor({ state: 'visible', timeout: 10000 });

// Tab from body until we land on the first collapsible toggle button.
await page.evaluate(() => document.body.focus());
let landedOnToggle = false;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab');
  await afterCd();
  const isToggle = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), '.ino-panel__toggle');
  if (isToggle) { landedOnToggle = true; break; }
}
console.log('1. Tab reaches first disclosure toggle ->', landedOnToggle, await activeDesc());

const focusVisible = await toggle.evaluate((el) => {
  const cs = getComputedStyle(el);
  return { outline: cs.outlineStyle, outlineWidth: cs.outlineWidth };
});
console.log('   computed focus-visible styling on toggle:', JSON.stringify(focusVisible));

const expandedBefore = await toggle.getAttribute('aria-expanded');
console.log('2. aria-expanded before activation:', expandedBefore);

await page.keyboard.press('Enter');
await afterCd();
const expandedAfterEnter = await toggle.getAttribute('aria-expanded');
console.log('3. Enter activates toggle -> aria-expanded:', expandedAfterEnter);

await page.keyboard.press('Space');
await afterCd();
const expandedAfterSpace = await toggle.getAttribute('aria-expanded');
console.log('4. Space re-activates toggle -> aria-expanded:', expandedAfterSpace);

await page.keyboard.press('Tab');
await afterCd();
console.log('5. Tab off toggle, into next focusable ->', await activeDesc());

// readonly + collapsible instance: toggle stays reachable (focusable) but inert on activation.
console.log('--- KEYBOARD WALKTHROUGH: readonly collapsible toggle ("Locked section") ---');
const readonlyToggle = page.locator('section.ino-panel:has-text("Locked section") .ino-panel__toggle');
await readonlyToggle.waitFor({ state: 'visible', timeout: 10000 });
await readonlyToggle.focus();
console.log('6. Focus readonly toggle directly ->', await activeDesc());
const ariaDisabled = await readonlyToggle.getAttribute('aria-disabled');
console.log('   aria-disabled on readonly toggle:', ariaDisabled);
const expandedReadonlyBefore = await readonlyToggle.getAttribute('aria-expanded');
await page.keyboard.press('Enter');
await afterCd();
const expandedReadonlyAfter = await readonlyToggle.getAttribute('aria-expanded');
console.log('7. Enter on readonly toggle -> aria-expanded before/after:', expandedReadonlyBefore, '/', expandedReadonlyAfter, '(expect unchanged)');

// disabled instance: toggle must NOT be a tab stop at all (non-collapsible, so no toggle rendered —
// confirm the plain header renders no tab stop and the panel chrome is dimmed).
console.log('--- KEYBOARD WALKTHROUGH: disabled panel ("Payout details") ---');
const disabledPanel = page.locator('section.ino-panel:has-text("Payout details")');
const disabledAriaAttr = await disabledPanel.getAttribute('aria-disabled');
console.log('8. disabled panel host aria-disabled:', disabledAriaAttr, '(expect "true")');
const disabledHasToggle = await disabledPanel.locator('.ino-panel__toggle').count();
console.log('9. disabled, non-collapsible panel renders a toggle button:', disabledHasToggle > 0, '(expect false — no collapsible on this instance)');

// collapsed instance: content removed from a11y tree via [hidden].
console.log('--- KEYBOARD WALKTHROUGH: collapsed panel ("Archived notes") ---');
const collapsedPanel = page.locator('section.ino-panel:has-text("Archived notes")');
const bodyHidden = await collapsedPanel.locator('.ino-panel__body').getAttribute('hidden');
console.log('10. collapsed panel body [hidden]:', bodyHidden !== null, '(expect true)');
const collapsedToggleExpanded = await collapsedPanel.locator('.ino-panel__toggle').getAttribute('aria-expanded');
console.log('11. collapsed panel toggle aria-expanded:', collapsedToggleExpanded, '(expect "false")');

await browser.close();
console.log('DONE');
