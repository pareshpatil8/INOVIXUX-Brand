# `<ino-context-menu>` — component spec

**Issue:** [INO-427](/INO/issues/INO-427) (INO-31 Phase B2, doc 26 §5 row `ino-context-menu`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Directive-based target binding, not imperative service API

The component attaches via `inoContextMenu` directive on the target element rather than a
service-based `.show(x, y)` imperative API. `<div [inoContextMenu]="menuRef">` mirrors
PrimeNG's own `pContextMenu` directive pattern and is more declarative than calling a service
from a `(contextmenu)` handler — the directive subscribes to the target's `contextmenu` event
internally, calls `event.preventDefault()`, and opens the menu anchored to the cursor position.

The directive accepts either a `TemplateRef<InoContextMenuContext>` (for inline menu definitions)
or a `ComponentRef<InoContextMenuComponent>` (for component-based menus declared elsewhere in the
template).

---

## 2. Cursor-anchored positioning, not target-element-anchored

Unlike `<ino-popover>` (which anchors to its trigger element's bounding box), the context menu
opens at `(event.clientX, event.clientY)` — the exact cursor position where the right-click
occurred. This is the universal context-menu pattern (OS context menus, browser devtools,
PrimeNG, every reference implementation) and is distinct from dropdown/popover positioning.

The overlay uses `position: fixed` with explicit `top`/`left` from the event coordinates, plus
viewport-edge collision detection: if the menu would overflow the right or bottom edge, it flips
to open leftward or upward from the cursor instead.

---

## 3. Focus trap with explicit return to the invoking target

On open, focus moves to the first menu item (WAI-ARIA APG menu pattern requirement). The menu
implements a focus trap: Tab/Shift+Tab cycle within the menu's items rather than escaping to the
rest of the page. Escape or clicking outside closes the menu and **returns focus to the element
that invoked it** — the `inoContextMenu` directive's host element, captured via
`document.activeElement` at the instant before the menu opens.

This "focus return contract" (spec row's a11y dimension) is critical for keyboard-only users: if
focus is lost on close, they have no way to regain context without tabbing from the start of the
page. The return target is stored in the directive, not in the menu component itself, because the
menu may be declared as a sibling or ancestor in the template tree rather than a child of the
trigger.

---

## 4. Nested submenus open on hover (desktop) or first click (touch)

A menu item with `children: InoContextMenuItem[]` renders a `>` chevron and opens a nested
submenu. On desktop (pointer-fine), the submenu opens on `mouseenter` of the parent item after
a 200ms delay (the same affordance PrimeNG uses); `mouseleave` closes it after the same delay,
unless the cursor moves into the submenu itself. On touch devices (pointer-coarse), the first
tap of a parent item opens its submenu without navigating; a second tap is required to activate
the item's own `command` if it has one.

Submenus anchor to the right edge of the parent menu by default, flipping leftward if the
right-anchored position would overflow the viewport. Vertical alignment matches the parent item's
top edge. Nesting depth is unbounded (the spec row says "nested," not "one level") — three or
four levels is uncommon but supported.

---

## 5. `items` array API, not content-projected children

Menu structure is defined via `items: InoContextMenuItem[]` rather than
`<ino-context-menu-item>` child components. This matches PrimeNG's `model: MenuItem[]` and
keeps menu definitions data-driven — a common use case is building a context menu from a
row/entity's permissions at runtime (`[inoContextMenu]="buildMenuForRow(row)"`), where
projecting children would force the caller to wrap a computed array in `*ngFor` for no gain.

The `InoContextMenuItem` interface supports:
- `label: string` — visible text
- `icon?: string` — optional leading glyph (aria-hidden)
- `command?: (item) => void` — callback on activation
- `disabled?: boolean` — inert item, skipped by keyboard navigation
- `separator?: boolean` — renders a divider line instead of an actionable item
- `children?: InoContextMenuItem[]` — nested submenu

---

## 6. Roving `tabindex` for keyboard navigation, not `aria-activedescendant`

Arrow keys (Up/Down) move a roving `tabindex="0"` between menu items rather than using
`aria-activedescendant` to point at the current item from a container with `tabindex`. The WAI-ARIA
APG menu pattern lists both as valid techniques; roving focus is chosen here because:
- It composes with the focus trap without additional wiring (the focused item is the real
  `document.activeElement`, so the trap's boundary check is straightforward).
- Screen readers announce the newly-focused item automatically on Arrow-key navigation without
  needing `aria-live` assertions.
- PrimeNG's own `Menu` uses roving focus, so this choice maintains consistency with the
  benchmark.

Right Arrow opens a submenu (if the focused item has `children`); Left Arrow closes the current
submenu and returns to its parent. Home/End jump to the first/last non-separator, non-disabled
item in the current menu level.

---

## 7. No `readonly` or `loading` states (deliberate omission)

The §2 standard state set includes `readonly` and `loading`, but context menus are ephemeral
overlays invoked by user action (right-click) — they do not have a persistent "this menu is
loading its items" or "this menu is display-only" mode the way a form control does. A context
menu whose items are not yet known simply does not open until the items are ready; there is no
intermediate "loading skeleton" state for an overlay that hasn't been triggered yet.

PrimeNG's `ContextMenu` has no `readonly` or `loading` input either. Both states are omitted.

---

## 8. No `invalid`/`error` state (deliberate omission)

Same reasoning as `ino-breadcrumb` SPEC.md §7: a context menu is not a form control and has no
bound value to validate. The WAI-ARIA APG menu pattern defines no error state. Omitted entirely.

---

## 9. "Sizing: compact" reads compact-mode control tokens directly

Per the spec row, there is no `sm`/`default`/`lg` axis. The menu reads
`--ino-control-height-compact`, `--ino-control-gap-compact`, `--ino-control-font-size-compact`,
and `--ino-control-padding-inline-compact` (the same tokens `ino-menu` will read) with no size-
class variation. These compact tokens are chosen unconditionally rather than reading the
unsuffixed aliases because context menus are always space-efficient overlays — they never appear
in a dense-mode table row or a fluid-height form, so they do not need density composition.

---

## 10. Web-only, no mobile ports (deliberate scope)

The spec row's "Notes / mobile" column says "Web-only." Mobile platforms have native context-menu
equivalents (iOS long-press action sheets, Android context menus) that are not implemented as web
overlays, and neither React Native nor Flutter has a standard "right-click menu" idiom (touch
devices trigger context actions via long-press gestures that open platform-native sheets).

Porting this component to RN/Flutter would require either (a) wrapping the platform's native
context-menu APIs (which are not visually themeable to match the design system) or (b) building
a custom long-press-triggered overlay (which would feel non-native and be a11y-complex on mobile).
Both are out of scope for B2. No ports ship.

---

## 11. Click-outside and Escape close the menu

Clicking anywhere outside the menu's overlay (including on the page body or another focusable
element) closes the menu and returns focus to the invoking target. Escape also closes the menu
with the same focus return. This mirrors every context-menu reference implementation and is part
of the WAI-ARIA APG menu pattern's expected keyboard behavior.

If a nested submenu is open, Escape first closes that submenu (returning to the parent menu level)
and only closes the root menu on a second Escape press. Click-outside always closes the entire
menu tree in one action.

---

## 12. `aria-label` on the menu container, not the trigger

The root `<div role="menu">` overlay carries `aria-label="Context menu"` (or a localized
override via an optional `ariaLabel` input). The invoking target element (the directive's host)
does not receive any ARIA attribute from the directive — it is whatever role it already had
(a table row, a list item, a paragraph), and the fact that it can open a context menu is
communicated via the OS/browser's own context-menu affordance (right-click cursor, long-press
feedback) rather than via ARIA.

---

## 13. Separator items are presentational, skip keyboard navigation

A menu item with `separator: true` renders a `<div role="separator">` (horizontal rule) instead
of a `<div role="menuitem">`. These separators are skipped by Arrow-key navigation (Up/Down moves
to the next non-separator item) and never receive focus. This matches the WAI-ARIA APG menu
pattern's guidance on separators.

