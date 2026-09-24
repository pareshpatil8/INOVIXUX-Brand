/**
 * Anchored-overlay placement — shared by every overlay that positions a floating panel next to an
 * anchor element: `<ino-confirm-popup>` (INO-31 T-25 / INO-148), `<ino-popover>` (INO-31 T-23 /
 * INO-150), and `[inoTooltip]` (INO-31 T-22 / INO-149). Promoted to this shared module in INO-271
 * after the third consumer landed — until then `confirm-popup` owned the only copy and `popover`
 * carried a temporary fork (renamed `popup`→`panel`) scoped to its own DoD row 11 merge-hygiene
 * boundary. Both are gone now; this is the one `overlay-position.ts` and the one
 * `InoOverlayPosition`. See SPEC.md §1.
 *
 * A standalone pure function (not a class, not a DI-injectable) on purpose: no consumer needs to
 * inject anything to call `computeOverlayPlacement`, and a stateless function can't accumulate
 * per-consumer assumptions the way a shared service tends to.
 *
 * Deliberately NOT flip/shift/auto-placement middleware (à la Floating UI/Popper): one flip to the
 * opposite edge when the preferred side doesn't fit, then a viewport clamp. That covers every
 * anchored case in this design system today (a toolbar button or trigger near a viewport edge); a
 * full placement-strategy engine (cross-axis start/end variants, a 12-way grid) is scope for
 * whatever future consumer actually needs it, not this module. See SPEC.md §1.
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

/** Whether `overlay` fits entirely on `side` of `anchor` within `viewport`, ignoring cross-axis clamp. */
function fitsOnSide(
  side: InoOverlayPosition,
  anchor: DOMRect,
  overlay: InoOverlaySize,
  viewport: InoOverlaySize,
  gap: number,
): boolean {
  switch (side) {
    case 'top':
      return anchor.top - gap - overlay.height >= 0;
    case 'bottom':
      return anchor.bottom + gap + overlay.height <= viewport.height;
    case 'left':
      return anchor.left - gap - overlay.width >= 0;
    case 'right':
      return anchor.right + gap + overlay.width <= viewport.width;
  }
}

/**
 * `top`/`left` (not logical `inset-block-start`/`inset-inline-start`) are correct here, not an
 * oversight — see SPEC.md §1 "Positioning is physical on purpose". `anchor` comes from
 * `getBoundingClientRect()`, which already reports the anchor's true rendered position in viewport
 * space regardless of `dir`; re-expressing that physical measurement through a logical property
 * would silently re-mirror it a second time under `dir="rtl"` and misplace the overlay.
 */
export function computeOverlayPlacement(
  anchor: DOMRect,
  overlay: InoOverlaySize,
  preferred: InoOverlayPosition,
  viewport: InoOverlaySize,
  gap: number,
  margin = 8,
): InoOverlayPlacement {
  const position = fitsOnSide(preferred, anchor, overlay, viewport, gap)
    ? preferred
    : fitsOnSide(OPPOSITE[preferred], anchor, overlay, viewport, gap)
      ? OPPOSITE[preferred]
      : preferred;

  let top: number;
  let left: number;

  switch (position) {
    case 'top':
      top = anchor.top - gap - overlay.height;
      left = anchor.left + anchor.width / 2 - overlay.width / 2;
      break;
    case 'bottom':
      top = anchor.bottom + gap;
      left = anchor.left + anchor.width / 2 - overlay.width / 2;
      break;
    case 'left':
      top = anchor.top + anchor.height / 2 - overlay.height / 2;
      left = anchor.left - gap - overlay.width;
      break;
    case 'right':
      top = anchor.top + anchor.height / 2 - overlay.height / 2;
      left = anchor.right + gap;
      break;
  }

  // Cross-axis + edge clamp — the "shift" half of "flip/shift": once the flip above has picked a
  // side, still slide the overlay along the viewport edge rather than letting it overhang, exactly
  // as Floating UI's shift() middleware does after its own flip() pass.
  const maxLeft = Math.max(margin, viewport.width - overlay.width - margin);
  const maxTop = Math.max(margin, viewport.height - overlay.height - margin);
  left = Math.min(Math.max(left, margin), maxLeft);
  top = Math.min(Math.max(top, margin), maxTop);

  return { top, left, position };
}
