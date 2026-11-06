/**
 * One dock item. `icon` is a glyph (aria-hidden; `label` carries the accessible name and the
 * visible hover/focus tooltip-style label — see SPEC.md §6).
 */
export interface InoDockItem {
  /** Stable identifier. Required to drive `activeId` (SPEC.md §5 "active-item"); optional
   *  otherwise. */
  id?: string;

  /** Accessible name AND the visible hover/focus label text (required). */
  label: string;

  /** Icon glyph rendered inside the button (aria-hidden). */
  icon?: string;

  /** Overrides the hover/focus label text without changing the accessible name — e.g. a
   *  shorter icon caption than the full `aria-label`. Falls back to `label`. */
  tooltip?: string;

  /** Renders the item as inert: `aria-disabled`, skipped by keyboard roving navigation and
   *  magnify-on-hover, not activatable (same contract as `ino-speeddial`'s disabled action). */
  disabled?: boolean;

  /** Callback invoked when this item is activated (click or Enter/Space on the focused item). */
  command?: (event: { originalEvent: Event; item: InoDockItem }) => void;

  /** Arbitrary user data. */
  data?: unknown;
}

/** Layout axis (doc 26 §5 row "ino-dock"): `bottom` lays items out as a horizontal row,
 *  `side` as a vertical column. The component never fixes itself to the viewport — like
 *  `ino-speeddial`, the consumer anchors the host (SPEC.md §2). */
export type InoDockPosition = 'bottom' | 'side';

/** Icon/button size (doc 26 §5 row: "icon sm/md/lg"). Fixed px geometry, not the shared
 *  `InoControlSize` token scale — see SPEC.md §3 for why. */
export type InoDockSize = 'sm' | 'md' | 'lg';
