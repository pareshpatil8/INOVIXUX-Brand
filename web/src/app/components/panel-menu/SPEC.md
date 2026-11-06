# `<ino-panel-menu>` — component spec

**Issue:** [INO-431](/INO/issues/INO-431) (INO-31 Phase B2, doc 26 §5 row `ino-panel-menu`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. "Hybrid of Accordion and Tree" — PrimeNG's own description, verified against the benchmark

`specs/primeng/llms-22.1.1.txt`: "PanelMenu is a hybrid of Accordion and Tree components." That
is the whole shape: top-level nodes behave as accordion panels (single-open by default, each
labelled by its own `label` — the spec row's "Labels: section labels"), and any node — top-level
or nested — may itself carry `children`, recursing to arbitrary depth like a tree. PrimeNG is a
benchmark only; nothing in this directory imports it.

---

## 2. Recursive nested `ul`s via `ngTemplateOutlet`, not a flattened row list

`ino-treeselect` flattens its tree into a linear visible-row array before rendering (`SPEC.md`
precedent for that component), because it drives a single-tab-stop `aria-activedescendant`
listbox that needs a linear index for Arrow-key movement. `ino-panel-menu` has no such
requirement — see §4 — so there is no reason to give up real nested `<ul>` elements, and a real
nested element is exactly what a group's `aria-controls` needs to point at (a flattened row has no
container element of its own to reference). Two mutually-recursive `<ng-template>`s
(`#groupList`, `#row`) walk `InoPanelMenuItem.children` directly; a group's own nested content is
conditionally rendered only while `isExpanded(path)`, so a collapsed branch's rows are not in the
DOM at all (not just visually hidden) — cheaper for a large tree and unambiguous for assistive
tech.

`items` stays a flat, recursive **data** input (`InoPanelMenuItem[]`, each node optionally carrying
its own `children`) rather than content-projected `<ino-panel-menu-item>` children, for the same
reason `ino-breadcrumb`'s `SPEC.md` §1 gives: a menu tree is usually built from route/permission
data at runtime, so a data-array API matches how callers already have it shaped.

---

## 3. Single-open top-level accordion; nested groups independently toggleable; no cascade-clear on collapse

`path` is a stable index-path id (`"0"`, `"0-2"`, `"0-2-1"`, …) computed from each node's position,
used both as the `expanded`-state key and the `aria-controls`/group-container element id.

- **Top level (`level === 0`)**: opening one panel closes whichever other top-level panel was open
  — the classic accordion contract, and the literal meaning of "expanded per node" applied one
  level at a time. `multiple` (default `false`) lifts this, allowing every top-level panel open at
  once.
- **Any deeper level**: always independently toggleable regardless of `multiple` — a tree's
  branches don't exclude each other, and PrimeNG's own PanelMenu only applies its `multiple` flag
  to the top tier.
- **Collapsing never cascade-clears descendant state.** Closing "Section A" (manually, or because
  opening "Section B" forced it closed under the single-open rule) removes only `"0"` from the
  `expanded` set — `"0-1"`, if it was open, stays in the set. Re-opening "Section A" immediately
  shows "0-1" expanded again. This is the same "remember what was open" behaviour most OS file
  explorers and accordion components default to, and it is simpler to implement correctly than
  cascade-clearing (no subtree walk needed) — covered by the spec's "keeps a nested group expanded
  … after its parent collapses and reopens" test.

---

## 4. A11y: plain `nav` + disclosure pattern, not WAI-ARIA Tree View

The spec row explicitly leaves this open ("tree or disclosure semantics — decide in SPEC vs APG").
Decision: **disclosure**, not `role="tree"`/`"treeitem"`. Reasons:

- A `role="tree"` widget is a **single-tab-stop selection** control (`aria-activedescendant`,
  `Home`/`End`/typeahead, `aria-selected`) built for choosing one item from a hierarchy — it is the
  pattern `ino-treeselect` correctly uses because that component's whole job is picking a value.
  `ino-panel-menu` is a **navigation** structure (its leaves are router links or fire-and-forget
  commands); there is no "selected node" concept, and forcing every link into one shared tab stop
  would make every leaf two keystrokes further from focus than a plain anchor already is.
- Each group header is exactly the WAI-ARIA APG **Disclosure (Show/Hide)** pattern:
  `button[aria-expanded][aria-controls]` toggling a sibling content region. That pattern's only
  keyboard requirement is that the button itself is a real `<button>` (Enter/Space activate it
  natively) — no custom keydown handler is needed, and none is implemented.
- This mirrors `ino-nav`'s own mobile hamburger-panel disclosure groups (`mobileExpanded`,
  `toggleMobileGroup`) — the same pattern already shipped elsewhere in this design system for
  "collapsible groups of nav links," just generalized to unlimited depth and always-visible
  (no hamburger gate) here.
- Consequently: native tab order through every header/link/button, in document order, is the
  entire keyboard model. A collapsed group's links are simply not in the tab order because they
  are not in the DOM (§2) — correct disclosure behaviour, not an oversight.

Root is `<nav [attr.aria-label]="ariaLabel">` (default `"Panel menu"`, overridable for
localization/multiple-instances-per-page, same convention as `ino-breadcrumb.ariaLabel`). Every
`<ul>` carries `role="list"` to keep list semantics under the `list-style: none` reset VoiceOver
and some other ATs otherwise strip (the same fix already applied in `ino-nav`/`ino-inputtags`).

---

## 5. Sizing: "compact/comfortable" re-points the existing `-sm`/`-default` control tiers, not the density-invariant `-compact` tier

The spec row's two-tier scale ("compact/comfortable") is a **naming** match for the existing
`sm`/`default` tiers, not a cue to reach for `tokens.css` §12's `--ino-control-*-compact` tier.
That tier was added with `ino-menu`/`ino-context-menu` (INO-425/427) specifically because those are
**ephemeral overlay** menus whose own items are already the density control, so the tier is
deliberately **density-invariant** (never re-declared inside a `[data-density]` block — see the
tier's own doc comment in `tokens.css`). `ino-panel-menu` is page-resident nav content, the same
category `ino-nav` is in, not a popup — it should keep composing with `[data-density]` the way
`ino-nav`'s `.ino-nav--sm`/`--lg` already do (both `-sm` and `-lg` tiers *are* re-declared inside
both `[data-density="dense"]` and `[data-density="fluid"]` blocks in `tokens.css` §10).

`comfortable` (default) therefore reads the bare `--ino-control-*` aliases; `[data-size="compact"]`
re-points them to the `-sm` tier (height/gap/padding-inline-roomy/font-size/icon-size) — exactly
`ino-nav`'s `.ino-nav--sm` re-pointing shape, just keyed off a host attribute instead of a host
class. Dense/fluid density (§2 point 3's other half) composes for free either way, since both
tiers re-resolve under `[data-density]`.

---

## 6. Disabled group permanently hides its own children from the UI

`item.disabled` on a group renders its header `[disabled]` (removing it from the tab order
entirely, the native semantics a `<button disabled>` already provides — no extra
`tabindex="-1"` bookkeeping needed) and blocks `toggle()` from ever opening it. Its `children`
therefore never render. This is a deliberate, narrow scope decision: a disabled item (leaf or
group) is "not here right now," and a group that is "not here" has nothing to expand into — not a
state where the chrome opens but every descendant independently reports disabled. Matches
`InoPanelMenuItem.disabled`'s doc comment.

---

## 7. `readonly` disables leaf navigation, not group expand/collapse

`[readonly]="true"` renders every leaf as inert text (`isNavigable`/`isCommand` both gate on
`!this.readonly`) while groups remain fully togglable — the use case is "browse the structure
without being able to actually navigate away" (e.g. a print/export preview of a nav tree), and a
readonly tree that also can't be expanded would have nothing left to browse. Mirrors
`ino-breadcrumb`'s `SPEC.md` §5 "readonly disables navigation, trail stays legible" call, applied
to a tree instead of a flat list.

---

## 8. States: `loading` skeleton; no invalid/error (deliberate omission)

`loading` swaps in three `aria-hidden` skeleton bars (`nav[aria-busy="true"]`) instead of `items` —
same shape as `ino-breadcrumb`'s `SPEC.md` §6 loading skeleton, for the same reason: a menu tree
whose structure is still resolving (e.g. permission-gated nav loaded async) has no honest partial
`items` to render with reduced opacity.

The §2 standard state set includes invalid/error; omitted here for the same reason
`ino-breadcrumb`'s `SPEC.md` §7 omits it — a navigation menu has no bound value to validate, and no
reference implementation (PrimeNG, the WAI-ARIA APG Disclosure pattern) defines one either.

`empty` (`items.length === 0`, not `loading`) renders `emptyLabel` (default `"No items"`) in place
of the list.

---

## 9. Mobile: web-only (spec row disposition), no RN/Flutter port in B2

The spec row's Notes/mobile column reads "Web-only," the same disposition doc 26 itself gives
desktop-idiom components like ContextMenu and Toolbar. No React Native or Flutter port ships with
this issue.
