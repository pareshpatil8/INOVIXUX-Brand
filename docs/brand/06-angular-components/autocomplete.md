# `<ino-autocomplete>` — AutoComplete

> Parity benchmark: none named for this row (doc 26 §5); the closest PrimeNG precedent is
> `AutoComplete` (`specs/primeng/llms-22.1.1.txt`), consulted only for naming
> (`forceSelection`, `multiple`) — **not a runtime dependency**.
>
> Preview: [`previews/autocomplete.html`](previews/autocomplete.html).
> Decisions record: `web/src/app/components/autocomplete/SPEC.md`.

Text-driven suggestion combobox — the deferred `AutoComplete` follow-up `<ino-select>`'s own doc
comment named: a server-side/async suggestion source, debounced fetch, synchronous client-side
filter against whatever `options` currently holds. Builds on the overlay +
`aria-activedescendant` + option-grouping + virtual-scroll core `<ino-select>` established
(INO-152, T-9), and reuses `<ino-multiselect>`'s (INO-153, T-10) toggle-and-stay-open / chip-list
pattern for `multiple`. Follows this repo's `@Input() value` / `@Output() valueChange`
banana-in-a-box convention (see `ino-input`'s doc comment) rather than a `ControlValueAccessor`.

**Scope of this issue:** single `ino-autocomplete` component with a `multiple` flag, not a
Select/MultiSelect-style split — see [Deliberate omissions](#deliberate-omissions) and SPEC.md §2.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered via `<ino-label>` |
| `options` | `InoAutocompleteOption[]` | `[]` | `{ label, value, disabled?, group? }` — identical shape to `InoSelectOption` |
| `value` | `string \| string[]` | `''` | `string` (single, default) or `string[]` (`multiple: true`). Banana-in-a-box with `valueChange` |
| `placeholder` | `string` | `'Type to search…'` | Shown while the trigger is empty |
| `hint` | `string` | `''` | Hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; renders a `role="alert"` message |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | See [Size API](#size-api) |
| `required` | `boolean` | `false` | Decorative `*` marker on the label |
| `disabled` | `boolean` | `false` | Trigger removed from focus order |
| `readonly` | `boolean` | `false` | Trigger stays focusable; panel never opens |
| `loading` | `boolean` | `false` | Suppresses row selection only — typing/the panel stay live. See [States](#states) |
| `clearable` | `boolean` | `false` | Adds an inline "clear" button when there is a value/query to clear |
| `multiple` | `boolean` | `false` | `true` renders a checkbox multi-value listbox with chip display, reusing `ino-multiselect`'s toggle-and-stay-open model. See SPEC.md §2 |
| `mode` | `'dropdown' \| 'inline'` | `'dropdown'` | `'dropdown'` is the standard anchored overlay; `'inline'` renders the same listbox in flow, directly under the input, with no overlay chrome. See SPEC.md §6 |
| `forceSelection` | `boolean` | `false` | Single mode only. `true` discards unmatched typed text on commit (Enter/blur/Tab) instead of accepting it verbatim. See [Force selection](#force-selection) |
| `maxSelected` | `number \| null` | `null` | `multiple` only. Hard cap on `value.length` — see [Max selected](#max-selected) |
| `virtualScrollThreshold` | `number` | `100` | Filtered row count at/above which rendering switches to `<ino-virtual-scroller>` |

`valueChange: EventEmitter<string | string[]>` fires on every commit/toggle/clear.
`search: EventEmitter<string>` fires `250ms` after the last keystroke in the query text — the
async-datasource hook (see [Async datasource](#async-datasource)). Does not fire on selection,
only on text changes.
`openChange: EventEmitter<boolean>` fires when the panel opens/closes.
`clear: EventEmitter<void>` fires when the clear button is used.

### Size API

Reads the same `--ino-control-height` / `--ino-control-padding-inline` / `--ino-control-font-size`
alias set as `ino-input`/`ino-select`/`ino-multiselect`, applied to the trigger. Option rows do not
re-scale with `size` — they track `--ino-row-min-height`/`--ino-target-comfortable` directly, the
same density-driven floor `ino-select`'s/`ino-multiselect`'s option rows use.

### Density

`[data-density="dense"|"fluid"]` re-resolves `--ino-row-min-height`, which both the trigger and
every option row's `min-block-size` read (falling back to `--ino-target-comfortable` outside any
density ancestor) — identical to `ino-select`/`ino-multiselect`.

### Grouping

`InoAutocompleteOption.group?: string` — a run of consecutive options sharing the same `group`
value renders under one heading; the caller keeps grouped options adjacent (the component does not
sort). Identical model to `ino-select`'s `group` field — see its own doc / SPEC.md §3.

### Async datasource

`options` stays a static, synchronous array, exactly like `ino-select`'s. The "live-filtered async
result" an autocomplete needs is achieved by composition, not a new data type: every debounced
change to the typed query fires `search`; a parent listening to it runs its own fetch, sets
`loading = true` while in flight, and pushes results back in through `options` when they arrive.
The component's own client-side substring filter still runs against whatever `options` currently
holds — for a remote datasource the parent is expected to hand back an already-server-filtered
array, so the filter is effectively a no-op pass-through in that mode. See SPEC.md §4.

### Force selection

Given that the trigger is always an editable text input (there is no non-editable mode, unlike
`ino-select`), `forceSelection` governs whether unmatched typed text gets accepted as the value
verbatim (`false`, default — same "falls back to free text" behavior `ino-select`'s own `editable`
commit path has) or discarded, clearing the value and resetting the query text (`true` — the user
must pick a real option). Single-selection only: `multiple`'s query text is only ever a filter
query, never a value to commit — see SPEC.md §5. Enforced on three commit paths: `Enter` with no
active row, blur via outside click, and `Tab`.

### Max selected

`multiple` only. Once `value.length` reaches `maxSelected`, every unselected row (visually, not via
`option.disabled`) dims and stops responding to clicks/keyboard activation — already-selected rows
(and chips) stay fully interactive so a selection can always be removed to free up room. Same
"dim, don't lock in" rule `ino-multiselect`'s `selectionLimit` uses. See [States](#states),
SPEC.md §7.

### Variants

| Axis | Values |
|---|---|
| Selection | Single (default) or multiple (`multiple`, chip-list trigger) |
| Panel rendering | Anchored overlay (default, `mode="dropdown"`) or in-flow (`mode="inline"`) |
| Datasource | Static `options` (default) or async, via the debounced `search` output |
| Options | Plain list (default), grouped (`group` field), or virtualized (`virtualScrollThreshold`, reuses T-3) |
| Commit strictness | Free text accepted (default) or forced to a real option (`forceSelection`, single only) |

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Trigger border, transparent option rows |
| Hover | `:hover` | Trigger border darkens; option row gets a `surface-sunken` fill |
| Focus-visible | `:focus-visible` on the trigger `<input>` | `--ino-focus-ring` / `--ino-focus-ring-offset` on the trigger; the *active* row (not DOM-focused, see [Accessibility contract](#accessibility-contract)) gets an inset focus-ring outline instead |
| Disabled | `disabled` input | Trigger `opacity: 0.5`, removed from focus order; panel never opens; chip remove buttons disabled |
| Readonly | `readonly` input | Trigger stays focusable, panel never opens |
| Invalid | `error` input set | Trigger border → `--ino-color-danger`, `aria-invalid="true"` |
| Loading | `loading` input | Trailing spinner on the trigger, `aria-busy` on the trigger `<input>`; typing/the panel stay live, only row selection is suppressed |
| Open / closed | `open` (internal) | Panel renders (`mode="dropdown"`: anchored overlay; `mode="inline"`: in document flow) or is absent |
| No results | Panel open, `filteredRows` empty | Empty-state message distinguishes three causes: `'Searching…'` (`loading`), `'No results found.'` (non-empty query, no match), `'No options.'` (nothing typed, no options yet) |
| Max selected | `multiple` + `maxSelected` reached | Unselected rows dim and stop responding to activation; a `role="status"` "Maximum N selected." message renders under the field |

There is no separate "active/pressed" trigger state the way `ino-select`'s button trigger has —
this component's trigger is a plain text `<input>`, whose own `:active` is not styled (see
[Deliberate omissions](#deliberate-omissions) and SPEC.md §10c).

---

## Motion

Identical to `ino-select`/`ino-multiselect`: panel open (`mode="dropdown"`) uses
`translateY(-4px)` → `0`, opacity `0` → `1` on `--ino-motion-duration-fast` /
`--ino-motion-easing-decelerate`, gated by `@media (prefers-reduced-motion: no-preference)`.
`mode="inline"` has no entrance animation (no overlay chrome to animate in). The chevron rotation
(`dropdown` mode only) uses `--ino-motion-duration-fast` / `--ino-motion-easing-standard` in its
own `reduce` guard. The loading spinner uses `--ino-motion-duration-slow` linear rotation.

---

## Labels and fields

`label` renders through the shared `ino-label` leaf (`[required]` for the decorative `*`,
`[invalid]="!!error"` for the danger treatment). `placeholder` shows in the trigger while it is
empty (single mode) or while no chips are selected (multiple mode). `hint`/`error` render as a
paragraph under the field — `error` taking priority, both wired via `aria-describedby` — and
`error` also sets `aria-invalid` and the field's danger border. Each selected chip (multiple mode)
carries its own per-chip `aria-label="Remove <label>"` on the remove button, independent of the
field-level label. `<ino-autocomplete>` composes with the standalone `<ino-floatlabel>`/
`<ino-iftalabel>` wrapper components the same way every other Tier-1 form control does — it does
not build float/ifta label modes itself.

---

## Accessibility contract

**Role / ARIA** — WAI-ARIA APG combobox pattern, `aria-activedescendant` variant (SPEC.md §8, same
rationale `ino-select`'s own spec gives — the only model that also works through
`<ino-virtual-scroller>`). `role="combobox"` on the trigger `<input>` (always — the trigger has no
non-editable mode), `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` pointing at the
listbox id, `aria-autocomplete="list"` (not `"both"` — there is no inline ghost-text completion;
only the dropdown suggestions change), `aria-activedescendant` pointing at the active row's id. DOM
focus never enters the panel. The popup is `role="listbox"`, carrying `aria-multiselectable="true"`
when `multiple`; each row is `role="option"` with `aria-selected`/`aria-disabled`; group headings
are `role="presentation"`.

**Keyboard** — see the full table in SPEC.md §8: typing (any printable character) opens the panel
and filters live, resetting `activeIndex` to the first enabled row — there is no separate typeahead
buffer, because every keystroke already drives the real-time filter (unlike `ino-select`'s
non-editable trigger). `ArrowDown`/`ArrowUp` open the panel or move the active row (clamped, no
wrap), `Home`/`End` jump to the first/last enabled row, `Enter` selects the active row and closes
(single) or toggles its membership and keeps the panel open (multiple), or — with no active row —
commits typed text per `forceSelection` (single only; a no-op in multiple). `Escape` closes without
changing `value`. `Tab` enforces `forceSelection`'s match-or-clear (single only) before closing and
letting focus move on natively.

**Contrast** — trigger/option text and borders reuse the existing audited roles (`on-surface`,
`on-surface-muted`, `on-surface-subtle`, `accent`, `accent-text-safe`, `danger`); the panel uses
`--ino-elevation-neutral-3` ("dropdown, popover").

**Target size** — the trigger clears `--ino-control-height-default` (44px) at `default`/`lg` sizes;
every option row clears `--ino-target-comfortable`/`--ino-row-min-height` per density; every chip
remove button and the clear button clear `--ino-target-min` (24px, WCAG 2.2 SC 2.5.8 floor).

**RTL** — logical properties only (`padding-inline`, `inset-inline-start/end`, `inset-block-start`);
no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **A non-editable trigger mode.** Structurally inapplicable — an autocomplete's whole point is a
  live-filterable text input; there is no `editable` input the way `ino-select` has one. See
  SPEC.md §2/§5.
- **A separate in-panel filter box.** Not needed — the trigger itself *is* the filter box, unlike
  `ino-select`'s `filter` input which adds a second search field inside the panel. See SPEC.md §3.
- **`forceSelection` in `multiple` mode.** Structurally inapplicable, same reasoning
  `ino-multiselect`'s own spec gives for having no free-text commit path at all: a multi-select
  value is a set of discrete memberships, not a single free-text token. The input still accepts the
  flag so an existing single-mode binding does not break when `multiple` is flipped on; it is
  simply inert there. See SPEC.md §5.
- **Grouped + virtualized together.** Same documented gap `ino-select`/`ino-multiselect` have —
  group headings drop once the filtered list crosses `virtualScrollThreshold`. See SPEC.md §8.
- **A dropped `accent-active` trigger state.** Unlike `ino-input`/`ino-datepicker`/`ino-select`/
  `ino-multiselect`, this component's stylesheet never styles `:active` on the trigger at all — not
  an omission relative to those components, a narrower surface from the start. See SPEC.md §10c.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView, satisfied by DoD rows 1–8 plus the 44px touch-target check.
- **React Native / Flutter** — shipped in this issue (`mobile/react-native/src/components/InoAutocomplete.tsx`,
  `mobile/flutter/lib/widgets/ino_autocomplete.dart`), mirroring `ino-select`'s/`ino-multiselect`'s
  port idiom exactly: a text-input trigger (chip row + input in `multiple` mode) + modal
  bottom-sheet suggestion list, `size`, `disabled`/`loading`/`clearable`, a debounced `onSearch`
  callback (same 250ms window as web), `forceSelection` (single mode), and `maxSelected` (multiple
  mode) with the same dim-not-lock rule as web.

  Three surfaces are **deliberately not ported** — each a written decision in SPEC.md §10b: option
  groups (no native grouped-picker precedent in this repo's mobile tracks), virtual scrolling (the
  platform `FlatList`/`ListView.builder` already windows rows), and `mode="inline"` (a
  permanently-expanded in-flow list competes with the on-screen keyboard in a way the bottom-sheet
  idiom already avoids; both ports behave as if `mode` were always `'dropdown'`, rendered as a
  sheet).

  One intentional **visual** divergence, identical to `ino-select`'s/`ino-multiselect`'s: web
  anchors (`dropdown`) or in-flows (`inline`) the suggestion panel under/below the trigger; both
  ports present the same list in a modal bottom sheet, because an anchored or in-flow list under a
  text field collides with the software keyboard and the bottom safe area on a phone. That is why
  the ports read `overlay-scrim` and `border-soft` — roles web's autocomplete never touches —
  declared in `scripts/check-theme-parity.mjs`'s `autocomplete` registry entry. Unlike the other
  mobile-ported form controls, there is no corresponding dropped `accent-active` divergence here,
  because web's autocomplete never reads that role either (SPEC.md §10c).
