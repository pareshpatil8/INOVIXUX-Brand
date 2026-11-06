/**
 * Action item definition for ino-speeddial.
 */
export interface InoSpeedDialItem {
  /** Accessible name and visible tooltip label for the action (required) */
  label: string;

  /** Icon glyph rendered inside the action button (aria-hidden; label carries the name) */
  icon?: string;

  /** Callback invoked when this action is activated */
  command?: (event: { originalEvent: Event; item: InoSpeedDialItem }) => void;

  /** Renders the action as inert: aria-disabled, skipped by keyboard navigation, not activatable */
  disabled?: boolean;

  /** Arbitrary user data */
  data?: unknown;
}

/** Expansion layout: a straight row/column, a full circle, or a 90° arc. */
export type InoSpeedDialType = 'linear' | 'circle' | 'quarter-circle';

/**
 * Expansion direction. `up`/`down`/`left`/`right` apply to `linear`;
 * the corner values (`up-left` …) apply to `quarter-circle` and name the
 * quadrant the arc opens into. `circle` ignores direction.
 */
export type InoSpeedDialDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

/** FAB size scale (doc 26 §5 row: fab sm/md/lg). Actions keep one fixed size. */
export type InoSpeedDialSize = 'sm' | 'md' | 'lg';
