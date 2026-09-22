/**
 * Anchored-overlay placement — private to `<ino-confirm-popup>` (INO-31 T-25 / INO-148), not a
 * published service. It exists as a standalone pure function (not a class, not a DI-injectable)
 * specifically so Tooltip (T-22) and Popover (T-23) can import or fork it later without inheriting
 * any ConfirmPopup-specific state — YAGNI cuts the other way too: a generic public
 * `OverlayPositionService` with no second consumer yet would be speculative API to maintain. If a
 * second consumer lands, promoting this file (unchanged signature) to a shared location is a
 * mechanical move, not a redesign.
 *
 * Deliberately NOT flip/shift/auto-placement middleware (à la Floating UI/Popper): one flip to the
 * opposite edge when the preferred side doesn't fit, then a viewport clamp. That covers every
 * anchored-confirm case (a toolbar button near a viewport edge); a full placement-strategy engine
 * is scope for whatever a real Popover ends up needing, not this issue.
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

/** Whether `popup` fits entirely on `side` of `anchor` within `viewport`, ignoring cross-axis clamp. */
function fitsOnSide(
  side: InoOverlayPosition,
  anchor: DOMRect,
  popup: InoOverlaySize,
  viewport: InoOverlaySize,
  gap: number,
): boolean {
  switch (side) {
    case 'top':
      return anchor.top - gap - popup.height >= 0;
    case 'bottom':
      return anchor.bottom + gap + popup.height <= viewport.height;
    case 'left':
      return anchor.left - gap - popup.width >= 0;
    case 'right':
      return anchor.right + gap + popup.width <= viewport.width;
  }
}

/**
 * `top`/`left` (not logical `inset-block-start`/`inset-inline-start`) are correct here, not an
 * oversight — see SPEC.md §"Positioning is physical on purpose". `anchor` comes from
 * `getBoundingClientRect()`, which already reports the anchor's true rendered position in
 * viewport space regardless of `dir`; re-expressing that physical measurement through a logical
 * property would silently re-mirror it a second time under `dir="rtl"` and misplace the popup.
 */
export function computeOverlayPlacement(
  anchor: DOMRect,
  popup: InoOverlaySize,
  preferred: InoOverlayPosition,
  viewport: InoOverlaySize,
  gap: number,
  margin = 8,
): InoOverlayPlacement {
  const position = fitsOnSide(preferred, anchor, popup, viewport, gap)
    ? preferred
    : fitsOnSide(OPPOSITE[preferred], anchor, popup, viewport, gap)
      ? OPPOSITE[preferred]
      : preferred;

  let top: number;
  let left: number;

  switch (position) {
    case 'top':
      top = anchor.top - gap - popup.height;
      left = anchor.left + anchor.width / 2 - popup.width / 2;
      break;
    case 'bottom':
      top = anchor.bottom + gap;
      left = anchor.left + anchor.width / 2 - popup.width / 2;
      break;
    case 'left':
      top = anchor.top + anchor.height / 2 - popup.height / 2;
      left = anchor.left - gap - popup.width;
      break;
    case 'right':
      top = anchor.top + anchor.height / 2 - popup.height / 2;
      left = anchor.right + gap;
      break;
  }

  const maxLeft = Math.max(margin, viewport.width - popup.width - margin);
  const maxTop = Math.max(margin, viewport.height - popup.height - margin);
  left = Math.min(Math.max(left, margin), maxLeft);
  top = Math.min(Math.max(top, margin), maxTop);

  return { top, left, position };
}
