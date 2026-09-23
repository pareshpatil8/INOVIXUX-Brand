/**
 * Anchored-overlay placement — private fork for `<ino-popover>` (INO-31 T-23 / INO-150).
 *
 * This is a fork of `../confirm-popup/overlay-position.ts` (INO-31 T-25 / INO-148), renamed
 * `popup`→`panel` throughout to match this component's own vocabulary, not a shared import: that
 * file's own doc comment anticipated this exact situation — "if a second consumer lands, promoting
 * this file (unchanged signature) to a shared location is a mechanical move, not a redesign" — but
 * DoD row 11 (merge hygiene) scopes this issue to
 * `web/src/app/components/popover/**` only; it cannot also touch `components/confirm-popup/**` to
 * do the promotion. Forking now and promoting later in a dedicated refactor issue keeps this
 * change mechanically reviewable against the DoD instead of quietly widening its diff.
 *
 * Deliberately NOT flip/shift/auto-placement middleware (à la Floating UI/Popper): one flip to the
 * opposite edge when the preferred side doesn't fit, then a viewport clamp. See SPEC.md §3 for why
 * that one-flip-plus-clamp behavior is still called "flip/shift collision handling" for this issue's
 * purposes, and what a fuller placement engine (cross-axis start/end variants, 12-way grid) would
 * add if a future issue needs it.
 */
export type InoOverlayPosition = 'top' | 'bottom' | 'left' | 'right';

export interface InoOverlaySize {
  width: number;
  height: number;
}

export interface InoOverlayPlacement {
  /** Distance from the viewport top, in CSS pixels — for a `position: fixed` element's `top`. */
  top: number;
  /** Distance from the viewport left, in CSS pixels — for a `position: fixed` element's `left`. */
  left: number;
  /** The side actually used, after the single opposite-side flip described above. */
  position: InoOverlayPosition;
}

const OPPOSITE: Record<InoOverlayPosition, InoOverlayPosition> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Whether `panel` fits entirely on `side` of `anchor` within `viewport`, ignoring cross-axis clamp. */
function fitsOnSide(
  side: InoOverlayPosition,
  anchor: DOMRect,
  panel: InoOverlaySize,
  viewport: InoOverlaySize,
  gap: number,
): boolean {
  switch (side) {
    case 'top':
      return anchor.top - gap - panel.height >= 0;
    case 'bottom':
      return anchor.bottom + gap + panel.height <= viewport.height;
    case 'left':
      return anchor.left - gap - panel.width >= 0;
    case 'right':
      return anchor.right + gap + panel.width <= viewport.width;
  }
}

/**
 * `top`/`left` (not logical `inset-block-start`/`inset-inline-start`) are correct here, not an
 * oversight — see SPEC.md §3 "Positioning is physical on purpose" (same reasoning as
 * `confirm-popup`'s SPEC.md §2). `anchor` comes from `getBoundingClientRect()`, which already
 * reports the anchor's true rendered position in viewport space regardless of `dir`; re-expressing
 * that physical measurement through a logical property would silently re-mirror it a second time
 * under `dir="rtl"` and misplace the panel.
 */
export function computeOverlayPlacement(
  anchor: DOMRect,
  panel: InoOverlaySize,
  preferred: InoOverlayPosition,
  viewport: InoOverlaySize,
  gap: number,
  margin = 8,
): InoOverlayPlacement {
  const position = fitsOnSide(preferred, anchor, panel, viewport, gap)
    ? preferred
    : fitsOnSide(OPPOSITE[preferred], anchor, panel, viewport, gap)
      ? OPPOSITE[preferred]
      : preferred;

  let top: number;
  let left: number;

  switch (position) {
    case 'top':
      top = anchor.top - gap - panel.height;
      left = anchor.left + anchor.width / 2 - panel.width / 2;
      break;
    case 'bottom':
      top = anchor.bottom + gap;
      left = anchor.left + anchor.width / 2 - panel.width / 2;
      break;
    case 'left':
      top = anchor.top + anchor.height / 2 - panel.height / 2;
      left = anchor.left - gap - panel.width;
      break;
    case 'right':
      top = anchor.top + anchor.height / 2 - panel.height / 2;
      left = anchor.right + gap;
      break;
  }

  // Cross-axis + edge clamp — the "shift" half of "flip/shift": once the flip above has picked a
  // side, still slide the panel along the viewport edge rather than letting it overhang, exactly
  // as Floating UI's shift() middleware does after its own flip() pass.
  const maxLeft = Math.max(margin, viewport.width - panel.width - margin);
  const maxTop = Math.max(margin, viewport.height - panel.height - margin);
  left = Math.min(Math.max(left, margin), maxLeft);
  top = Math.min(Math.max(top, margin), maxTop);

  return { top, left, position };
}
