// QA probe for INO-925: ino-dragdrop §2 Publish Contract validation.
// Run against a static production build served on :4925 (see heartbeat recovery notes).
import { chromium } from 'playwright';

const BASE = 'http://localhost:4925';
const results = [];
const fail = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) fail.push(`${name}: ${detail}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' :: ' + detail : ''}`);
}

async function gotoDragdrop(page, theme) {
  await page.addInitScript((t) => {
    try { localStorage.setItem('ino-theme', t); } catch {}
  }, theme);
  await page.goto(`${BASE}/docs/components/dragdrop`, { waitUntil: 'networkidle' });
  await page.waitForSelector('ino-dragdrop .ino-dragdrop__list', { timeout: 10000 });
}

const liveRegionText = (page) =>
  page.evaluate(() => document.querySelector('[data-ino-dragdrop-announce]')?.textContent ?? '');

const browser = await chromium.launch();

try {
  // ---------- 1. Keyboard-only walkthrough: pick up, navigate, drop (Default section) ----------
  {
    const page = await browser.newPage();
    await gotoDragdrop(page, 'light');

    const defaultSection = page.locator('.demo-section').nth(0);
    const firstItem = defaultSection.locator('.ino-dragdrop__item').first();
    await firstItem.waitFor();
    const itemLabel = await firstItem.getAttribute('aria-label');
    record('first draggable item is "Invoice review"', itemLabel === 'Invoice review', `got ${itemLabel}`);

    // Tab to the item (should be the first tab stop inside the Default source list).
    await firstItem.focus();
    const focusedBefore = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    record('focus lands on draggable item', focusedBefore === 'Invoice review', `got ${focusedBefore}`);

    // Space picks up.
    await page.keyboard.press(' ');
    const grabbed = await firstItem.getAttribute('aria-grabbed');
    record('Space sets aria-grabbed=true', grabbed === 'true', `got ${grabbed}`);
    const hasClass = await firstItem.evaluate((el) => el.classList.contains('ino-dragging-active'));
    record('Space applies ino-dragging-active class', hasClass, '');

    await page.waitForTimeout(50);
    const pickupAnnounce = await liveRegionText(page);
    record(
      'aria-live announces pick-up with item name',
      pickupAnnounce.includes('Invoice review picked up'),
      `got "${pickupAnnounce}"`,
    );

    // ArrowRight navigates droppables in DOM order (first hit is the item's own source zone).
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const zone1Announce = await liveRegionText(page);
    record(
      'arrow-key zone-visit announcement uses human label, not a DOM id (first zone, source)',
      zone1Announce.includes('Available') && !zone1Announce.includes('-label'),
      `got "${zone1Announce}"`,
    );

    // Second ArrowRight reaches the Default target zone ("Selected").
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const zone2Announce = await liveRegionText(page);
    const focusedZoneClass = await page.evaluate(() =>
      document.activeElement?.classList.contains('ino-drop-zone-active'),
    );
    record('focus moves to a droppable with active class on zone-visit', !!focusedZoneClass, '');
    record(
      'target-zone announcement names the zone ("Selected"), not its DOM id',
      zone2Announce.includes('Selected') && !zone2Announce.includes('-label'),
      `got "${zone2Announce}"`,
    );

    // Confirm we are actually focused on the Default target list before dropping.
    const focusedIsDefaultTarget = await page.evaluate(() => {
      const el = document.activeElement;
      return !!el && el.getAttribute('aria-labelledby')?.includes('target-label') && el.tagName === 'UL';
    });
    record('focused droppable before Enter is a target list', focusedIsDefaultTarget, '');

    // Enter drops.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const movedIntoTarget = await defaultSection
      .locator('.ino-dragdrop__column')
      .nth(1)
      .locator('.ino-dragdrop__item', { hasText: 'Invoice review' })
      .count();
    record('Enter drops item into focused target zone', movedIntoTarget === 1, `count=${movedIntoTarget}`);

    const grabbedAfterDrop = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.ino-dragdrop__item'));
      const dropped = items.find((i) => i.getAttribute('aria-label') === 'Invoice review');
      return dropped?.getAttribute('aria-grabbed');
    });
    record('aria-grabbed resets to false after drop', grabbedAfterDrop === 'false', `got ${grabbedAfterDrop}`);

    const dropAnnounce = await liveRegionText(page);
    record(
      'drop-success announcement is present',
      dropAnnounce.includes('dropped successfully'),
      `got "${dropAnnounce}"`,
    );
    record(
      'drop-success announcement names the zone, not a DOM id',
      dropAnnounce.includes('Selected') && !dropAnnounce.includes('-label'),
      `got "${dropAnnounce}"`,
    );

    // dropped-flash: class should appear then clear within ~200ms.
    const droppedItem = defaultSection.locator('.ino-dragdrop__item', { hasText: 'Invoice review' });
    const flashedSoonAfter = await droppedItem.evaluate((el) => el.classList.contains('ino-dropped-flash'));
    record('dropped-flash class applied immediately after drop', flashedSoonAfter, '');
    await page.waitForTimeout(350);
    const flashedAfterWait = await droppedItem.evaluate((el) => el.classList.contains('ino-dropped-flash'));
    record('dropped-flash class clears after ~200ms', !flashedAfterWait, '');

    await page.close();
  }

  // ---------- 2. Escape cancels the carry ----------
  {
    const page = await browser.newPage();
    await gotoDragdrop(page, 'light');
    const defaultSection = page.locator('.demo-section').nth(0);
    const item = defaultSection.locator('.ino-dragdrop__item').first(); // "KYB document check" now first (prior item moved)
    await item.waitFor();
    const label = await item.getAttribute('aria-label');

    await item.focus();
    await page.keyboard.press('Enter'); // Enter also activates per SPEC §3.1 step 2
    const grabbed = await item.getAttribute('aria-grabbed');
    record('Enter (not just Space) activates pick-up', grabbed === 'true', `got ${grabbed}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    const grabbedAfter = await item.getAttribute('aria-grabbed');
    record('Escape resets aria-grabbed to false', grabbedAfter === 'false', `got ${grabbedAfter}`);
    const cancelAnnounce = await liveRegionText(page);
    record(
      'Escape fires a cancel announcement naming the item',
      cancelAnnounce.includes('Drop cancelled') && cancelAnnounce.includes(label ?? ''),
      `got "${cancelAnnounce}"`,
    );
    const focusedAfterEscape = await page.evaluate((lbl) => document.activeElement?.getAttribute('aria-label'), label);
    record('focus returns to source item after Escape', focusedAfterEscape === label, `got ${focusedAfterEscape}`);

    await page.close();
  }

  // ---------- 3. maxItems capacity rejection (Capped section) ----------
  {
    const page = await browser.newPage();
    await gotoDragdrop(page, 'light');
    const cappedSection = page.locator('.demo-section').nth(1);
    await cappedSection.locator('.ino-dragdrop__count').waitFor();
    const capLabel = await cappedSection.locator('.ino-dragdrop__count').innerText();
    record('capped zone shows maxItems counter', capLabel.trim() === '0 / 2', `got "${capLabel.trim()}"`);

    // NOTE: arrow-key navigation moves the *tracked* focusedDroppable (confirmed correct — see
    // the Default-section drop above) but never actually calls a successful DOM .focus(), because
    // `[inoDroppable]` hosts ship no `tabindex` (confirmed bug, see findings). So we can't detect
    // "arrived at the Capped target" via document.activeElement here. The droppable registry is
    // global and DOM-ordered across every demo section on this page: Default-source(0),
    // Default-target(1), Capped-source(2), Capped-target(3), Disabled-source(4),
    // Disabled-target(5) — a fresh pick-up always starts at index -1, so exactly 4 ArrowRight
    // presses reaches Capped-target deterministically.
    async function dragFirstSourceItemIntoCappedTarget() {
      const sourceItem = cappedSection.locator('.ino-dragdrop__column').nth(0).locator('.ino-dragdrop__item').first();
      await sourceItem.focus();
      await page.keyboard.press(' ');
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(40);
      }
      await page.keyboard.press('Enter');
      await page.waitForTimeout(50);
    }

    await dragFirstSourceItemIntoCappedTarget();
    await dragFirstSourceItemIntoCappedTarget();
    const capAfterTwo = await cappedSection.locator('.ino-dragdrop__count').innerText();
    record('two drops fill the capped zone', capAfterTwo.trim() === '2 / 2', `got "${capAfterTwo.trim()}"`);
    const fullClass = await cappedSection
      .locator('.ino-dragdrop__column')
      .nth(1)
      .locator('.ino-dragdrop__list')
      .evaluate((el) => el.classList.contains('ino-dragdrop__list--full'));
    record('full target zone gets the --full class', fullClass, '');

    // Third item: zone-visit announcement while carrying should say "full", and Enter must reject.
    const thirdSourceItem = cappedSection.locator('.ino-dragdrop__column').nth(0).locator('.ino-dragdrop__item').first();
    await thirdSourceItem.focus();
    const thirdLabel = await thirdSourceItem.getAttribute('aria-label');
    await page.keyboard.press(' ');
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(40);
    }
    const fullAnnounce = await liveRegionText(page);
    record('zone-visit announcement reports "full" when at capacity', fullAnnounce.includes('full'), `got "${fullAnnounce}"`);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const capAfterReject = await cappedSection.locator('.ino-dragdrop__count').innerText();
    record('rejected drop does not change the counter', capAfterReject.trim() === '2 / 2', `got "${capAfterReject.trim()}"`);
    const rejectAnnounce = await liveRegionText(page);
    record(
      'reject announcement fires on Enter at a full zone',
      rejectAnnounce.includes('Cannot drop here') && rejectAnnounce.includes('full'),
      `got "${rejectAnnounce}"`,
    );
    const thirdStillInSource = await cappedSection
      .locator('.ino-dragdrop__column')
      .nth(0)
      .locator('.ino-dragdrop__item', { hasText: thirdLabel ?? ' ' })
      .count();
    record('rejected item remains in source zone', thirdStillInSource === 1, `count=${thirdStillInSource}`);

    await page.close();
  }

  // ---------- 4. Disabled state ----------
  {
    const page = await browser.newPage();
    await gotoDragdrop(page, 'light');
    const statesSection = page.locator('.demo-section').nth(2);
    await statesSection.waitFor();

    const disabledItem = statesSection.locator('.ino-dragdrop__item').first();
    const hasDisabledClass = await disabledItem.evaluate((el) => el.classList.contains('ino-dragdrop__item--disabled'));
    record('disabled-section item carries the disabled visual class', hasDisabledClass, '');

    await disabledItem.focus();
    await page.keyboard.press(' ');
    await page.waitForTimeout(50);
    const grabbedWhileDisabled = await disabledItem.getAttribute('aria-grabbed');
    record('Space on a disabled draggable does not start a carry', grabbedWhileDisabled === 'false', `got ${grabbedWhileDisabled}`);

    const disabledZone = statesSection.locator('.ino-dragdrop__list').first();
    const zoneAriaDisabled = await disabledZone.getAttribute('aria-disabled');
    record('disabled droppable zone exposes aria-disabled', zoneAriaDisabled === 'true', `got ${zoneAriaDisabled}`);

    await page.close();
  }

  // ---------- 5. 3-theme x dense/fluid screenshots ----------
  // dragdrop has a hand-authored demo (CUSTOM_DEMOS), so docs-component-detail.component.html's
  // *ngIf takes the custom-demo branch and the generic "Density axis" section (the two
  // `.docs-live-box[data-density]` boxes) never renders at all for this slug — confirmed by
  // reading the template, not inferred from a selector timeout. The whole docs layout is also
  // hardcoded to `data-density="dense"` (docs-layout.component.ts host binding) with no in-app
  // toggle to fluid for a custom demo. Per SPEC.md §2 row 3 ("Sizing ... Deliberate omission ...
  // Drag-drop directives have no intrinsic size"), dense vs fluid is expected to render
  // identically here, so for the required dense/fluid evidence we force `[data-density]` on a
  // wrapper around the live demo via JS (the only way to reach "fluid" for this slug) and confirm
  // that expectation rather than silently skipping the ask.
  const themes = ['dark', 'light', 'high-contrast'];
  for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await gotoDragdrop(page, theme);
    const liveSection = page.locator('.demo-section').nth(0);
    await liveSection.waitFor();

    for (const density of ['dense', 'fluid']) {
      await page.evaluate((d) => {
        document.querySelectorAll('.demo-section').forEach((el) => el.setAttribute('data-density', d));
      }, density);
      await page.waitForTimeout(150);
      await liveSection.screenshot({ path: `artifacts/qa-evidence/dragdrop/ino925-live-${density}-${theme}.png` });
    }
    record(`${theme} theme dense+fluid live-demo screenshots captured`, true, '');

    await page.close();
  }
} finally {
  await browser.close();
}

console.log('\n=== SUMMARY ===');
console.log(`${results.length - fail.length}/${results.length} passed`);
if (fail.length) {
  console.log('FAILURES:');
  fail.forEach((f) => console.log(' - ' + f));
  process.exit(1);
}
