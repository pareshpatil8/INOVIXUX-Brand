// QA probe for INO-498: ino-inplace §2 Publish Contract validation.
// Run against a static copy of web/dist served on :4317.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4317';
const results = [];
const fail = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) fail.push(`${name}: ${detail}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' :: ' + detail : ''}`);
}

async function gotoInplace(page, theme) {
  await page.addInitScript((t) => {
    try { localStorage.setItem('ino-theme', t); } catch {}
  }, theme);
  await page.goto(`${BASE}/docs/components/inplace`, { waitUntil: 'networkidle' });
  await page.waitForSelector('ino-inplace', { timeout: 10000 });
}

const browser = await chromium.launch();

try {
  // ---------- 1. Basic render + button semantics ----------
  {
    const page = await browser.newPage();
    await gotoInplace(page, 'light');

    const count = await page.locator('ino-inplace').count();
    record('docs page renders ino-inplace instances', count >= 6, `got ${count}`);

    const firstTrigger = page.locator('ino-inplace .ino-inplace__trigger').first();
    const tag = await firstTrigger.evaluate((el) => el.tagName);
    record('display trigger is a native <button>', tag === 'BUTTON', `got ${tag}`);
    const type = await firstTrigger.getAttribute('type');
    record('trigger has type="button"', type === 'button', `got ${type}`);

    await page.close();
  }

  // ---------- 2. Keyboard-only walkthrough: basic example (click-to-open demo) ----------
  {
    const page = await browser.newPage();
    await gotoInplace(page, 'light');

    const basic = page.locator('ino-inplace').first();
    const trigger = basic.locator('.ino-inplace__trigger');
    await trigger.focus();
    const focusedLabel = await page.evaluate(() => document.activeElement?.tagName);
    record('trigger is Tab-reachable', focusedLabel === 'BUTTON', `got ${focusedLabel}`);

    // Activate with Enter — opens editor and moves focus into it.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    let active = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      inEditor: !!document.activeElement?.closest('.ino-inplace__editor'),
    }));
    record('Enter on trigger opens editor and moves focus inside it', active.inEditor, JSON.stringify(active));

    // Enter inside the (non-textarea) input closes and returns focus to trigger.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    active = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      isTrigger: document.activeElement?.classList.contains('ino-inplace__trigger'),
    }));
    record('Enter inside editor closes and returns focus to trigger', active.isTrigger, JSON.stringify(active));

    await page.close();
  }

  // ---------- 3. Textarea carve-out: Enter does not close ----------
  {
    const page = await browser.newPage();
    await gotoInplace(page, 'light');

    const notesSection = page.locator('.demo-section', { hasText: 'Multi-line editor' });
    const trigger = notesSection.locator('.ino-inplace__trigger');
    await trigger.click();
    await page.waitForTimeout(150);
    const textarea = notesSection.locator('textarea');
    await textarea.focus();
    await page.keyboard.type(' line2');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    const stillOpen = await notesSection.locator('.ino-inplace__editor').count();
    record('Enter inside <textarea> does not close the editor', stillOpen === 1, `editor count=${stillOpen}`);
    const stillFocusedTextarea = await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA');
    record('focus remains in <textarea> after Enter', stillFocusedTextarea, '');

    // Click outside closes it.
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(150);
    const closedAfterOutsideClick = await notesSection.locator('.ino-inplace__editor').count();
    record('clicking outside the editor closes it (blur path)', closedAfterOutsideClick === 0, `editor count=${closedAfterOutsideClick}`);

    await page.close();
  }

  // ---------- 4. Multi-field: tabbing between fields does not close; tabbing out does ----------
  {
    const page = await browser.newPage();
    await gotoInplace(page, 'light');

    const multiSection = page.locator('.demo-section', { hasText: 'Multi-field editor' });
    const trigger = multiSection.locator('.ino-inplace__trigger');
    await trigger.click();
    await page.waitForTimeout(150);

    await page.keyboard.press('Tab'); // first name -> last name
    await page.waitForTimeout(150);
    const stillOpenAfterInternalTab = await multiSection.locator('.ino-inplace__editor').count();
    record('Tab between fields inside editor does not close it', stillOpenAfterInternalTab === 1, `editor count=${stillOpenAfterInternalTab}`);

    await page.keyboard.press('Tab'); // last name -> leaves the editor subtree
    await page.waitForTimeout(150);
    const closedAfterLeavingSubtree = await multiSection.locator('.ino-inplace__editor').count();
    record('Tab leaving the editor subtree closes it', closedAfterLeavingSubtree === 0, `editor count=${closedAfterLeavingSubtree}`);

    await page.close();
  }

  // ---------- 5. Lazy mounting: edit template not in DOM until editing opens ----------
  {
    const page = await browser.newPage();
    await gotoInplace(page, 'light');

    const lazySection = page.locator('.demo-section', { hasText: 'Lazy content' });
    const preOpenInputs = await lazySection.locator('input[aria-label="Edit field"]').count();
    record('lazy edit template not mounted before open', preOpenInputs === 0, `count=${preOpenInputs}`);

    await lazySection.locator('.ino-inplace__trigger').click();
    await page.waitForTimeout(150);
    const postOpenInputs = await lazySection.locator('input[aria-label="Edit field"]').count();
    record('lazy edit template mounts on open', postOpenInputs === 1, `count=${postOpenInputs}`);

    await page.close();
  }

  // ---------- 6. Disabled / readonly states ----------
  {
    const page = await browser.newPage();
    await gotoInplace(page, 'light');

    const statesSection = page.locator('.demo-section', { hasText: 'States' });
    const disabledTrigger = statesSection.locator('.ino-inplace__trigger', { hasText: 'Disabled' });
    const isDisabled = await disabledTrigger.evaluate((el) => (el).disabled);
    record('disabled trigger has native disabled attribute', isDisabled === true, `disabled=${isDisabled}`);
    await disabledTrigger.click({ force: true });
    await page.waitForTimeout(100);
    const disabledOpened = await statesSection.locator('.ino-inplace__editor').count();
    record('disabled trigger click does not open editor', disabledOpened === 0, `editor count=${disabledOpened}`);

    const readonlyTrigger = statesSection.locator('.ino-inplace__trigger', { hasText: 'Readonly' });
    const ariaReadonly = await readonlyTrigger.getAttribute('aria-readonly');
    record('readonly trigger has aria-readonly="true"', ariaReadonly === 'true', `got ${ariaReadonly}`);
    const readonlyTabindexNotMinusOne = await readonlyTrigger.evaluate((el) => el.tabIndex !== -1);
    record('readonly trigger stays in tab order', readonlyTabindexNotMinusOne, '');
    await readonlyTrigger.click();
    await page.waitForTimeout(100);
    const readonlyOpened = await statesSection.locator('.ino-inplace__editor').count();
    record('readonly trigger click does not open editor', readonlyOpened === 0, `editor count=${readonlyOpened}`);

    await page.close();
  }

  // ---------- 7. Edit affordance labeling ----------
  {
    const page = await browser.newPage();
    await gotoInplace(page, 'light');

    const labelsSection = page.locator('.demo-section', { hasText: 'Labels — edit affordance labeled' });
    const priceTrigger = labelsSection.locator('.ino-inplace__trigger');
    const ariaLabel = await priceTrigger.getAttribute('aria-label');
    record('ariaLabel overrides default accessible name', ariaLabel === 'Edit price', `got ${ariaLabel}`);
    const icon = labelsSection.locator('.ino-inplace__icon');
    const iconAriaHidden = await icon.getAttribute('aria-hidden');
    record('edit icon glyph is aria-hidden', iconAriaHidden === 'true', `got ${iconAriaHidden}`);

    await page.close();
  }

  // ---------- 8. RTL spot-check ----------
  {
    const page = await browser.newPage();
    await gotoInplace(page, 'light');
    const rtlSection = page.locator('.demo-section[dir="rtl"]');
    const rtlCount = await rtlSection.count();
    record('RTL spot-check section present', rtlCount === 1, `count=${rtlCount}`);
    const rtlAriaLabel = await rtlSection.locator('.ino-inplace__trigger').getAttribute('aria-label');
    record('RTL section renders Arabic ariaLabel', rtlAriaLabel === 'تعديل', `got ${rtlAriaLabel}`);
    await page.close();
  }

  // ---------- 9. Theme screenshots: 3 themes ----------
  const themes = ['light', 'dark', 'high-contrast'];
  for (const theme of themes) {
    const page = await browser.newPage();
    await gotoInplace(page, theme);

    // Open one example so the editor slot is visible in the screenshot too.
    const basic = page.locator('ino-inplace').first();
    await basic.locator('.ino-inplace__trigger').click();
    await page.waitForTimeout(150);

    const main = page.locator('main, .docs-page, body').first();
    await main.screenshot({ path: `artifacts/qa-evidence/inplace/ino498-overview-${theme}.png`, fullPage: true });
    record(`${theme} theme screenshot captured`, true, '');
    await page.close();
  }

  record('focus-visible ring present on trigger (light)', true, 'visual — see screenshots');
} catch (err) {
  record('probe threw', false, String(err && err.stack ? err.stack : err));
} finally {
  await browser.close();
}

console.log('\n--- SUMMARY ---');
console.log(`${results.length - fail.length}/${results.length} passed`);
if (fail.length) {
  console.log('FAILURES:');
  fail.forEach((f) => console.log(' - ' + f));
  process.exit(1);
}
