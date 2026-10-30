# `<ino-command-menu>` — component spec

**Issue:** [INO-433](/INO/issues/INO-433) (INO-31 Phase B2, doc 26 §5 row `ino-command-menu`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Nested `groups: InoCommandMenuGroup[]`, not a flat array with a `group` field

`ino-select`/`ino-autocomplete`/`ino-listbox` all drive grouping from a flat `options` array plus
a per-option `group?: string` field, inferring run-boundary headings from adjacency. A command
menu's catalog is the opposite shape: it is a small, curated, statically-composed set of sections
("Navigation", "Actions", "Settings") authored by the host app at build time, not a large flat
list fetched from a backend. A nested `InoCommandMenuGroup[]` (`{ heading?, items }`) matches how
the caller already has the data — "Navigation: [go home, go to settings, …]" — without first
flattening it into adjacency-sensitive rows and hoping no two unrelated groups ever end up
accidentally adjacent after a caller-side sort. It also makes an empty group a structural
non-event (`§2`'s filter just drops it) rather than something the adjacency-inference algorithm
has to special-case.

---

## 2. "Recent" disappears entirely once the query is non-empty

`recentItems` renders as a leading, unfiltered group only while `queryText` is empty. The moment
the user types one character, "Recent" drops out — it never participates in the filter, and it is
never shown filtered down to a subset. This matches every reference ⌘K implementation (VS Code,
Linear, GitHub, Raycast): "recent" answers "what was I just doing," which stops being a useful
answer the instant the user states what they are now looking for. Showing a filtered "Recent"
section would also require deciding whether a recent item matches by the same substring rule as
the main catalog — a second filtering concern for no benefit, since the regular `groups` filter
already covers that case for the same item if it is also cataloged there.

---

## 3. Combobox + `aria-activedescendant`, not roving-`tabindex`, inside the dialog

Per the spec row's a11y column ("combobox+listbox in dialog; focus trap reuse"): the search input
stays focused for the entire interaction, and the highlighted row is tracked purely via
`aria-activedescendant` — `ino-autocomplete`'s model, not `ino-listbox`'s roving-`tabindex` one.

This is not just stylistic parity with `ino-autocomplete`. Inside a focus-trapped dialog, the
trap's sentinel-wrapping logic (`[inoFocusTrap]`, T-11) needs to know the container's tabbable
elements, and the cleanest contract for that is "exactly one: the search input." If rows were
individually `tabindex="0"`/`"-1"` (roving-tabindex), `Tab` would need to be intercepted and
redirected back to the input on every row (defeating the trap's own generic sentinel mechanism),
or the trap would have to special-case "skip past listbox rows," which the shared primitive has no
reason to know about. Keeping rows non-tabbable and reusing `aria-activedescendant` means the trap
needs zero command-menu-specific logic — it already does the right thing for a container with one
tabbable child.

One consequence: unlike `ino-autocomplete`'s own trigger, this component's `Tab` key handler does
nothing (no `onInputKeydown` case for it) — `Tab` on the only tabbable element just hits the trap's
sentinel and wraps back to itself, which is correct: a command palette does not have a "tab past
the field to something else" affordance to begin with.

---

## 4. Dialog shell reuses `[inoFocusTrap]` directly, not `<ino-modal>` as a whole

`<ino-modal>` composes `<ino-card>` for header/footer/heading markup, a drag handle, and a
maximize toggle — none of which a command palette has any use for (it has no heading, no footer
actions, and is never dragged or maximized). Wrapping it would mean passing empty/unused inputs
through a component built for a different job. This component instead applies `[inoFocusTrap]`
directly to its own panel, exactly the way `<ino-modal>`'s own panel does, and reuses the same
scrim-click-to-dismiss / `Escape`-to-dismiss idioms without inheriting any of the rest.

The panel is also positioned differently on purpose: `padding-block-start: 12vh`, not
`align-items: center`. Every reference ⌘K implementation anchors near the top of the viewport, not
dead center — center-anchoring a search-first surface that is usually invoked while looking at
content lower on the page reads as the content "jumping," where a near-top anchor reads as a
command bar sliding in.

---

## 5. Global ⌘K/Ctrl+K hotkey lives on the component, opt-out via `[hotkey]="false"`

The component's host element stays in the DOM even while closed (only the dialog markup inside is
`*ngIf`'d), so a `(document:keydown)` host listener can open — or, pressed again, close — the
palette from anywhere, regardless of what currently holds focus. This is the behavior the spec
row's own name implies ("⌘K palette"); a command menu that only opens via an explicit button click
would not be the thing being asked for.

`hotkey` defaults to `true` but can be set `false` for two cases: a host app that wants its own
keybinding layer to decide when `openMenu()`/`requestClose()` fire (e.g. it also needs to suppress
the shortcut inside a third-party rich-text editor that wants `Ctrl+K` for "insert link"), or a
page that, for some reason, mounts more than one instance — only one of which should own the
global shortcut.

`event.preventDefault()` on a recognized hotkey suppresses the browser's own `Ctrl+K`/`⌘K`
handling (address-bar quick-search in some browsers) only on the keystroke this component
recognizes as an open/close toggle — never before classifying it, so `Ctrl+K` combined with
`Alt`/`Shift` (not part of this component's binding) is left untouched.

---

## 6. Filter matches `label` and `description`, not `shortcutLabel`

The client-side substring filter (case-insensitive, same `includes()` rule every other filterable
component in this repo uses) checks `item.label` and `item.description`. `shortcutLabel` (e.g.
`'⌘S'`) is excluded deliberately — it is a decorative hint (`aria-hidden`), not searchable text a
user would type to find a command, and including it would let typing a stray `"s"` surface every
row whose shortcut happens to contain that letter.

---

## 7. "Sizing: fixed" — no `size` input, no whole-component `disabled`/`readonly`/`invalid`

Per the spec row, this component has one fixed footprint (`max-inline-size: 640px`), not a
`sm`/`default`/`lg` axis — a command palette's width is a single product decision, not something
callers pick per invocation, unlike `<ino-modal>` (which hosts arbitrary caller content and
therefore needs a size to fit it).

The §2 standard state set includes `disabled`/`readonly`/`invalid`, but none apply at the
whole-component level: this is not a form control with a bound value to validate, disable, or
make read-only — it is an action surface, closer in kind to `<ino-menu>` than to `<ino-select>`.
Per-item `disabled` exists instead (`InoCommandMenuItem.disabled`), the same "the whole-component
state doesn't apply, but a row-level one does" reasoning `ino-breadcrumb`'s SPEC.md §7 recorded for
its own missing invalid state.

---

## 8. `empty-results` reuses `ino-autocomplete`'s loading/no-match message split

The spec row's extra state beyond the §2 standard set is `empty-results`. When `rows.length === 0`,
the listbox renders a single non-interactive message row instead of any `role="option"` content —
`'Searching…'` while `loading` is `true`, else `emptyMessage` (default `'No results found.'`).
Same two-message split `ino-autocomplete`'s `emptyMessage` getter already uses, so "still fetching"
is never confused with "genuinely nothing matched."

---

## 9. Web-only — no mobile port

Per the spec row's Notes column ("Web-only; flagship portal feature (§6)"). A ⌘K-style global
command palette is a desktop/keyboard-driven idiom with no mobile equivalent in this repo's ported
component set (no RN/Flutter component reaches for a global hardware-keyboard shortcut); mobile
command surfaces, if ever needed, would be a distinct product decision, not a port of this
component. Doc 26 §6 additionally names this component as the eventual engine behind the docs
portal's own search ("`ino-command-menu` (⌘K) as the portal's search once B2 lands") — wiring that
integration is explicitly out of scope for this issue, which delivers the reusable component
itself against the §2 contract.

---

## 10. Row activation uses `mousedown.preventDefault()`, same as `ino-autocomplete`'s options

A row's `click` handler fires `activateRow()`; `mousedown` on the same row calls
`$event.preventDefault()` first, preventing the browser's default mousedown-driven focus shift
away from the (always-focused) search input before the click handler runs — the exact race
`ino-autocomplete`'s own option rows guard against. Without it, a pointer-driven selection could
momentarily blur the input between mousedown and click, which has no effect here (nothing closes
on blur) but is kept for consistency with the rest of the tree's combobox rows.
