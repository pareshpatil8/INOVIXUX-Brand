/**
 * Menu item definition for ino-context-menu.
 */
export interface InoContextMenuItem {
  /** Visible label text */
  label?: string;

  /** Optional icon name (rendered before label, aria-hidden) */
  icon?: string;

  /** Callback invoked when this item is activated */
  command?: (event: { originalEvent: Event; item: InoContextMenuItem }) => void;

  /** Renders item as inert, skipped by keyboard navigation */
  disabled?: boolean;

  /** Renders a divider line instead of an actionable item */
  separator?: boolean;

  /** Nested submenu items */
  children?: InoContextMenuItem[];

  /** Arbitrary user data */
  data?: any;
}

/**
 * Template context for inline ino-context-menu definitions.
 */
export interface InoContextMenuContext {
  /** The menu items passed to the template */
  $implicit: InoContextMenuItem[];
}
