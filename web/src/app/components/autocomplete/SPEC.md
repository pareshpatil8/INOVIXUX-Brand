# `<ino-autocomplete>` — component spec

**Issue:** INO-400 (INO-31 Phase B1, Form group)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5, `ino-autocomplete` row.
**Parity benchmark:** none named for this row; the closest PrimeNG precedent is `AutoComplete`
(`specs/primeng/llms-22.1.1.txt`), consulted only for naming (`forceSelection`,
`multiple`) — not installed, not a runtime dependency, same disclaimer `ino-select`'s and
`ino-multiselect`'s SPEC.md files carry.
**Depends on:** INO-152 (`<ino-select>`, T-9 — the shared overlay/`aria-activedescendant`/
grouping/virtual-scroll core) and INO-153 (`<ino-multiselect>`, T-10 — the toggle-and-stay-open/
chip-list core), both `done` before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Lineage: the deferred follow-up `ino-select`'s own SPEC.md §1 named

`ino-select`'s SPEC.md §1 scoped `AutoComplete` out explicitly: "server-side/async suggestion
source, multiple free-text tokens, debounced fetch — a different data contract (`options` as a
live-filtered async result, not a static array) from this component's synchronous client-side
filter." This issue builds exactly that component, reusing:

- **From `ino-select`:** the overlay open/close lifecycle, the `aria-activedescendant` keyboard
  model, option grouping (`group` field, run-boundary headings), and `<ino-virtual-scroller>`
  integration above `virtualScrollThreshold`.
- **From `ino-multiselect`:** the `multiple` value shape (a set of memberships, toggle-and-
  stay-open commit), the chip-list trigger rendering, and the "dim, don't lock in" cap rule
  (`maxSelected` here, `selectionLimit` there).

## 2. One component with a `multiple` flag, not two — unlike Select/MultiSelect

`ino-select`'s SPEC.md §1 deliberately split `MultiSelect` into its own component rather than a
boolean flag, because the two components' triggers render fundamentally different markup and their
commit models differ. This issue's own variant matrix (doc 26 §5) instead specifies `multiple` as
one input on a single `ino-autocomplete` component, and that call is followed here rather than
re-litigated, for a reason specific to this component: **the trigger markup difference between
single and multiple modes is smaller here than it was for Select/MultiSelect.** Both modes render
the *same* text `<input>` as the actual `role="combobox"` element (there is no non-editable button
mode at all, §5) — the only markup delta is an optional chip row rendered *before* that input, not
a wholesale swap of the interactive element itself. `value`/`valueChange` are therefore typed
`string | string[]`, narrowed at runtime by `multiple`, with one shared read path
(`valuesArray` getter) every selection/membership check uses.

## 3. Grouping and filtering — same run-boundary model, unchanged from `ino-select`

`InoAutocompleteOption` mirrors `InoSelectOption`/`InoMultiSelectOption` field-for-field (`label`,
`value`, `disabled?`, `group?`). `recomputeFiltered()` is the same trim/lower-case/substring match
on `label`, filtered against `queryText` (the live input text) rather than a separate filter-box
value — there is no separate "in-panel filter" input the way `filter` is on `ino-select`, because
here the trigger itself *is* the filter box; that is the whole point of an autocomplete.

## 4. Async datasource contract — `search` output, `options`/`loading` inputs, no Observable

This repo's convention (see `ino-select`'s own doc comment §6) is plain `@Input()`/`@Output()`
banana-in-a-box, never an Observable/Promise baked into a component. `options` stays exactly the
kind of static, synchronous array `ino-select`'s already is. The "live-filtered async result" the
deferred-follow-up note asked for is achieved entirely by composition, not a new data type:

1. Every debounced change to the typed query (`SEARCH_DEBOUNCE_MS = 250`, a plain `setTimeout`
   buffer — the same idiom `ino-select`'s typeahead buffer uses, just driving an output instead of
   an internal jump) fires `@Output() search: EventEmitter<string>`.
2. A parent listening to `search` runs its own fetch (however it wants — `HttpClient`, `fetch`,
   whatever), sets `loading = true` while it is in flight, and pushes the results back in through
   `@Input() options` when they arrive, then `loading = false`.
3. The component's own client-side filter (§3) still runs against whatever `options` currently
   holds — for a remote datasource the parent is expected to hand back an already-server-filtered
   array, so the client-side substring filter is effectively a no-op pass-through in that mode (it
   still applies harmlessly if the parent hands back a superset).

Nothing here imports `rxjs` beyond Angular's own transitive dependency, and no operator (`debounceTime`,
`switchMap`, etc.) is used — the debounce is the same `setTimeout`/`clearTimeout` pair `ino-select`'s
`typeahead()` already uses for its own buffer-reset timer.

## 5. `forceSelection` replaces `editable` — and only applies to single-selection

`ino-select` has two independent booleans, `editable` (trigger becomes free text) and `filter`
(separate in-panel search box) — SPEC.md §5 there explains why they stay separate. Neither applies
unmodified here: **this component's trigger is always a text input** (§2) — there is no
non-editable mode to opt into with a separate flag, so `editable` has no analogue at all.
`forceSelection` is the one knob this component needs instead, and it governs a narrower question:
given that the trigger is always editable, does unmatched typed text get accepted as the value
verbatim (`forceSelection: false`, default — same "falls back to free text" behavior `ino-select`'s
own `editable` commit path already has) or discarded (`forceSelection: true` — the value is cleared
and the query text reset, forcing the user back to picking a real option)?

**`multiple` never has a free-text commit path to force in the first place.** `ino-multiselect`'s
own SPEC.md §1 already ruled this out for its component ("a multi-select value is a set of discrete
memberships, not a single free-text token — there is no equivalent 'typed text becomes the whole
selection' operation... not merely omitted — structurally inapplicable"); the identical reasoning
applies here. In `multiple` mode, `queryText` is *only* ever a filter query — pressing Enter with no
matching active row is a no-op (`selectActive()`), and `forceSelection` is read nowhere in the
`multiple` branch of any commit path. This is a documented scoping decision, not a bug: the input
still accepts the flag (so a consumer flipping `multiple` on an existing single-mode binding does
not hit an unknown-input error), it is simply inert there.

**Commit points.** `forceSelection`'s match-or-clear check (`enforceForceSelection()`) runs on
three paths, all single-selection only: `Enter` with no active row (`commitQueryText()`, closes the
panel), blur via outside click (`onDocumentClick`), and `Tab` (`onTriggerKeydown`'s `'Tab'` case) —
the same three moments `ino-select`'s own editable trigger would need to but does not currently
enforce (see that component's SPEC.md §5, which only calls `commitEditableText()` from
`selectActive()`). This component intentionally enforces on all three rather than copying that gap
forward, because `forceSelection`'s whole contract ("must select a real option") would otherwise be
trivially bypassed by clicking away instead of pressing Enter.

## 6. `mode: 'dropdown' | 'inline'` — one state machine, two CSS renderings

Both modes share the exact same `open`/`activeIndex`/keyboard/filter state machine — `mode` is
purely a rendering decision, not a second interaction model. `'dropdown'` (default) is
`ino-select`'s anchored-overlay panel verbatim (`position: absolute`, border, box-shadow,
`z-index`, `--ino-elevation-neutral-3`). `'inline'` renders the identical listbox markup with
`.ino-field__panel--inline` overriding position to `static`, dropping the border/shadow/`z-index`,
so the suggestion list sits directly in the document's layout flow immediately under the input
instead of floating over whatever is below it. `open` still gates visibility in both modes (focus
opens it, `Escape`/outside-click/`Tab` close it) — this issue does not build a permanently-expanded
"always in the DOM regardless of focus" variant, since nothing in the variant matrix asks for one
and it is a strictly larger surface (focus-order and scroll-anchoring implications) than "the same
panel, unstyled as an overlay." The chevron (`▾`) is `dropdown`-only — an inline, in-flow list has
no floating panel for a chevron to gesture at opening/closing.

## 7. States — loading, no-results, max-selected

- **`loading`.** Suppresses *selection* only (`selectOption()`'s guard clause) — typing and the
  panel itself stay fully live, because the whole point of showing the spinner is that a parent's
  async `search` fetch is in flight and the user should still be able to keep typing to refine the
  query before results land. `aria-busy` is set on the trigger `<input>` itself (not a separate
  host attribute) since that is the one `role="combobox"` element assistive tech is already
  tracking.
- **`no-results`.** The empty-listbox branch (`emptyState` template) reads `emptyMessage`, which
  distinguishes three states rather than one flat "No options" string `ino-select`'s own empty
  state uses: `'Searching…'` while `loading`, `'No results found.'` once a non-empty query returns
  nothing, `'No options.'` for the genuinely empty starting state (no query typed, no `options`
  supplied yet). This is the one deliberate behavioral difference from `ino-select`'s single static
  empty message — an autocomplete's empty panel is reachable from three distinct causes a static
  select's never is, and collapsing them back into one string would make "still fetching" look
  indistinguishable from "definitely nothing matches."
- **`max-selected`.** `multiple` + `maxSelected` set + `value.length >= maxSelected`: every
  unselected row dims (`isRowNonInteractive`, same "dim, don't lock in" rule `ino-multiselect`'s
  `selectionLimit` §4 already documents — an already-selected chip can always be removed) and a
  `role="status"` paragraph ("Maximum N selected.") renders under the field, referenced by the
  trigger's `aria-describedby` whenever no `error`/`hint` is already claiming that slot. `role="status"`
  (not `role="alert"`) because reaching the cap is informational, not an error — the same severity
  distinction this component's own `error` (`role="alert"`) vs. `hint` (no live-region role) split
  already makes.

## 8. A11y contract

**Role/ARIA.** `role="combobox"` on the trigger `<input>` (always — §5), `aria-haspopup="listbox"`,
`aria-expanded`, `aria-controls` pointing at the listbox id, `aria-autocomplete="list"` (not
`"both"` — this component does not build inline ghost-text completion; typed text is never
autocompleted in-place, only the dropdown suggestions change, so `"list"` is the accurate value, not
an under-built `"both"`), `aria-activedescendant` pointing at the active row's id.
`aria-activedescendant`, not roving `tabindex` — same rationale `ino-select`'s SPEC.md §2 already
gives in full (the only model that also works through `<ino-virtual-scroller>`, where most rows are
not in the DOM); this file points there rather than re-deriving it. The popup is `role="listbox"`,
carrying `aria-multiselectable="true"` when `multiple` (same convention `ino-multiselect`'s SPEC.md
§2 documents, including its identical virtualized-path gap — `<ino-virtual-scroller>` has no
attribute passthrough for it below the threshold this is a non-issue).

**Keyboard.**

| Key | Closed | Open |
|---|---|---|
| Typing (any printable character) | Opens the panel, filters as it goes | Filters live, resets `activeIndex` to the first enabled row — there is no separate typeahead buffer (unlike `ino-select`'s non-editable trigger) because every keystroke is already driving the real-time filter |
| `ArrowDown` / `ArrowUp` | Opens panel, activates first/last enabled row | Moves `aria-activedescendant` to next/previous enabled row (clamped, no wrap) |
| `Home` / `End` | — | Jumps to first/last enabled row |
| `Enter` | Opens panel | Single: selects the active row and closes, or (no active row) commits typed text per `forceSelection` (§5). Multiple: toggles the active row's membership, panel stays open; no-op with no active row |
| `Escape` | — | Closes panel without changing `value` (typed text itself is left as-is, same as `ino-select`'s own Escape behavior — only an explicit commit changes `value`) |
| `Tab` | — | Single + `forceSelection`: enforces match-or-clear before closing. Otherwise: closes (no value change beyond what committed already), lets focus move on natively |

**Contrast/target-size/RTL.** Identical to `ino-select`'s own SPEC.md §2 endnotes — same audited
roles (`on-surface`, `on-surface-muted`, `on-surface-subtle`, `accent`, `accent-text-safe`,
`danger`), same `--ino-elevation-neutral-3` panel, same 44px/24px target floors, logical properties
only (no `left`/`right`/`top`/`bottom` in the stylesheet).

## 9. No `ControlValueAccessor`

Same `@Input() value: string | string[]` / `@Output() valueChange` banana-in-a-box convention as
every other Tier-1 form control in this repo (see `ino-input`'s doc comment) — no Reactive/
Template-driven Forms module wired up anywhere yet.

## 10. Mobile parity — shipped now, not deferred (unlike `ino-select`'s INO-258 split)

Per the issue's own instruction, both native ports ship in this issue:
`mobile/react-native/src/components/InoAutocomplete.tsx`,
`mobile/flutter/lib/widgets/ino_autocomplete.dart`. Both mirror `InoSelect`'s/`InoMultiSelect`'s
theming idiom exactly (`useTheme()`/`control[size]` on RN, `context.inoColors`/`InoControlSize` on
Flutter).

### 10a. What the ports carry

A text-input trigger (chip row + input in `multiple` mode, matching web §2), a modal bottom-sheet
suggestion list (same `ConfirmActionSheet`/`confirm_action_sheet.dart` idiom `ino-select`'s and
`ino-multiselect`'s own SPEC.md §9 already establish for this repo's mobile overlay pattern),
`size`, `disabled`/`loading`/`clearable`, the debounced `onSearch` callback (same 250ms window as
web), `forceSelection` (single mode), and `maxSelected` (multiple mode) with the same dim-not-lock
rule as web.

### 10b. What the ports deliberately do NOT carry

Same two omissions `ino-select`'s and `ino-multiselect`'s own ports declare, for the identical
reasons already written down there:

- **Option groups (the `group` field).** No native grouped-picker precedent exists in this repo's
  mobile tracks — `InoAutocompleteOption` on both tracks is a flat `{label, value, disabled}`.
- **Virtual scrolling.** The ports use `FlatList`/`ListView.builder`, which already window rows —
  same rationale `ino-virtual-scroller`'s own SPEC.md §1 gives for staying web-only.

One additional, `ino-autocomplete`-specific omission:

- **`mode="inline"` (§6).** Both ports only build the bottom-sheet suggestion list — there is no
  "listbox always in the layout flow below the input" rendering on either native track. A
  permanently-expanded inline list competes for vertical space against the on-screen keyboard in a
  way the bottom sheet idiom (already the ports' answer to that exact problem, per `ino-select`'s
  SPEC.md §9c) specifically avoids; building a second overlay idiom for one input value contradicts
  the reason the sheet idiom was chosen in the first place. Both ports behave as if `mode` were
  always `'dropdown'` (rendered as a sheet, per §9c below).

### 10c. One intentional visual divergence — bottom sheet, not anchored/inline panel

Identical divergence and reasoning to `ino-select`'s SPEC.md §9c / `ino-multiselect`'s SPEC.md §9c:
web's `dropdown` mode anchors the panel under the trigger (and `inline` sits in the layout flow);
both ports present the same suggestion list in a modal bottom sheet, because an anchored or
in-flow list under a text field collides with the software keyboard and the bottom safe area on a
phone. This is why the ports read `overlayScrim` (sheet backdrop) and `borderSoft` (grabber) —
roles web's autocomplete never touches. Unlike `ino-input`/`ino-datepicker`/`ino-select`/
`ino-multiselect`, web's autocomplete SCSS never reads `accent-active` in the first place (no
`:active` state styled on `.ino-field__control`), so there is no corresponding "drop" divergence
to declare here — only the two added roles. Both are declared in the registry (§11).

### 10d. Accessibility substitution

Neither platform has `combobox`/`listbox`/`option`/`aria-activedescendant`/`aria-multiselectable`
concepts, so §8's ARIA model has no direct equivalent: the trigger is a text input carrying the
expanded/busy state via each platform's own accessibility props, and each sheet row is a button
carrying `selected` — the same substitution `ino-select`'s and `ino-multiselect`'s own ports make.
Selected rows/chips get a `✓`/checkbox glyph in addition to the `accentTextSafe` tint and bold
weight, so colour is never the only cue (WCAG SC 1.4.1), matching both existing ports' §9d.

## 11. Registry

`scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` has one alphabetically-inserted entry for
`autocomplete` (first in the list, before `button` — no `alert` entry exists in the registry today),
with real `{ path, roles }` entries for both mobile tracks (built in this issue, not a follow-up —
§10) and the `overlayScrim`/`borderSoft` added-role divergence the `select`/`multiselect` entries
also declare, per §10c. The registry's stale-divergence assertion means those two cannot rot into
unexamined permissions.

---

## Files touched

- `web/src/app/components/autocomplete/ino-autocomplete.component.ts`
- `web/src/app/components/autocomplete/ino-autocomplete.component.html`
- `web/src/app/components/autocomplete/ino-autocomplete.component.scss`
- `web/src/app/components/autocomplete/SPEC.md` (this file)
- `docs/brand/06-angular-components/autocomplete.md`
- `docs/brand/06-angular-components/previews/autocomplete.html`
- `scripts/check-theme-parity.mjs` (one appended registry entry, §11)
- `mobile/react-native/src/components/InoAutocomplete.tsx`
- `mobile/flutter/lib/widgets/ino_autocomplete.dart`
