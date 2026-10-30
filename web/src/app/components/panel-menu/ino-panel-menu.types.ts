/** One node in a panel-menu tree. A node with `children` is a group — its `label` doubles as the
 * section label for that group (doc 26 §5 row `ino-panel-menu`, "Labels: section labels"). A node
 * without `children` is a leaf: `href` makes it an in-app route link (`routerLink`, matching
 * `ino-nav`/`ino-breadcrumb`'s convention); omit `href` for a command leaf that only emits
 * `(itemClick)`. See `SPEC.md` §1 for why this stays a flat recursive data input rather than
 * content-projected child components. */
export interface InoPanelMenuItem {
  label: string;
  /** Optional glyph rendered before the label, `aria-hidden` (same string-ligature convention as
   * `InoBreadcrumbItem.icon` / `InoSelectButtonOption.icon`). */
  icon?: string;
  /** In-app route path for a leaf node. Ignored on a group node (a group never navigates — only
   * its own expand/collapse control does). */
  href?: string;
  /** Renders the node as inert (`aria-disabled`); a disabled group cannot be expanded, which also
   * makes its `children` permanently unreachable through the UI — see `SPEC.md` §6. */
  disabled?: boolean;
  /** Nested nodes. Presence (even an empty array) is what makes a node a group instead of a
   * leaf — see `SPEC.md` §2 for why emptiness isn't special-cased. */
  children?: InoPanelMenuItem[];
}
