import { expect, test } from '@playwright/test';

import { activeElement, focusIsInside, gotoDocs } from './support/portal';

/**
 * D-gate 3(a), second of three — FOCUS TRAP (doc 26 §7).
 *
 * `ino-focus-trap.spec.ts` already unit-tests the directive, and says in its own header why
 * that coverage is not enough:
 *
 *   "Tab traversal is simulated by focusing the sentinels directly rather than dispatching
 *    `Tab` keydowns: jsdom implements no native tab order, so a synthetic `Tab` event moves
 *    nothing."
 *
 * So the unit tests verify that the wrap handlers do the right thing WHEN REACHED, and cannot
 * verify that a real Tab reaches them. A tabindex regression, a sentinel rendered
 * `display: none`, or an `inert`/`aria-hidden` mistake all leave those unit tests green and
 * let focus walk out of an open modal into the page behind it. This is the test that closes
 * that gap, in a browser with a real sequential focus navigation order.
 *
 * Two live trap surfaces are covered, both reachable on the published portal:
 *   - `<ino-modal>` on /docs/design-system (an explicit "Open modal" trigger)
 *   - the datepicker's `role="dialog"` panel on /docs/components/datepicker, which carries
 *     `inoFocusTrap` with an `initialFocus` selector
 *
 * The RESTORE half of the trap contract (focus returns to the trigger on close) was the
 * INO-392 defect: the directive read `host.contains(activeElement())` after `*ngIf` teardown
 * had already moved focus off the host, so the restore was skipped in the common case. Fixed
 * in ino-focus-trap.directive.ts by also treating `null`/`<body>` as "focus was ours".
 */

const TAB_CYCLES = 12; // comfortably more than the focusable count in either surface

test.describe('D-gate 3a — focus trap (APG modal dialog pattern)', () => {
  test('ino-modal: focus moves in and Tab cannot leave', async ({ page }) => {
    await gotoDocs(page, '/docs/design-system');

    const trigger = page.getByRole('button', { name: 'Open modal' });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 1. Initial focus is moved INTO the dialog. A trap that only blocks Tab but leaves focus
    //    on the trigger behind the backdrop is still broken for a keyboard user.
    expect(
      await focusIsInside(page, '[role="dialog"]'),
      `focus was not moved into the dialog on open — it is on ${await activeElement(page)}`,
    ).toBe(true);

    // 2. Containment under real Tab. Walking further than the focusable count proves the WRAP,
    //    not merely that the first few Tabs happened to land inside.
    for (let i = 0; i < TAB_CYCLES; i++) {
      await page.keyboard.press('Tab');
      expect(
        await focusIsInside(page, '[role="dialog"]'),
        `Tab #${i + 1} escaped the dialog — focus landed on ${await activeElement(page)}`,
      ).toBe(true);
    }

    // 3. And in reverse. Shift+Tab off the first element must wrap to the last, which is the
    //    leading-sentinel path in the directive.
    for (let i = 0; i < TAB_CYCLES; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(
        await focusIsInside(page, '[role="dialog"]'),
        `Shift+Tab #${i + 1} escaped the dialog — focus landed on ${await activeElement(page)}`,
      ).toBe(true);
    }

    // 4. Escape dismisses. ino-modal owns this key, not the trap — see the modal's docblock:
    //    "the trap deliberately owns no dismissal keys".
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('datepicker panel: the role=dialog overlay traps Tab and honours its initialFocus selector', async ({ page }) => {
    await gotoDocs(page, '/docs/components/datepicker');

    const host = page.getByTestId('dp-positioned-ancestor');
    await host.scrollIntoViewIfNeeded();
    await host.locator('button.ino-field__control').click();

    const panel = page.locator('.ino-datepicker__panel[role="dialog"]:visible');
    await expect(panel).toHaveCount(1);

    // `[inoFocusTrapInitialFocus]="'[tabindex=\'0\']'"` — the one tabbable gridcell, i.e. the
    // focused date. Landing on the month-nav chevron instead would make every open start with
    // an arrow-key walk to reach the grid.
    const focusedIsTabbableGridcell = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && el.getAttribute('role') === 'gridcell' && el.getAttribute('tabindex') === '0';
    });
    expect(
      focusedIsTabbableGridcell,
      `initial focus is not the tabbable gridcell — it is on ${await activeElement(page)}`,
    ).toBe(true);

    for (let i = 0; i < TAB_CYCLES; i++) {
      await page.keyboard.press('Tab');
      expect(
        await focusIsInside(page, '.ino-datepicker__panel[role="dialog"]'),
        `Tab #${i + 1} escaped the datepicker dialog — focus landed on ${await activeElement(page)}`,
      ).toBe(true);
    }

    // Escape-dismissal for this surface is asserted in keyboard-apg.smoke.spec.ts, from the
    // initial gridcell. Deliberately not re-asserted here after a full tab cycle: that path
    // closed on one run and not the next while this gate was being written (recorded as a
    // secondary observation on INO-392), and a flaky assertion in a blocking gate is how
    // gates get switched off.
  });

  test('ino-modal: Escape restores focus to the trigger', async ({ page }) => {
    await gotoDocs(page, '/docs/design-system');
    const trigger = page.getByRole('button', { name: 'Open modal' });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(
      trigger,
      `focus was not restored to the trigger on close — it is on ${await activeElement(page)}`,
    ).toBeFocused();
  });
});
