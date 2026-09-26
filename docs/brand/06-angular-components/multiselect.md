# `<ino-multiselect>` — MultiSelect

> Parity benchmark: PrimeNG 22.1.1 `MultiSelect` (`specs/primeng/llms-22.1.1.txt`, route
> `https://primeng.dev/multiselect`) — benchmark only, **not a runtime dependency**.
>
> Gap analysis: `docs/brand/16-design-system-parity-vs-echeque-reference.md`.
> Preview: [`previews/multiselect.html`](previews/multiselect.html).
> Decisions record: `web/src/app/components/multiselect/SPEC.md`.

Checkbox-listbox / chip-list follow-up to `<ino-select>` (INO-153, INO-31 T-10, Form group), built
on the overlay + `aria-activedescendant` core `<ino-select>` established (INO-152, T-9). Multiple
membership (`string[]`), checkbox option rows, a chip-list or comma-summary trigger display, an
optional "select all visible" row, a hard `selectionLimit`, plus the reused filter box, option
groups, and virtual scrolling for long lists. Follows this repo's `@Input() value` /
`@Output() valueChange` banana-in-a-box convention (see `ino-input`'s doc comment) rather than a
`ControlValueAccessor`.

**Scope of this issue:** MultiSelect only — see [Deliberate omissions](#deliberate-omissions).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered via `<ino-label>` |
| `options` | `InoMultiSelectOption[]` | `[]` | `{ label, value, disabled?, group? }` — identical shape to `InoSelectOption` |
| `value` | `string[]` | `[]` | Banana-in-a-box with `valueChange` |
| `placeholder` | `string` | `'Select options'` | Shown when nothing is selected |
| `hint` | `string` | `''` | Hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; renders a `role="alert"` message |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | See [Size API](#size-api) |
| `required` | `boolean` | `false` | Decorative `*` marker on the label |
| `disabled` | `boolean` | `false` | Trigger removed from focus order |
| `readonly` | `boolean` | `false` | Trigger stays focusable; panel never opens |
| `loading` | `boolean` | `false` | Inert spinner + `aria-busy`; panel never opens |
| `clearable` | `boolean` | `false` | Adds an inline "clear all selections" button when `value.length > 0` |
| `filter` | `boolean` | `false` | Adds a search box inside the panel that narrows visible options without touching `value` |
| `filterPlaceholder` | `string` | `'Search…'` | Placeholder for the in-panel filter input |
| `display` | `'chip' \| 'comma'` | `'chip'` | Trigger value display mode — see [Display modes](#display-modes) |
| `maxSelectedLabels` | `number` | `3` | Chip mode only — chips beyond this count collapse into a `"+K more"` indicator |
| `selectAll` | `boolean` | `false` | Renders a "Select all" row scoped to the currently visible (filtered), enabled options |
| `selectionLimit` | `number \| null` | `null` | Hard cap on `value.length` — see [Selection limit](#selection-limit) |
| `virtualScrollThreshold` | `number` | `100` | Filtered row count (including the select-all row) at/above which rendering switches to `<ino-virtual-scroller>` |

`valueChange: EventEmitter<string[]>` fires on every toggle (option or select-all) and on clear.
`filterChange: EventEmitter<string>` fires on every filter-input keystroke.
`openChange: EventEmitter<boolean>` fires when the panel opens/closes.
`clear: EventEmitter<void>` fires when the "clear all" button is used.

### Size API

Reads the same `--ino-control-height` / `--ino-control-padding-inline` / `--ino-control-font-size`
alias set as `ino-input`/`ino-select`, applied to the trigger. Option rows do not re-scale with
`size` — they track `--ino-row-min-height`/`--ino-target-comfortable` directly, the same
density-driven floor `ino-select`'s option rows use.

### Density

`[data-density="dense"|"fluid"]` re-resolves `--ino-row-min-height`, which both the trigger and
every option row's `min-block-size` read (falling back to `--ino-target-comfortable` outside any
density ancestor) — identical to `ino-select`.

### Grouping

`InoMultiSelectOption.group?: string` — a run of consecutive options sharing the same `group` value
renders under one heading; the caller keeps grouped options adjacent (the component does not sort).
Identical model to `ino-select`'s `group` field — see its SPEC.md §3.

### Display modes

- **`'chip'`** (default) — each selected option renders as a small dismissible pill inside the
  trigger, wrapping onto multiple lines as needed. Only the first `maxSelectedLabels` selected
  options render as chips; the rest collapse into one `"+K more"` indicator. Each chip's `×` button
  carries `aria-label="Remove {label}"` and is independently keyboard-reachable.
- **`'comma'`** — a single `"A, B, C"` text summary, truncated with an ellipsis the same way
  `ino-select`'s `.ino-field__value` truncates. No per-item removal in this mode; edit the selection
  through the panel or the `clearable` button.

### Select all

Renders as the first row of the open panel, ahead of any group heading — a real `role="option"`
participating in the same keyboard/typeahead index space as every other row, not a separate control.
Operates on the currently **visible** (filtered), **enabled** option set only — filtering first,
then "select all," selects only what is on-screen. Shows the native checkbox `indeterminate` state
(and implied `aria-checked="mixed"`) when some but not all visible enabled options are selected. See
SPEC.md §3.

### Selection limit

Once `value.length` reaches `selectionLimit`, every unselected row (visually, not via
`option.disabled`) dims and stops responding to clicks/keyboard activation — already-selected rows
stay fully interactive so a selection can always be removed to free up room. No message is shown
when a row is skipped (same silent-refuse contract `ino-select` uses for `option.disabled`). See
SPEC.md §4.

### Variants

| Axis | Values |
|---|---|
| Trigger display | Chip list (default, `display="chip"`) or comma summary (`display="comma"`) |
| Filtering | Off (default) or in-panel search box (`filter`) |
| Options | Plain list (default), grouped (`group` field), or virtualized (`virtualScrollThreshold`, reuses T-3) |
| Select all | Off (default) or a filter-scoped "select all visible" row (`selectAll`) |
| Selection cap | Unbounded (default) or hard-capped (`selectionLimit`) |

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Trigger border, transparent option rows |
| Hover | `:hover` | Trigger border darkens; option row gets a `surface-sunken` fill |
| Active/pressed | `:active` | Trigger border → `accent-active` |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` on the trigger, each chip's remove button, and the filter input; the *active* row (not DOM-focused, see [Accessibility contract](#accessibility-contract)) gets an inset focus-ring outline instead |
| Disabled | `disabled` input | Trigger `opacity: 0.5`, removed from focus order; panel never opens; chip remove buttons disabled |
| Readonly | `readonly` input | Trigger stays focusable, `surface-raised` fill, panel never opens |
| Invalid | `error` input set | Trigger border → `--ino-color-danger`, `aria-invalid="true"` |
| Loading/busy | `loading` input | Trailing spinner on the trigger, `aria-busy` on the trigger, panel never opens |

---

## Motion

Identical to `ino-select`: panel open uses `translateY(-4px)` → `0`, opacity `0` → `1` on
`--ino-motion-duration-fast` / `--ino-motion-easing-decelerate`, gated by
`@media (prefers-reduced-motion: no-preference)`. Chevron rotation and trigger border-color
transitions use `--ino-motion-duration-fast` / `--ino-motion-easing-standard` in their own `reduce`
guard. The loading spinner uses `--ino-motion-duration-slow` linear rotation.

---

## Accessibility contract

**Role / ARIA** — WAI-ARIA APG multi-selectable listbox (SPEC.md §2). The trigger (a `<div
role="combobox">`, not a `<button>` — chip mode nests real `<button>` remove controls, and a
`<button>` cannot contain another interactive element) carries `aria-haspopup="listbox"`,
`aria-expanded`, `aria-controls` pointing at the listbox id. The panel is `role="listbox"
aria-multiselectable="true"`; each row is `role="option"` with `aria-selected` (true for every
selected row, not at most one) / `aria-disabled`; group headings are `role="presentation"`. DOM
focus never enters the panel — the trigger (or the in-panel filter input, when `filter` is on)
keeps focus and carries `aria-activedescendant` pointing at the active row's id.

**Keyboard** — see the full table in SPEC.md §2: `ArrowDown`/`ArrowUp` open the panel or move the
active row, `Home`/`End` jump to the first/last enabled row, `Enter`/`Space` **toggle** the active
row's membership (never close the panel), `Escape` closes without reverting any prior toggle,
`Tab` closes and lets focus move on natively, and (when `filter` is off) printable characters drive
a 500ms typeahead buffer.

**Contrast** — trigger/option text and borders reuse the existing audited roles (`on-surface`,
`on-surface-muted`, `on-surface-subtle`, `accent`, `accent-text-safe`, `danger`); the panel uses
`--ino-elevation-neutral-3` ("dropdown, popover").

**Target size** — the trigger clears `--ino-control-height-default` (44px) at `default`/`lg` sizes;
every option row clears `--ino-target-comfortable`/`--ino-row-min-height` per density; every chip
remove button and the clear-all button clear `--ino-target-min` (24px, WCAG 2.2 SC 2.5.8 floor).

**RTL** — logical properties only (`padding-inline`, `inset-inline-start/end`, `inset-block-start`);
no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **The editable free-text trigger.** Not applicable to this component at all (there is no
  "typed text becomes the whole multi-selection" operation) — see SPEC.md §1.
- **Custom option/selected-value templates.** No consumer of either `ino-select` or this component
  exercises them yet; can be added later without a breaking change. See SPEC.md §1.
- **Grouped + virtualized together.** Same documented gap `ino-select` has — group headings drop
  once the filtered list crosses `virtualScrollThreshold`. See SPEC.md §6.
- **`aria-multiselectable` on the virtualized path.** `<ino-virtual-scroller>` has no arbitrary-
  attribute passthrough for this attribute; it is present and correct below the virtualization
  threshold. Each row's own `aria-selected` still carries selection state either way. See SPEC.md §6.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView, satisfied by DoD rows 1–8 plus the 44px touch-target check.
- **React Native / Flutter** — shipped in this issue (`mobile/react-native/src/components/InoMultiSelect.tsx`,
  `mobile/flutter/lib/widgets/ino_multi_select.dart`), mirroring `ino-select`'s port idiom exactly:
  trigger (chip row or comma summary) + modal bottom-sheet checkable rows, `size`,
  `disabled`/`loading`, `clearable`, the in-panel filter with web's exact substring semantics, the
  filter-scoped "select all," and `selectionLimit` enforcement.

  Two surfaces are **deliberately not ported** — each a written decision in SPEC.md §9b: option
  groups (no native grouped-picker precedent in this repo yet) and virtual scrolling (the platform
  `FlatList`/`ListView.builder` already windows rows).

  One intentional **visual** divergence, identical to `ino-select`'s: web anchors the option panel
  under the trigger; both ports present the list in a modal bottom sheet, because an anchored
  popover under a field collides with the software keyboard and the bottom safe area on a phone.
  That is why the ports read `overlay-scrim` and `border-soft` — roles web's multiselect never
  touches — declared alongside the dropped `accent-active` in
  `scripts/check-theme-parity.mjs`'s `multiselect` registry entry.
