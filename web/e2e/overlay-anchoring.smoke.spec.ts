import { Page, expect, test } from '@playwright/test';

import { box, gotoDocs } from './support/portal';

/**
 * D-gate 3(a), first of three — THE DIRECT D1 REGRESSION TEST (doc 26 §7; the bug is §1/§4-A1,
 * fixed in INO-364, harnessed in INO-368).
 *
 * The board's finding was that the calendar popup "opens in the wrong place on the docs page".
 * The cause: `.ino-datepicker__overlay` is `position: absolute`, and before INO-364 it had no
 * positioned ancestor inside its own component — so it resolved against whatever positioned
 * ancestor happened to exist on the HOST PAGE. On a bare page that looks fine. On the docs
 * portal, where the demo sits inside a `position: relative` wrapper, the panel jumped to the
 * wrapper's origin instead of the field's.
 *
 * That is why the assertion here is a GEOMETRIC one against the trigger's own box and not
 * "the panel is visible": the broken version was perfectly visible, just 200px away from the
 * control it belonged to. Every unit test in ino-datepicker.spec.ts passed throughout, because
 * jsdom computes no layout at all — there is no cheaper place than a real browser to ask this
 * question, which is the entire justification for standing Playwright up.
 *
 * Targets are the four `<app-demo-constrained-container>` ancestor shapes C2 built, by
 * data-testid (added in INO-375 for exactly this) — not by label prose, which changes whenever
 * the demo copy is edited.
 */

const DATEPICKER_DOCS = '/docs/components/datepicker';

// `inset-block-start: calc(100% + var(--ino-space-2))` on .ino-datepicker__overlay, where
// --ino-space-2 is 8px. Asserted as a range rather than the exact number so a deliberate
// token change (8px -> 12px) does not fail the gate, while the ~200px offset the D1 bug
// produced is nowhere near it.
const GAP_MIN_PX = 0;
const GAP_MAX_PX = 20;
// Sub-pixel layout rounding only; the bug's horizontal error was the container's inline padding.
const ALIGN_TOLERANCE_PX = 3;

/** Opens one demo datepicker's panel and returns the boxes the anchoring contract relates. */
async function openAndMeasure(page: Page, testId: string) {
  const host = page.getByTestId(testId);
  await expect(host, `demo target [data-testid="${testId}"] is missing from ${DATEPICKER_DOCS} — the C2 demo was edited without updating this spec`).toBeVisible();

  // Scroll the field into view first: an overlay opened while its trigger is off-screen is a
  // meaningless measurement, and the scroll-ancestor demos are below the fold at 1280x900.
  await host.scrollIntoViewIfNeeded();

  const wrap = host.locator('.ino-field__control-wrap');
  const trigger = host.locator('button.ino-field__control');
  await trigger.click();

  // `appendTo="body"` reparents the overlay out of the host, so it must be located from the
  // page root; scoping to the visible one keeps the other demos' closed panels out of it.
  const overlay = page.locator('.ino-datepicker__overlay:visible');
  await expect(overlay).toHaveCount(1);
  const panel = overlay.locator('.ino-datepicker__panel');
  await expect(panel).toBeVisible();

  return { host, trigger, panel, overlay, wrapBox: await box(wrap), panelBox: await box(panel) };
}

/** The anchoring contract itself: left edges aligned, panel immediately below the field. */
function expectAnchoredToTrigger(
  wrapBox: { x: number; y: number; width: number; height: number },
  panelBox: { x: number; y: number; width: number; height: number },
  what: string,
) {
  const horizontalError = Math.abs(panelBox.x - wrapBox.x);
  expect(
    horizontalError,
    `${what}: panel left edge is ${horizontalError.toFixed(1)}px from the field's left edge. ` +
      `The INO-364 bug anchored the overlay to a foreign positioned ancestor instead of its own trigger.`,
  ).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);

  const gap = panelBox.y - (wrapBox.y + wrapBox.height);
  expect(
    gap,
    `${what}: panel top is ${gap.toFixed(1)}px below the field's bottom edge (expected ${GAP_MIN_PX}-${GAP_MAX_PX}px). ` +
      `A large or negative value means the overlay resolved position:absolute against the wrong ancestor (INO-364).`,
  ).toBeGreaterThanOrEqual(GAP_MIN_PX);
  expect(gap).toBeLessThanOrEqual(GAP_MAX_PX);
}

test.describe('D-gate 3a — datepicker overlay anchors to its own trigger (INO-364 regression)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDocs(page, DATEPICKER_DOCS);
  });

  test('positioned ancestor: panel anchors to the field, not the surrounding position:relative wrapper', async ({ page }) => {
    // This is the exact bug shape. The demo wrapper IS a position:relative ancestor, so a
    // regression of INO-364 puts the panel at the wrapper's padding-box origin.
    const { wrapBox, panelBox, overlay } = await openAndMeasure(page, 'dp-positioned-ancestor');
    expectAnchoredToTrigger(wrapBox, panelBox, 'positioned ancestor');

    // ...and the overlay must resolve inside its own component, which is what makes the
    // geometry above hold on ANY host page rather than only on this one.
    const anchoredWithinField = await overlay.evaluate(
      (el) => !!el.closest('.ino-field__control-wrap'),
    );
    expect(
      anchoredWithinField,
      'the overlay is not nested inside its own .ino-field__control-wrap — it will anchor to whatever positioned ancestor the host page happens to have (INO-364)',
    ).toBe(true);
  });

  test('narrow ancestor: panel still anchors to the field when the container is width-constrained', async ({ page }) => {
    // Deliberately asserts anchoring only, not "stays inside the viewport": with
    // appendTo="self" the position is pure CSS with no flip/clamp logic, so a panel wider
    // than a narrow container legitimately overhangs it. Anchoring is the contract; clamping
    // is what appendTo="body" is for (next test).
    const { wrapBox, panelBox } = await openAndMeasure(page, 'dp-narrow-ancestor');
    expectAnchoredToTrigger(wrapBox, panelBox, 'narrow ancestor');
  });

  test('scrolling ancestor, appendTo="self": overlay stays in the ancestor subtree (and can be clipped)', async ({ page }) => {
    const { wrapBox, panelBox, overlay } = await openAndMeasure(page, 'dp-scroll-self');
    expectAnchoredToTrigger(wrapBox, panelBox, 'scroll ancestor (self)');

    const insideContainer = await overlay.evaluate((el) => !!el.closest('[data-testid="container-scroll-self"]'));
    expect(
      insideContainer,
      'appendTo="self" must keep the overlay inside its own DOM subtree — that constraint is the documented reason appendTo="body" exists',
    ).toBe(true);
  });

  test('scrolling ancestor, appendTo="body": overlay portals to document.body and escapes the clip', async ({ page }) => {
    const { wrapBox, panelBox, overlay } = await openAndMeasure(page, 'dp-scroll-body');

    // The portal switches to position:fixed with JS-computed coordinates, so the anchoring
    // contract is the same one but enforced by a different mechanism — which is precisely why
    // it needs its own test rather than being assumed from the CSS.
    expectAnchoredToTrigger(wrapBox, panelBox, 'scroll ancestor (body portal)');

    const parentIsBody = await overlay.evaluate((el) => el.parentElement === document.body);
    expect(parentIsBody, 'appendTo="body" must reparent the overlay to document.body').toBe(true);

    const escapedTheClip = await overlay.evaluate(
      (el) => !el.closest('[data-testid="container-scroll-body"]'),
    );
    expect(escapedTheClip, 'the portalled overlay is still inside the clipping container').toBe(true);

    // Not clipped => fully within the viewport. This is the property the portal buys, and the
    // one a visitor actually notices.
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expect(panelBox.y, 'portalled panel is above the viewport').toBeGreaterThanOrEqual(0);
    expect(panelBox.x, 'portalled panel is left of the viewport').toBeGreaterThanOrEqual(0);
    expect(
      panelBox.y + panelBox.height,
      'portalled panel overflows the bottom of the viewport — the whole point of the body portal is that it is not clipped',
    ).toBeLessThanOrEqual(viewport!.height + 1);
  });
});
