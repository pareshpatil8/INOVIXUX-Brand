# `<ino-megamenu>` — component spec

**Issue:** [INO-495](/INO/issues/INO-495) (INO-31 Phase B5, doc 26 §5 row `ino-megamenu`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. A menubar whose triggers open multi-column panels — PrimeNG's own shape, benchmark only

PrimeNG 22.1.1 `MegaMenu` is the benchmark (`specs/primeng/llms-22.1.1.txt`); nothing in this
directory imports it. The spec row's "multi-column panels; grouped links; icons" is a two-level
data shape: a flat array of top-level `InoMegaMenuItem`s, any of which may carry `columns`
(`InoMegaMenuColumn[]`), each column an optional `heading` plus a flat array of `InoMegaMenuLink`s.
There is no recursion below a column's links — unlike `ino-panel-menu`'s arbitrary-depth tree,
`ino-megamenu`'s panel is exactly two levels deep (column → link), matching every reference
mega-menu implementation surveyed (PrimeNG, a mega menu is never itself nested).

---

## 2. A11y: WAI-ARIA APG Menubar, one tab stop per bar, full Arrow/Esc map

`role="menubar"` on the top-level list, `role="menuitem"` on every trigger and panel link,
`role="menu"` on an open panel, `role="group"` on each column (`aria-labelledby` its heading id
when present). This is the APG **Menubar** pattern, not a plain `nav` disclosure list like
`ino-panel-menu` — the spec row explicitly asks for it ("APG menubar with grouped panels").

**Top-level bar** (one roving tab stop, `focusedIndex`):

| Key | Effect |
|---|---|
| `ArrowRight` / `ArrowLeft` (horizontal) or `ArrowDown` / `ArrowUp` (vertical) | Move the tab stop to the next/previous **non-disabled** top-level item, wrapping |
| `Home` / `End` | Jump to the first/last non-disabled top-level item |
| `ArrowDown` (horizontal) / `ArrowRight` (vertical), or `Enter`/`Space` | If the focused item has a panel: open it and move focus to its first link |
| `Escape` | If this item's panel is open: close it (focus stays on the trigger) |

**Open panel** (one roving 2D tab stop, `panelFocus: {column, row}`):

| Key | Effect |
|---|---|
| `ArrowDown` / `ArrowUp` | Move within the current column, wrapping |
| `ArrowRight` / `ArrowLeft` | Move to the same row in the adjacent column; at the panel's edge, close this panel and open the **adjacent top-level item's** panel instead (APG Menubar: moving past a submenu's edge continues along the bar) |
| `Home` / `End` | Jump to the first/last link in the current column |
| `Escape` | Close the panel and return focus to its trigger |
| `Tab` / focus leaving the panel | Closes the panel (`(focusout)` on the panel container, not a keydown branch — see §5) |

A disabled top-level item is skipped by `ArrowRight`/`ArrowLeft`/`Home`/`End` navigation
entirely (never becomes the tab stop). A disabled/readonly-inert **panel link** is NOT skipped —
it remains a reachable Arrow-key stop (consistent with the "structure stays browsable" contract
§6 gives `readonly`) but is unfocusable via `Tab` outside the roving set and does nothing on
activation.

---

## 3. `orientation` only flips which axis moves the bar vs. opens a panel

`horizontal` (default): the bar lays out left-to-right, `ArrowLeft`/`ArrowRight` move between
top-level items, `ArrowDown` opens a panel. `vertical`: the bar lays out top-to-bottom,
`ArrowUp`/`ArrowDown` move between top-level items, `ArrowRight` opens a panel. Inside an open
panel, `ArrowUp`/`Down`/`Left`/`Right` behave identically regardless of `orientation` — the
column/row grid is orthogonal to the bar's own axis, same as APG's vertical submenu convention.

---

## 4. Sizing: the bar composes with density; the panel always reads the fixed overlay-compact scale

The spec row's "compact/comfortable" sizing applies to the **bar** only — it is page-resident nav
content (a site header/menubar), not a popup, so `[data-size="compact"]` re-points
`--ino-megamenu-bar-*` to the `-sm` control tier exactly like `ino-panel-menu`'s own two-tier
scale, and both tiers are re-declared inside `tokens.css` §10's dense/fluid blocks so density
composes on top.

The **panel**, once open, is unambiguously an ephemeral overlay — it is absolutely positioned,
appears/disappears on open/close, and is never part of page flow. Its link rows read
`--ino-control-*-compact` directly (tokens.css §12's "space-efficient overlays" tier, the same one
`ino-context-menu`/`ino-menu` consume), independent of the `size` input. This is a deliberate split
within one component rather than one sizing model for both: the bar is subject to the same
page-density argument `ino-panel-menu`'s `SPEC.md` §5 makes, and the panel is subject to the exact
opposite argument that same section makes for *why* the compact-overlay tier exists.

---

## 5. `activeHref` drives "active-item", not router-derived state

The spec row's additional state beyond the §2 standard set is "active-item". Rather than having
the component read `Router.url` itself (coupling it to a specific router config and making it
untestable without one), `activeHref` is a plain `@Input()` the host page sets from whatever its
own "current route" source is. A top-level item or panel link whose `href` matches gets
`aria-current="page"` plus the bold `on-surface` treatment `ino-breadcrumb`'s current-page state
already uses (**not** an accent color — `--ino-color-accent` is non-text-safe per tokens.css §2,
and there is no reason to tint an element that already carries `aria-current`).

---

## 6. `readonly` disables navigation but never blocks opening a panel

Same contract `ino-panel-menu`'s `SPEC.md` §7 records for the same input: `[readonly]="true"`
renders every leaf — top-level plain items and panel links alike — as inert, unfocusable-by-click
text, while panel open/close keeps working, so the whole structure stays browsable. A leaf that
was never interactive (no `href`, no `command`) renders the same inert span regardless of
`readonly`; the input only has an effect on leaves that would otherwise have navigated or emitted.

---

## 7. No invalid/error state (B2/B5 deliberate omission)

The §2 standard state set includes invalid/error, but a mega menu has no bound value to
validate — it is a navigation structure, not a form control. No reference implementation defines
one either. Omitted entirely, same reasoning `ino-breadcrumb`'s `SPEC.md` §7 and
`ino-panel-menu`'s `SPEC.md` §8 record for the same state.

---

## 8. Hover-to-open is a deliberate omission

Many mega menus open a panel on mouse hover (with an intent delay) in addition to click/keyboard.
This implementation deliberately omits it: hover-intent timers are the thing that makes
`ino-context-menu`'s submenu logic the most complex code in that component, and a hover-only open
path has no keyboard equivalent to stay in parity with — every interaction this component supports
(click, Enter/Space, Arrow keys) already has one deterministic, testable trigger. A click-or-
keyboard-only mega menu is still a fully conformant APG Menubar; hover-opening is a progressive
enhancement, not a requirement of the pattern.

---

## 9. `columns`/`children`-shaped data stays a flat array, same reasoning as the B2 menu family

`items: InoMegaMenuItem[]`, `columns: InoMegaMenuColumn[]`, `column.items: InoMegaMenuLink[]` are
all plain data arrays rather than content-projected child components, for the same reason
`ino-panel-menu`'s `SPEC.md` §2 gives: a site's primary nav is usually built from route/permission
data at runtime, so a data-array API matches how callers already have it shaped.

---

## 10. Mobile: Web-only, per the spec row

The spec row's Notes/mobile disposition is explicitly "Web-only" — the same disposition doc 26
gives `ino-context-menu`/`ino-toolbar` for the same reason (a desktop/wide-viewport site-header
idiom with no small-screen equivalent). No React Native or Flutter port ships with this issue.
