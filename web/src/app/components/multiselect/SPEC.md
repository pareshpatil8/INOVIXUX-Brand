# `<ino-multiselect>` — component spec

**Issue:** INO-153 (INO-31 T-10, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `MultiSelect` — `specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/multiselect`. PrimeNG is a benchmark, **not a runtime dependency**; nothing
here installs it.
**Resolves DoD rows:** 1–11 (full component DoD, `docs/brand/17-phase-2-implementation-program.md`
plan rev 9/10 §2).
**Depends on:** INO-152 (T-9, `<ino-select>` — the shared overlay/`aria-activedescendant`/filter/
virtual-scroll core this component builds on), both `done` before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Scope: MultiSelect only, extending `ino-select`'s core, not a boolean flag on it

`ino-select`'s own SPEC.md §1 scoped this component out explicitly: "checkbox options, chip-list
value display, select-all — a different value shape (`string[]`) and a materially different
trigger rendering, not a boolean flag on this component." This issue builds exactly that, as a new
component (`InoMultiSelectComponent`, selector `ino-multiselect`) rather than a `multiple` input on
`InoSelectComponent`, because the two components' triggers render fundamentally different markup
(one label vs. a chip row or comma summary) and their selection commit models differ (select-and-
close vs. toggle-and-stay-open) — bolting both onto one `@Component` would mean every template
branch doubling on an `if (multiple)` check, which is exactly the "no single variant ships
reviewable" problem `ino-select`'s SPEC.md §1 already argued against for the four-variants-in-one-
issue version of this same choice.

Reused verbatim from `ino-select` (`web/src/app/components/select/ino-select.component.ts`):
overlay open/close (click-outside, `Escape`, `Tab`), the `aria-activedescendant` keyboard model,
option grouping (`group` field, run-boundary headings), the in-panel filter box, and
`<ino-virtual-scroller>` integration above `virtualScrollThreshold`.

**Deliberately not built here:**

- **Editable free-text trigger.** `ino-select`'s `editable` input turns its trigger into a text
  `<input>` whose typed text can *become* the value verbatim. A multi-select value is a set of
  discrete memberships, not a single free-text token — there is no equivalent "typed text becomes
  the whole selection" operation, so this input has no analogue here at all (not merely omitted —
  structurally inapplicable). AutoComplete (still not built by any issue) is the variant that
  extends `editable`.
- **Custom option/selected-value templates (`optionTemplate`/`selectedTemplate`).** `ino-select`
  exposes these as an `ng-template` extensibility surface; no consumer of *either* component
  exercises them yet. Adding the same surface here speculatively, before anything needs it, repeats
  the mistake `ino-select`'s own SPEC.md §9b calls out for its mobile ports. Can be added later
  without a breaking change if a real consumer needs it.

## 2. ARIA: `role="listbox"` `aria-multiselectable="true"`, `aria-selected` per row, toggle not commit

Same `aria-activedescendant` model as `ino-select` §2 (DOM focus never leaves the trigger or the
in-panel filter input), with two differences the WAI-ARIA APG multi-selectable listbox pattern
requires: the popup carries `aria-multiselectable="true"` (not present on `ino-select`'s popup at
all, since it is single-selection), and every `role="option"` row carries `aria-selected="true"`
for however many rows are currently selected — not at most one, as in `ino-select`.

**Trigger.** `role="combobox"` `aria-haspopup="listbox"` `aria-expanded`, same as `ino-select` — but
rendered as a `<div tabindex>` rather than a `<button>`: chip mode nests a real, independently
focusable `<button>` per chip (§8), and nesting interactive elements inside a native `<button>` is
invalid HTML. The `role="combobox"` + explicit `tabindex` replicates the button's focusability and
keyboard reachability without the nesting violation.

**Selection commit: toggle, not select-and-close.** `ino-select`'s `selectOption()` sets `value`
and calls `close(true)` in the same action. This component's `toggleOption()` only ever mutates
`value` — the panel stays open across every click/`Enter`/`Space`, per the issue's explicit
requirement ("clicking a row toggles membership in `value` without closing the panel"). `Escape`
still closes the panel, but (unlike a "commit on close, revert on escape" pattern) it does **not**
revert prior toggles — each toggle already committed immediately when it happened. This is a
deliberate difference from any hypothetical "provisional selection until Escape/close" model: value
changes are never staged, matching the immediate-commit contract every other Tier-1 form control in
this repo already has.

### Keyboard map

| Key | Closed | Open |
|---|---|---|
| `ArrowDown` / `ArrowUp` | Opens panel, activates first/last enabled row | Moves `aria-activedescendant` to next/previous enabled row (clamped, no wrap) |
| `Home` / `End` | — | Jumps to first/last enabled row |
| `Enter` / `Space` | Opens panel | **Toggles** the active row's membership (option row) or runs "select all" (select-all row) — does **not** close the panel |
| `Escape` | — | Closes panel, returns focus to trigger — does not revert any toggle already committed |
| `Tab` | — | Closes panel (no value change beyond what was already toggled), lets focus move to the next tabbable element natively — which may be a chip's own remove button (§8) before it reaches the true "next control", since chips are real DOM elements on the trigger |
| Printable character | Typeahead: jumps to next row whose label starts with the typed buffer (buffer resets 500 ms after the last keystroke) | Same, only when `filter` is `false` (no `editable` gate — this component has no editable trigger, §1) |

## 3. Select-all: filter-scoped ("select all visible"), with a synthetic listbox row

`selectAll` renders a "Select all" row as the **first row of the listbox** (`InoMultiSelectRow`
with `isSelectAll: true`, `option: null`), ahead of any group heading, when the panel has at least
one visible row. It is a real `role="option"` participating in the same `aria-activedescendant`
index space as every other row (arrow/Home/End/typeahead all see it) rather than a separate control
outside the listbox, so it reads correctly to a screen reader as "the first item in this list,"
not a mysterious extra button above it.

**Filter-scoped, not global.** Toggling it operates on the *currently visible* (filtered), *enabled*
option set — not the full unfiltered `options` array. Consistent with how `ino-select`'s own filter
"narrows the option list [without] the component [sorting or otherwise touching the underlying
array]" (SPEC.md §3): typing a filter query and then hitting "select all" selects only what is
on-screen, matching the principle-of-least-surprise a user gets from seeing only those rows
checked. Selections made outside the current filter (from an earlier, different filter query) are
never touched by "select all" or "deselect all" — the operation only ever adds/removes rows that
are members of `visibleEnabledValues`.

**Indeterminate.** `<input type="checkbox">`'s native `indeterminate` DOM property is bound directly
(`[indeterminate]="selectAllIndeterminate"`), the same idiom `ino-checkbox` documents: "a real
Angular property binding — no directive/ElementRef needed since Angular binds `[prop]` to any DOM
property the host element actually has." True when some but not all visible enabled options are
selected; `aria-checked="mixed"` is implied by the browser's own accessibility-tree mapping of that
DOM property (HTML-AAM), same as `ino-checkbox`'s own doc comment records. The select-all row's own
`aria-selected` (not `aria-checked` — it is `role="option"`, not `role="checkbox"`) reflects the
"all visible selected" boolean; the visual/native-checkbox indeterminate state is what actually
carries the mixed signal to assistive tech, exactly the split `ino-checkbox`'s own header comment
describes for its own `aria-checked="mixed"` binding.

## 4. `selectionLimit` — hard cap, dim-not-disable, removal always available

`selectionLimit: number | null` (default `null`, no cap). Once `value.length` reaches the limit:

- Every **unselected** row becomes non-interactive: `isRowNonInteractive()` returns `true`, which
  adds `.ino-field__option--disabled` (dimmed to `--ino-color-on-surface-subtle`, `cursor:
  not-allowed`) and `aria-disabled="true"`, and both `toggleOption()` and keyboard navigation
  (`moveActive`, `Home`/`End`, typeahead) skip it. This is a **visual/interaction** disabled state,
  not `option.disabled` — the option itself is not disabled, only temporarily unreachable, so if a
  selection is later removed the row instantly becomes interactive again without any data mutation
  on the `options` array.
- Every **already-selected** row stays fully interactive — clicking it (or its chip's remove
  button) still removes it. A hard cap that also locks in existing selections would leave a user
  with no way to correct a mistake without external help.
- No message/toast is shown when a row is skipped — same "refuse silently" contract `toggleOption`
  already has for a disabled option (`ino-select`'s `selectOption()` also just returns early on
  `option.disabled`, no error surfaced). A future issue could add a `hint`-level "N of M selected"
  string if a consumer needs one; not built speculatively here.
- "Select all" (§3) respects the same cap when *adding*: it adds only as many unselected visible
  options as fit under the remaining budget (`selectionLimit - value.length`), silently leaving the
  rest unselected — never partially-selects past the cap, and never throws.

## 5. Chip/comma display — `maxSelectedLabels`, order follows `options`, not selection order

`display: 'chip' | 'comma'` (default `'chip'`).

- **Chip mode.** Each selected option renders as a small pill (`--ino-radius-pill`,
  `--ino-color-surface-raised` fill, `--ino-color-border` outline) with its own label and a
  dismissible `×` button (`aria-label="Remove {label}"`, §8). Chips wrap onto multiple lines inside
  the trigger (`flex-wrap: wrap`) rather than growing the trigger horizontally without bound.
  **Overflow rule:** only the first `maxSelectedLabels` (default `3`) selected options render as
  chips; the remainder collapse into one non-removable `"+K more"` indicator chip. The name reuses
  PrimeNG's `maxSelectedLabels` (the closest existing precedent for this exact knob, per the issue's
  own suggestion) rather than inventing a new name for the same concept.
- **Comma mode.** One `<span>` containing `selectedOptions.map(o => o.label).join(', ')`, truncated
  with the same `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` treatment
  `ino-select`'s `.ino-field__value` already uses — no per-chip removal UI in this mode (there is
  nothing to click on individually); the whole selection is edited through the panel or the
  `clearable` "clear all" button.
- **Order.** Both modes render selected options in `options` array order (`selectedOptions` is
  `options.filter(...)`, not sorted by selection recency) — consistent with `ino-select`'s own
  `filteredRows` never reordering by anything but the caller's array order, and it means the chip
  row does not visually reshuffle every time a mid-list option is toggled.

## 6. Grouping — `InoSelectOption`'s `group` field, unchanged

`InoMultiSelectOption` mirrors `InoSelectOption` field-for-field (`label`, `value`, `disabled?`,
`group?`) — no new fields needed for grouping, per the issue's own instruction. The run-boundary
heading algorithm is copied verbatim from `ino-select`'s `recomputeFiltered()` (§3 there); the only
addition is inserting the synthetic select-all row (§3 here) ahead of the first real option/heading
when `selectAll` is on, which does not participate in group-run tracking (`lastGroup` only advances
over real options).

**Grouped + virtualized** carries the same documented gap `ino-select`'s SPEC.md §4 records: a
grouped list at or above `virtualScrollThreshold` still virtualizes but drops the group headings —
`<ino-virtual-scroller>`'s plain-array model has no heading-row concept, unchanged from that
component's own scope.

**`aria-multiselectable` and the virtualized path.** `<ino-virtual-scroller>` (T-3) does not expose
an arbitrary-attribute passthrough on the DOM node it applies its `role` input to — only `role`,
`itemRole`, and a fixed set of `aria-*` inputs (`ariaLabel`/`ariaDescribedBy`/busy/invalid/readonly/
disabled) it declares itself (`web/src/app/components/virtual-scroller/ino-virtual-scroller.component.ts`).
There is no `ariaMultiselectable` input to bind, and an `[attr.aria-multiselectable]` binding placed
directly on the `<ino-virtual-scroller>` host tag lands on the *host* element, not the inner `div`
that actually carries `role="listbox"` — so it would be attached to the wrong node and effectively
inert. Below `virtualScrollThreshold` (the plain `*ngFor` `<ul role="listbox">` path) the attribute
is present and correct. This is a documented, not silent, gap in the virtualized path only — filing
a passthrough-attribute input on `<ino-virtual-scroller>` is out of this issue's scope (that
component's own SPEC.md governs its own API surface) and each option row still carries its own
correct `aria-selected`, so multi-selection state is still announced per-row regardless.

## 7. No `ControlValueAccessor`

Same `@Input() value: string[]` / `@Output() valueChange: EventEmitter<string[]>` banana-in-a-box
convention as `ino-select` and every other Tier-1 form control in this repo (see `ino-input`'s doc
comment) — no Reactive/Template-driven Forms module wired up anywhere yet.

## 8. Chip removal — real focusable `<button>`s, `stopPropagation`, never a broken trigger

Each chip's remove control is a genuine `<button type="button">`, independently `Tab`-reachable and
carrying `aria-label="Remove {label}"` (point 8 of the issue's requirements) — not a decorative `×`
glyph a screen reader would skip. Its `(click)` handler calls `event.stopPropagation()` before
mutating `value`, so the click never also bubbles to the trigger's own `(click)="toggle()"` handler
and reopens/closes the panel as an unwanted side effect.

Removing the last chip leaves `selectedOptions` empty; the trigger's `*ngIf="!selectedOptions.length"`
branch falls back to the plain `placeholder` text automatically — there is no separate "empty chip
row" state to leave dangling, and no exception is thrown removing from an already-empty array
(`Array.prototype.filter` on `[]` is a no-op).

## 9. Mobile parity — checkable-row bottom sheet ports, same idiom as `ino-select`

- **Capacitor** — not a separate port. The same Angular component/CSS renders in the Capacitor
  WebView; satisfied automatically once DoD rows 1–8 pass plus the 44px touch-target check
  (`--ino-control-height-default` / `--ino-target-comfortable`), same as `ino-select`'s own §9.
- **React Native and Flutter** — shipped in this issue (not deferred to a follow-up, unlike
  `ino-select`'s INO-258 split): `mobile/react-native/src/components/InoMultiSelect.tsx`,
  `mobile/flutter/lib/widgets/ino_multi_select.dart`. Both mirror `InoSelect`'s/`InoSelect`'s own
  theming idiom exactly (`useTheme()`/`control[size]` on RN, `context.inoColors`/`InoControlSize` on
  Flutter) rather than inventing a second theming mechanism.

### 9a. What the ports carry

Trigger (chip row or comma summary) + modal bottom-sheet checkable row list, `size`
(`ControlSize`/`InoControlSize`), `disabled`/`loading`, `clearable` (clears the whole array), the
in-panel filter with the same case-insensitive substring predicate web uses, the "select all
visible" row with the same filter-scoped semantics as §3, and `selectionLimit` enforcement with the
same "dim unselected rows, always allow removal" rule as §4.

### 9b. What the ports deliberately do NOT carry

Same two omissions `ino-select`'s own ports declare, for the same reasons:

- **Option groups (the `group` field).** No native grouped-picker precedent exists in this repo's
  mobile tracks yet (`ino-select`'s SPEC.md §9b makes the identical call) — `InoMultiSelectOption`
  on both tracks is a flat `{label, value, disabled}`, not web's type minus a field.
- **Virtual scrolling.** The ports use `FlatList` / `ListView.builder`, which already window rows —
  same rationale `ino-virtual-scroller`'s own SPEC.md §1 gives for staying web-only, and the same
  one `ino-select`'s ports give for the identical omission.

The editable free-text trigger is not listed here because it is not applicable to this component at
all (§1) — there is nothing to omit that could have been carried.

### 9c. One intentional visual divergence — bottom sheet, not anchored panel

Identical divergence and identical reasoning to `ino-select`'s SPEC.md §9c: web anchors the panel
under the trigger; both ports present the same checkable list in a modal bottom sheet
(`ConfirmActionSheet.tsx` / `confirm_action_sheet.dart` idiom,
`docs/brand/13-mobile-app-patterns.md` §2) because an anchored popover under a field collides with
the software keyboard and the bottom safe area on a phone. This is why the ports read
`overlay-scrim` (sheet backdrop) and `border-soft` (grabber) — roles web's multiselect never
touches — and why they drop `accent-active` (no pointer-down-before-focus phase on touch, same
divergence `ino-input`/`ino-datepicker`/`ino-select` already declare). All three are declared in the
registry (§10).

### 9d. Accessibility substitution

Neither platform has `listbox`/`option`/`aria-multiselectable` concepts, so §2's ARIA model has no
direct equivalent: the trigger is a button carrying the expanded/busy state and each row is a button
carrying `selected` — the same substitution `ino-select`'s own ports make (SPEC.md §9d there).
Because a sheet row cannot lean on an anchored panel's own selected styling, each row gets a
checkbox glyph (`☐`/`☑`, and `◪` for the select-all row's indeterminate state) in addition to the
`accent-text-safe` tint and bold weight web/§2 use, so colour is never the only cue (WCAG SC 1.4.1)
— the same reasoning `ino-select`'s ports give for their own `✓` glyph (SPEC.md §9d there).

## 10. Registry

`scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` has one alphabetically-inserted entry for
`multiselect` (between `input` and `select`), with real `{ path, roles }` entries for both mobile
tracks (built in this issue, not a follow-up) and the same three divergences `select`'s entry
declares for the identical reasons: `accent-active` (dropped) and `overlay-scrim`/`border-soft`
(added), per §9c. The registry's stale-divergence assertion means those three cannot rot into
unexamined permissions.

---

## Files touched

- `web/src/app/components/multiselect/ino-multiselect.component.ts`
- `web/src/app/components/multiselect/ino-multiselect.component.html`
- `web/src/app/components/multiselect/ino-multiselect.component.scss`
- `web/src/app/components/multiselect/SPEC.md` (this file)
- `docs/brand/06-angular-components/multiselect.md`
- `docs/brand/06-angular-components/previews/multiselect.html`
- `scripts/check-theme-parity.mjs` (one appended registry entry, DoD row 11)
- `mobile/react-native/src/components/InoMultiSelect.tsx`
- `mobile/flutter/lib/widgets/ino_multi_select.dart`
- `scripts/ds-adherence-waivers.json` (two grabber-radius waivers, matching the existing
  `ConfirmActionSheet`/`ino_select`/`InoSelect` pairs — same 2px value, same pending INO-173
  micro-step decision)
