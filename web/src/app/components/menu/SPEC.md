# `<ino-menu>` — component spec

**Issue:** [INO-425](/INO/issues/INO-425) (INO-31 Phase B2, doc 26 §5 row `ino-menu`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).
**Parity benchmark:** PrimeNG 22.1.1 `Menu` (flat case) / `TieredMenu` (nested-submenu case) —
benchmarks only, nothing in this component imports either.

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be
written down rather than silently made.

---

## 1. `sections` is non-null-takes-precedence, not merge-with-`items`

`@Input() sections: InoMenuSection[] | null = null` and `@Input() items: InoMenuItem[] = []` are
not combined. Whenever `sections !== null` — including the degenerate case `sections = []` — the
component renders the grouped view exclusively and `items` is ignored entirely, even if `items`
is non-empty. This is a stricter rule than "non-empty sections wins": an explicitly-passed empty
array is a caller's deliberate "I'm managing sections, there happen to be zero of them right now"
signal (e.g. a sections array built from role-based permissions that evaluated to nothing this
render), and silently falling back to `items` in that case would show stale or wrong content. A
caller who wants the flat `items` form simply doesn't bind `[sections]` at all (its default is
`null`), the same "the absent input is the opt-out" convention `ino-popover`'s `target` input
uses.

---

## 2. Own positioning primitive, not `<ino-popover>`

Popup-mode placement, and nested-submenu placement, both call `computeOverlayPlacement`
(`../overlay/overlay-position.ts`, INO-271) directly rather than wrapping `<ino-popover>`.
`ino-popover` enforces `role="dialog"` plus a mandatory accessible name via `heading`/`ariaLabel`
and a different focus-containment contract (`[inoFocusTrap]`, which traps Tab/Shift+Tab inside a
single boundary) — semantically wrong for an APG `role="menu"`, whose own pattern is roving
`tabindex` with Arrow keys, not a Tab-trapped dialog. `ino-context-menu` (INO-427) makes the
identical call for the identical reason; this is now the second menu-shaped component to reach
for the overlay primitive directly instead of through popover, which is the signal that the split
was correct rather than two components independently reinventing the same wheel.

---

## 3. A single `<a role="menuitem">` per item, not a conditional `<a>`/`<div>` pair

Every item — whether or not it carries `href` — renders as one `<a>` element with an explicit
`role="menuitem"` override and `[routerLink]` bound to `item.href` (`null` when absent or
disabled, which removes the rendered `href` attribute and any router-driven navigation). This is
deliberately **not** `ino-breadcrumb`'s pattern of two sibling elements (`<a [routerLink]>` for a
navigable crumb, `<span>` otherwise) — a breadcrumb crumb's accessible role already matches its
tag (`link` for a link, implicit none for inert text), so a tag switch costs nothing semantically.
A menu item's role is always `menuitem` regardless of whether it happens to navigate, a leaf
action (`command`), or open a submenu (`children`) — switching tags per-variant would mean
re-asserting `role="menuitem"` on three different element shapes for no benefit, where one
element with one explicit role covers all three.

The consequence that has to be handled explicitly: a browser's native "Enter activates the
focused link" behavior requires a real `href` attribute, which an item without `item.href` never
has. Enter/Space are therefore handled in `onItemKeydown` by calling `item.command?.(item)` and,
when `item.href` is set, an explicit `this.router.navigateByUrl(item.href)` — the keyboard path
cannot rely on the anchor's own native click-on-Enter the way a plain hyperlink could. The click
path does **not** duplicate that `navigateByUrl` call; `[routerLink]`'s own click listener on the
same element already handles pointer-click navigation, and calling both would navigate twice.

---

## 4. State model: `openPath` + `focusedByDepth`, roving `tabindex` throughout

Unbounded nesting depth means "the currently open submenu" can't be a single boolean or a single
item reference the way `ino-context-menu`'s one-level-deep `openSubmenu: Item | null` is. State is
two parallel arrays, indexed by depth (root = 0):

- `openPath: InoMenuItem[]` — the chain of items whose submenus are open, root-first. Depth `d`'s
  visible item list is `d === 0 ? rootFlatItems : openPath[d-1].children`. Closing the submenu at
  depth `d` is exactly `openPath = openPath.slice(0, d - 1)`.
- `focusedByDepth: (InoMenuItem | undefined)[]` — which item holds the roving `tabindex="0"` at
  each depth. Depth `d`'s list always has **exactly one** entry with `tabindex="0"`; every other
  entry (including every item at a depth that isn't currently visible, i.e. inside a closed
  submenu) gets `tabindex="-1"` so it drops out of the page's Tab order without losing its place
  for when that level is reopened.

Roving `tabindex` is chosen over `aria-activedescendant` for the same reasons `ino-context-menu`
SPEC.md §6 gives: it composes with real DOM focus (so the focus-return and click-outside/
focus-leaving contracts below don't need a second "virtual focus" bookkeeping layer) and screen
readers announce the newly-focused item for free on every Arrow-key move.

---

## 5. Keyboard map (doc 26 §5's "full Arrow/Esc/typeahead map")

| Key | Behavior |
|---|---|
| `ArrowDown` / `ArrowUp` | Move roving focus to the next/previous non-disabled item in the current level, wrapping at the ends. |
| `ArrowRight` | If the focused item has `children`, open its submenu and move focus to the submenu's first enabled item. |
| `ArrowLeft` | If the focused item is inside a submenu (depth > 0), close just that submenu level and return focus to its parent item. No-op at depth 0 — there is nothing to close. |
| `Home` / `End` | Jump to the first/last enabled item in the current level. |
| `Enter` / `Space` | Activate: open the submenu if the item has `children` (same as `ArrowRight`); otherwise call `item.command?.(item)` and navigate `item.href` if present (§3). |
| `Escape` | If any submenu is open anywhere in the tree, close the deepest one and return focus to its parent (repeated `Escape` walks back up one level at a time). If nothing is open and `mode === 'popup'`, close the whole menu and return focus to `anchor`. No-op in `static` mode with nothing open. |
| any printable character | Type-ahead (below). |

**Type-ahead.** Appends to a case-insensitive buffer that resets 500ms after the last keystroke,
and moves focus (within the current level only — type-ahead does not cross submenu boundaries) to
the next enabled item whose label starts with the buffer, wrapping around and searching forward
from the currently-focused item. Repeating one single character (`"mmm"`) is special-cased to
cycle through every match for that one letter, rather than requiring the next item's label to
literally start with `"mmm"` — the conventional listbox/menu type-ahead behavior (seen in native
`<select>`, PrimeNG `Listbox`/`Menu`). This is the one piece of this keyboard map
`ino-context-menu` does not implement — that component's own spec row has no type-ahead
requirement; `ino-menu`'s row explicitly does.

---

## 6. Section separators and group labels are structural, not visual headings

A `role="separator"` renders between two sections (never before the first), matching
`ino-context-menu`'s separator-is-presentational-and-skips-navigation treatment. A labelled
section's wrapper is `role="group"` carrying `aria-label` — **and only `aria-label`**, no visible
heading text is rendered for the group's `label`. This is narrower than, say, a listbox `optgroup`
pattern that shows a visible section heading for sighted users too; it is deliberate here because
doc 26 §5's row scopes this component to "sections + icons," and the Component Publish Contract
decision for B2 was to expose `InoMenuSection.label` purely as the group's accessible name (so a
screen reader announces "File menu, group, N items" context) rather than also committing to a
rendered-heading visual design that no reference implementation in this catalog's benchmark set
(`PrimeNG Menu`'s `multiple`/grouped mode included) renders inline either way without a dedicated
template override. A visible section heading can be added later as a genuine visual variant once
a real consumer needs one — not speculatively now.

---

## 7. `size: 'compact' | 'comfortable'` re-points the bare `--ino-control-*` aliases

Per the spec row, there is no `sm`/`default`/`lg` axis. `comfortable` (the default, unmarked tier)
reads the bare `--ino-control-height/-padding-inline/-font-size/-icon-size/-gap` aliases directly
— the same "no size class needed for the default tier" convention `ino-toggle-button`'s own
default reads before its `sm`/`lg` overrides apply. `[data-size='compact']` re-points those same
five aliases to the `--ino-control-*-compact` tier (tokens.css §12, added this heartbeat for this
ticket, first consumed in this catalog by `ino-context-menu`/INO-427) — the exact re-point pattern
`ino-toggle-button.component.scss` lines ~1-28 use for its own size axis. Because the custom
properties are declared on `:host` and CSS custom-property inheritance is unaffected by
`display: contents` (popup mode's host display), the popup panel and every nested submenu — all
still DOM descendants of the host even though they render `position: fixed` — inherit the correct
tier for free without needing their own `[data-size]` attribute.

---

## 8. Empty state renders a placeholder item, not an empty `role="menu"`

Per doc 26 §2's "empty (where applicable)" state point: if the resolved item list (after
flattening `sections`/`items`, root level only) has zero entries, the menu renders one inert
`role="menuitem" aria-disabled="true"` entry reading `emptyLabel` ("No items" by default) instead
of a `role="menu"` container with no children. An empty `role="menu"` with no readable content is
indistinguishable, to a screen reader user, from a menu that failed to load — the placeholder item
makes "this menu genuinely has nothing in it right now" an announced, intentional state rather
than a silent gap. This is the one B2-standard state point `ino-context-menu`'s own SPEC.md didn't
need to cover (a context menu that would open with zero items simply doesn't open at all, per that
component's SPEC.md §7) — `ino-menu`'s static mode is always visible regardless of whether its
`items` ever populate, so "zero items" is a real, reachable, must-render state here.

---

## 9. No `readonly`/`loading` states (deliberate omission)

Same reasoning `ino-context-menu` SPEC.md §7 gives for its own omission of these two: a menu's
`items`/`sections` are an ephemeral, data-driven snapshot, not a bound form value with its own
read-only/loading lifecycle. A menu whose items aren't ready yet simply isn't rendered with
`[items]` bound yet (static mode) or isn't `show()`n yet (popup mode) — there is no intermediate
"this menu is loading" skeleton state for either shape. PrimeNG's `Menu`/`TieredMenu` have neither
input either.

---

## 10. No `invalid`/`error` state (deliberate omission)

Same reasoning as `ino-breadcrumb` SPEC.md §7 / `ino-context-menu` SPEC.md §8: a menu is not a
form control and has no bound value to validate against. The WAI-ARIA APG menu pattern defines no
error state. Omitted entirely.

---

## 11. Click-outside, focus-leaving and `Escape` close contract (popup mode only)

Three independent triggers close an open popup, all sharing the same focus-return behavior
(focus moves to `anchor`, or to whichever element was the event's `currentTarget` if `[anchor]`
wasn't bound and `show()`/`toggle()` inferred it from the triggering event — the same contract
`ino-context-menu` SPEC.md §3/§11 documents, adapted here to an `@Input() anchor` rather than a
directive-captured invoking target, since this component has no equivalent directive):

1. **Click outside.** A `document`-level `pointerdown` listener (added one macrotask after open,
   so the very click that opened the menu via `toggle()` doesn't immediately close it again —
   same guard `<ino-popover>`'s `activate()` uses) closes the menu when the event target is
   neither inside the popup panel nor inside the anchor element.
2. **Focus leaving the menu tree.** A `(focusout)` listener on the popup panel closes the menu
   when `event.relatedTarget` is not contained by that same panel — covers Tab-ing out of the
   menu via assistive technology that doesn't dispatch a `pointerdown` at all.
3. **`Escape`**, when no submenu is open (§5) — closes the whole menu rather than just a level.

`static` mode has none of this wiring: there is no "outside" to click away from, and nothing to
tab out of that would mean "close" rather than just "focus moved to the next thing on the page."

---

## 12. Submenus compute their own fixed position; no hover-to-open

Nested submenus are positioned via `computeOverlayPlacement` (preferred side `right`, `align:
'start'` — flush with the parent item's top edge, the same "dropdown flush-start" alignment
`overlay-position.ts`'s own doc comment names for `ino-datepicker`'s portal), recomputed once at
open time against the parent item's real `getBoundingClientRect()` and the submenu panel's real
rendered size. This is a stronger viewport-collision guarantee than `ino-context-menu`'s own
nested submenu, whose SCSS currently carries an explicit `// TODO: Add viewport-edge collision
detection for leftward flip` and always opens rightward; `ino-menu`'s own spec row's "full
Arrow/Esc/typeahead map" a11y bar made reusing the shared, already-flip-aware primitive the
correct choice here rather than repeating that TODO a second time.

Unlike `ino-context-menu`'s submenus (which open on `mouseenter` after a 200ms delay, a desktop
hover affordance appropriate to a right-click overlay), `ino-menu` opens a submenu only via click,
`Enter`/`Space`, or `ArrowRight` (§5) — doc 26 §5's row for this component lists "Arrow/Esc/
typeahead," not a hover-timing requirement, and a vertical sidebar menu (`mode="static"`'s primary
use case) staying open on casual mouse-over as the pointer passes through on its way elsewhere
would be a worse default than requiring a deliberate click/keypress.

---

## 13. Web-only, no mobile ports (deliberate scope)

Doc 26 §5's row says, verbatim, "Web-only (mobile uses action sheets)." Neither React Native nor
Flutter has a standard "anchored dropdown menu with nested submenus" idiom the way desktop web
does; both platforms' idiomatic equivalent for "open a menu of actions from a button" is a
bottom/full-screen action sheet — a different component shape (no nesting, no anchored
positioning, typically modal) that is out of scope for this ticket. Same "no native equivalent"
reasoning `ino-context-menu` SPEC.md §10 gives for its own web-only disposition. No RN/Flutter
files ship with this issue.
