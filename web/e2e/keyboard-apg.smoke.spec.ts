import { Page, expect, test } from '@playwright/test';

import { activeElement, gotoDocs } from './support/portal';

/**
 * D-gate 3(a), third of three — APG KEYBOARD MAPS (doc 26 §7; the §2.5 dimension).
 *
 * §2.5 of the Publish Contract requires a documented keyboard map per component, and D-gate 2
 * requires QA to walk it by hand. This is the part of that walkthrough a machine can do every
 * PR, so QA's hand-walk is spent on judgement rather than on re-pressing ArrowRight.
 *
 * Every assertion here is RELATIVE — "ArrowRight then ArrowLeft returns to the same cell",
 * "Home lands on column 0 of its row" — never absolute ("focus is on the 17th"). A test that
 * pins today's date is a test that fails on the 1st of a month for a reason that has nothing
 * to do with the component, and a gate that fails for the wrong reason gets switched off. The
 * relative form still catches every real defect: a handler that moves by the wrong unit, one
 * that moves in the wrong direction, a missing preventDefault that lets the page scroll
 * instead, or a key that is simply not wired.
 *
 * ── Quarantined tests in this file ───────────────────────────────────────────────────────
 * The three INO-390 grid-navigation defects are fixed; their `test.fail()` annotations are
 * removed below. One datepicker grid test still carries `test.fail()`, for INO-392 (focus
 * dropped to <body> on dismiss instead of returning to the trigger) — that is a REAL DEFECT
 * this gate found, not a flaky test or an aspirational spec; see its annotation for the
 * located cause. It is filed rather than fixed here because that component fix belongs on
 * its own issue with a QA subtask (doc 26 §7 D-gate 1/2), not inside this PR. Playwright
 * reports an unexpectedly-PASSING `test.fail()` test as a failure, so CI is what tells the
 * fixer to delete the annotation — the quarantine cannot rot into a permanent exemption.
 *
 * The INO-390 fix has three parts: (1) `cdr.detectChanges()` in place of `queueMicrotask` in
 * both `openPanel` and `onGridKeydown`; (2) a `trackBy` on both grid `*ngFor`s in the template,
 * because the `weeks` getter returns fresh object literals on every read and without `trackBy`
 * Angular tears down and rebuilds every cell on the render scheduler's OWN follow-up tick —
 * which intermittently destroyed the very cell `focusGrid()` had just focused, one frame after
 * (2) landed, dropping focus to <body>; and (3) a fix to `onGridKeydown`'s repagination logic:
 * the grid always renders a fixed 6-week window including leading/trailing days from adjacent
 * months (see the `weeks` getter), so Home/End/arrow moves that land in that overflow region
 * must NOT re-point `viewDate` (it reflows every cell's row index and breaks "same week"
 * comparisons), while PageUp/PageDown must ALWAYS re-point `viewDate` since they explicitly
 * page the displayed month. Verified locally, including a 10x --workers=1 repeat: all three
 * grid tests pass, and the appendTo="body" portal anchoring and focus-trap Tab-escape tests
 * remain green (the `appendTo="body"` scrolling-ancestor smoke failure that may still show in
 * this file's suite predates this fix — reproduces identically on the pre-fix component, see
 * INO-390).
 */

/** Identity of the currently-focused date cell, in terms that survive a re-render: which
 *  month is displayed, which day number, and the cell's coordinates in the week grid. */
async function gridFocus(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.ino-datepicker__panel[role="dialog"]');
    const el = document.activeElement as HTMLElement | null;
    const heading = panel?.querySelector('.ino-datepicker__heading')?.textContent?.trim() ?? null;
    if (!panel || !el || el.getAttribute('role') !== 'gridcell') {
      return { heading, day: null as string | null, row: -1, column: -1, isGridcell: false };
    }
    const rows = [...panel.querySelectorAll('.ino-datepicker__week')];
    const row = rows.findIndex((r) => r.contains(el));
    const column = row >= 0 ? [...rows[row].children].indexOf(el) : -1;
    return { heading, day: el.textContent?.trim() ?? null, row, column, isGridcell: true };
  });
}

async function openDatepickerGrid(page: Page) {
  await gotoDocs(page, '/docs/components/datepicker');
  const host = page.getByTestId('dp-positioned-ancestor');
  await host.scrollIntoViewIfNeeded();
  const trigger = host.locator('button.ino-field__control');

  // Opened with the KEYBOARD, not a click — `aria-haspopup="dialog"` promises a keyboard user
  // can get in, and Enter on a <button> is the path they take.
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ino-datepicker__panel[role="dialog"]:visible')).toHaveCount(1);
  return { host, trigger };
}

test.describe('D-gate 3a — APG "Date Picker Dialog" keyboard map (ino-datepicker)', () => {
  test('the dialog opens from the keyboard onto the tabbable gridcell', async ({ page }) => {
    // The one part of the grid contract that does hold today, and worth keeping armed on its
    // own: if opening from the keyboard regressed, every quarantined test below would fail for
    // a second, unrelated reason and the INO-390 signal would be lost.
    await openDatepickerGrid(page);
    const start = await gridFocus(page);
    expect(start.isGridcell, `initial focus is not a gridcell — it is on ${await activeElement(page)}`).toBe(true);
    expect(start.heading, 'the dialog has no month heading to label itself with').toBeTruthy();
  });

  test('arrow keys move by day and week, and are reversible', async ({ page }) => {
    await openDatepickerGrid(page);

    const start = await gridFocus(page);
    expect(start.isGridcell).toBe(true);

    // ArrowRight = +1 day. Reversibility is the strong form: a handler that moved by the wrong
    // unit in one direction only (a real class of off-by-one) fails here while "focus changed"
    // would pass.
    await page.keyboard.press('ArrowRight');
    const right = await gridFocus(page);
    expect(right.day, 'ArrowRight did not move focus').not.toBe(start.day);
    await page.keyboard.press('ArrowLeft');
    expect(await gridFocus(page), 'ArrowLeft did not undo ArrowRight — the two keys move by different units').toEqual(start);

    // ArrowDown = +7 days = one row down (or a month page if it crosses the boundary).
    await page.keyboard.press('ArrowDown');
    const down = await gridFocus(page);
    expect(down.column, 'ArrowDown changed the weekday column — it must move by exactly 7 days').toBe(start.column);
    expect(down.day, 'ArrowDown did not move focus').not.toBe(start.day);
    await page.keyboard.press('ArrowUp');
    expect(await gridFocus(page), 'ArrowUp did not undo ArrowDown').toEqual(start);
  });

  test('Home and End move to the first and last day of the focused week', async ({ page }) => {
    await openDatepickerGrid(page);

    await page.keyboard.press('Home');
    const home = await gridFocus(page);
    expect(home.column, 'Home must land on the first column of the focused week').toBe(0);

    await page.keyboard.press('End');
    const end = await gridFocus(page);
    expect(end.column, 'End must land on the last (7th) column of the focused week').toBe(6);
    expect(end.row, 'End must stay in the same week row as Home').toBe(home.row);
  });

  test('PageUp and PageDown page the month, Shift pages the year', async ({ page }) => {
    await openDatepickerGrid(page);
    const start = await gridFocus(page);

    await page.keyboard.press('PageDown');
    const next = await gridFocus(page);
    expect(next.heading, 'PageDown did not advance the displayed month').not.toBe(start.heading);

    await page.keyboard.press('PageUp');
    expect((await gridFocus(page)).heading, 'PageUp did not return to the starting month').toBe(start.heading);

    await page.keyboard.press('Shift+PageDown');
    const nextYear = await gridFocus(page);
    expect(nextYear.heading, 'Shift+PageDown did not advance the year').not.toBe(start.heading);
    // Month name unchanged, year changed — the heading is "<Month> <Year>", so the first word
    // must survive a year page.
    expect(nextYear.heading?.split(/\s+/)[0]).toBe(start.heading?.split(/\s+/)[0]);
  });

  test('Enter selects the focused date and dismisses the dialog', async ({ page }) => {
    const { host } = await openDatepickerGrid(page);
    const valueBefore = (await host.locator('.ino-field__value').textContent())?.trim();

    await page.keyboard.press('Enter');
    await expect(page.locator('.ino-datepicker__panel[role="dialog"]')).toHaveCount(0);

    const valueAfter = (await host.locator('.ino-field__value').textContent())?.trim();
    expect(valueAfter, 'Enter on a gridcell did not commit a date into the trigger').not.toBe(valueBefore);
  });

  test('Escape dismisses without selecting, and aria-expanded tracks the panel', async ({ page }) => {
    const { host, trigger } = await openDatepickerGrid(page);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const valueBefore = (await host.locator('.ino-field__value').textContent())?.trim();

    await page.keyboard.press('Escape');
    await expect(page.locator('.ino-datepicker__panel[role="dialog"]')).toHaveCount(0);
    await expect(trigger, 'aria-expanded was not reset on dismiss').toHaveAttribute('aria-expanded', 'false');

    const valueAfter = (await host.locator('.ino-field__value').textContent())?.trim();
    expect(valueAfter, 'Escape committed a value — it must cancel, not select').toBe(valueBefore);
  });

  // ── Quarantined: INO-392 ────────────────────────────────────────────────────────────────
  test('dismissing the dialog returns focus to the trigger', async ({ page }) => {
    test.fail(
      true,
      'INO-392 — focus is dropped on <body> instead of the trigger, on both Escape-dismiss and ' +
        'Enter-select. Same cause as the modal: the focus-trap directive skips its restore ' +
        'because it reads `host.contains(activeElement())` after teardown. ' +
        'Delete this test.fail() with the fix.',
    );

    const { trigger } = await openDatepickerGrid(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.ino-datepicker__panel[role="dialog"]')).toHaveCount(0);
    await expect(
      trigger,
      `focus was not returned to the trigger after dismiss — it is on ${await activeElement(page)}`,
    ).toBeFocused();
  });
});

test.describe('D-gate 3a — APG "Radio Group" keyboard map (ino-radio-group)', () => {
  // `<ino-radio>` wraps a native <input type="radio">, so the browser supplies the roving
  // tabindex and arrow-key selection. What is OURS — and what is therefore worth a test — is
  // that the (click)/(change) interception in ino-radio.component.ts does not break it, and
  // that the readonly guard holds on the KEYBOARD path as well as the pointer one. (Arrow
  // navigation on a radio fires a click in Chromium, so a readonly guard implemented only in
  // the click handler is exactly the kind of thing that can be right by accident or wrong by
  // accident; either way nobody knows which without this test.)
  test('arrow keys move selection within the group', async ({ page }) => {
    await gotoDocs(page, '/docs/components/radio-group');

    const group = page.locator('ino-radio-group').filter({ hasText: 'Notification frequency' });
    await expect(group).toBeVisible();
    await group.scrollIntoViewIfNeeded();

    const radios = group.locator('input[type="radio"]');
    await expect(radios).toHaveCount(3);

    // The demo starts on 'immediately'. Focus enters the group on the CHECKED radio — the
    // roving-tabindex property: an unchecked radio must not be a tab stop.
    await radios.nth(0).focus();
    await expect(radios.nth(0)).toBeChecked();

    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(1), 'ArrowDown did not move selection to the next radio').toBeChecked();
    await expect(radios.nth(1), 'selection moved but focus did not follow it').toBeFocused();
    await expect(radios.nth(0)).not.toBeChecked();

    await page.keyboard.press('ArrowUp');
    await expect(radios.nth(0), 'ArrowUp did not move selection back').toBeChecked();

    // Wrap: ArrowUp from the first radio goes to the last, per the APG radio-group pattern.
    await page.keyboard.press('ArrowUp');
    await expect(radios.nth(2), 'ArrowUp from the first radio must wrap to the last').toBeChecked();
  });

  test('a readonly radio does not change under the keyboard', async ({ page }) => {
    await gotoDocs(page, '/docs/components/radio-group');

    // The States section's readonly row: checked and readonly, its own name, so nothing else
    // in the group can absorb the change.
    const readonly = page.locator('input[name="state-readonly"]');
    await expect(readonly).toHaveCount(1);
    await readonly.scrollIntoViewIfNeeded();
    await expect(readonly).toBeChecked();

    await readonly.focus();
    await page.keyboard.press('Space');
    await expect(readonly, 'a readonly radio must stay checked under Space').toBeChecked();

    // A lone radio has no siblings to move to, so ArrowDown must be a no-op rather than a
    // silent uncheck.
    await page.keyboard.press('ArrowDown');
    await expect(readonly, 'a readonly radio must not lose its value to an arrow key').toBeChecked();
  });
});
