# `<ino-breadcrumb>` — component spec

**Issue:** [INO-429](/INO/issues/INO-429) (INO-31 Phase B2, doc 26 §5 row `ino-breadcrumb`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Flat `items` array, not content-projected `<ino-breadcrumb-item>` children

Unlike `ino-select-button`'s parent/option split, a breadcrumb trail is driven entirely by a
single `items: InoBreadcrumbItem[]` @Input rather than composed child components. A trail is
usually built from route data at runtime (`[items]="trail()"` from a resolver or router event),
so a data-array API matches how callers already have the data shaped; a `<ng-content>`-projected
list of child components would force the caller to `*ngFor` the same array into template markup
for no behavioural benefit — there is no per-crumb visual variation complex enough to need its own
component class the way a select-button option's input/label pairing did.

---

## 2. The last item is always "current page," independent of `href`

`items[items.length - 1]` renders as inert text with `aria-current="page"` even if it carries an
`href`. There is no reason to link to the page already on screen, and the WAI-ARIA APG breadcrumb
pattern treats the current entry as non-interactive. Callers do not need to remember to omit
`href` from the last entry — the component ignores it unconditionally for that position.

---

## 3. Collapsed-middle overflow is "first + … + last two," not independently configurable

`maxVisible` is the single collapsing knob: once `items.length` exceeds both `maxVisible` and a
hard floor of 3, the trail collapses to the first item, an ellipsis trigger, and the last two
items (ancestor + current page). The shape itself (1 leading / 2 trailing) is fixed rather than
exposing separate `itemsBeforeCollapse` / `itemsAfterCollapse` inputs (MUI's `Breadcrumbs` pattern)
— B2 scope is "collapsed middle (…) overflow" from the spec row, not a fully generalized collapse
API, and "first + … + last two" is the shape every reference implementation (GitHub, Finder, MUI's
own default) converges on anyway.

The hard floor of 3 guards against a degenerate `maxVisible` (e.g. `1` or `2`) that would collapse
a trail into an ellipsis hiding zero items — `isCollapsed` requires `items.length > 3` as well as
`items.length > maxVisible`, so the hidden slice (`items.slice(1, lastIndex - 1)`) is always
non-empty whenever the ellipsis renders at all.

The hidden items render inside `<ino-popover>` (reused as-is, INO-150/INO-271) rather than a
hand-rolled overlay — the same anchored-panel primitive `ino-select-button`'s sibling B1 rows
reach for, keyed off the ellipsis button via `toggle($event)`.

---

## 4. Separators are generated CSS content, not DOM nodes

`.ino-breadcrumb__crumb:not(:first-child)::before { content: '/'; }` — the WAI-ARIA APG breadcrumb
pattern's recommended approach. A DOM separator node between every `<li>` would need its own
`aria-hidden` bookkeeping and would double the list's child count for zero semantic benefit; CSS
generated content is already outside the accessible tree. Logical properties only
(`margin-inline-end`), so the separator's position flips for free under `dir="rtl"` without a
dedicated RTL rule.

---

## 5. `readonly` disables navigation but leaves `current-page` unaffected

`[readonly]="true"` renders every non-current crumb as inert text (same `isNavigable()` guard that
already covers a per-item `disabled` or a missing `href`) while leaving the trail fully legible —
there is no visual dimming at the host level, mirroring `ino-select-button`'s "readonly stays
legible" rule (that component's SPEC.md §9) rather than `disabled`'s 0.6-opacity treatment. The
current-page item was never interactive to begin with (§2), so `readonly` has no additional effect
on it.

Unlike `ino-select-button`, there is no `aria-readonly` attribute anywhere — `nav` and `ol`/`li`
have no ARIA role that supports it — and, unlike `item.disabled`, a readonly-caused inert crumb
does not get `aria-disabled` either. `aria-disabled` is reserved for a crumb that is specifically
and individually disabled (an ancestor the trail wants to call out as unavailable); a crumb that is
merely non-navigable right now — because `readonly` is on, or because it never had an `href` to
begin with — renders as a plain, unfocusable `<span>` with nothing further to announce. A `<span>`
was never going to be read as a link or a control in the first place, so there is no affordance for
AT to be warned away from; marking it `aria-disabled` would claim a "disabled control" that was
never a control at all.

---

## 6. `loading` swaps in a skeleton trail rather than disabling `items`

`[loading]="true"` renders three placeholder bars instead of `items` (host `<nav>` carries
`aria-busy="true"`; the skeleton `<ol>` is `aria-hidden` and purely decorative) rather than, say,
rendering the real items with a shimmer overlay. The use case is a trail whose labels are still
resolving (an async route-title resolver) — at that point there usually isn't a correct `items`
array to render with reduced opacity; showing an honest "this isn't ready yet" skeleton avoids
briefly flashing stale or placeholder labels that `aria-busy` alone wouldn't suppress visually.

---

## 7. No invalid/error state (B2 deliberate omission)

The §2 standard state set includes invalid/error, but a breadcrumb has no bound value to validate
— it is a navigation landmark, not a form control. No reference implementation (PrimeNG, MUI, the
WAI-ARIA APG pattern) defines one either. Omitted entirely, same reasoning `ino-select-button`
recorded for the same state in its own SPEC.md §10.

---

## 8. "Sizing: one size" reads unsuffixed control tokens directly

Per the spec row, there is no `sm`/`default`/`lg` axis and therefore no `[data-size]` host
attribute. Every length reads the bare `--ino-control-*` alias (`-height`, `-gap`, `-font-size`,
`-icon-size`) with no size-class re-point block — the same tokens `ino-toggle-button` reads before
its own sm/lg overrides. Because tokens.css §12 redefines those unsuffixed aliases per
`[data-density]`, dense/fluid density behavior (§2 point 3) still composes for free without this
component needing to know density exists.

---

## 9. Router integration mirrors `ino-nav`'s convention exactly

`InoBreadcrumbItem.href` is an in-app route path bound via `[routerLink]`, not an arbitrary
external URL — the same contract `ino-nav`'s `InoNavLink.href` documents. A crumb without `href`
(a non-navigable ancestor, e.g. a disabled intermediate step in a wizard-like flow) renders as
plain text rather than a dead link.

---

## 10. Mobile ports

Both ports ship (per the row's "Port both (header nav)" disposition), reinterpreting two things
that have no mobile equivalent:

- **No popover for the collapsed-middle overflow.** Neither mobile UI toolkit treats an anchored
  popover as the idiomatic way to reveal a handful of hidden strings on a small screen; both ports
  expand the hidden items inline (in place of the ellipsis) on tap/press instead of opening an
  overlay — simpler than porting `ino-popover`'s positioning logic for a rarely-used affordance.
- **No Angular Router.** Both ports take a plain `onItemPress(item)` callback instead of a
  `routerLink`-equivalent; the host app wires that callback to its own navigation stack
  (`react-navigation`, Flutter's `Navigator`), matching how `InoSelectButton`'s ports already take
  plain callbacks rather than reaching for a specific navigation library.

**React Native** (`mobile/react-native/src/components/InoBreadcrumb.tsx`): a horizontal row of
`Pressable`/`Text` crumbs; `accessibilityRole="button"` per navigable crumb, the current crumb
rendered as a plain `Text` (no role), matching the web's "current page is never interactive" rule.

**Flutter** (`mobile/flutter/lib/widgets/ino_breadcrumb.dart`): a `Row` of `GestureDetector`-
wrapped `Text` crumbs; `Semantics(button: true)` per navigable crumb, the current crumb as plain
`Text`.

Both ports support icons, per-item `disabled`, the current-page item, and collapsed-middle
overflow (inline-expand variant). `readonly` and `loading` are web-only for this B2 issue — neither
port has a concept of "the page the trail describes is still being resolved," and `readonly` as a
whole-trail prop is a web-specific escape hatch for print/report views that don't apply to a
mobile screen.
