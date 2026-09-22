# `<ino-select>` — Select

> Parity benchmark: PrimeNG 22.1.1 `Select` (`specs/primeng/llms-22.1.1.txt`, route
> `https://primeng.dev/select`) — benchmark only, **not a runtime dependency**.
>
> Gap analysis: `docs/brand/16-design-system-parity-vs-echeque-reference.md`.
> Preview: [`previews/select.html`](previews/select.html).
> Decisions record: `web/src/app/components/select/SPEC.md`.

Custom-listbox rewrite of the labeled select control (INO-152, INO-31 T-9, Form group), replacing
the previous native `<select>`. Filter/search, option groups, custom option and selected-value
templates, clearable, editable, loading state, and virtual scrolling for long option sets (reuses
`<ino-virtual-scroller>`, T-3). Follows this repo's `@Input() value` / `@Output() valueChange`
banana-in-a-box convention (see `ino-input`'s doc comment) rather than a `ControlValueAccessor`.

**Scope of this issue:** single-selection `Select` only — see [Deliberate omissions](#deliberate-omissions).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered via `<ino-label>` |
| `options` | `InoSelectOption[]` | `[]` | `{ label, value, disabled?, group? }` — see [Grouping](#grouping) |
| `value` | `string` | `''` | Banana-in-a-box with `valueChange` |
| `placeholder` | `string` | `'Select an option'` | Shown when nothing is selected |
| `hint` | `string` | `''` | Hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; renders a `role="alert"` message |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | See [Size API](#size-api) |
| `required` | `boolean` | `false` | Decorative `*` marker on the label |
| `disabled` | `boolean` | `false` | Trigger removed from focus order |
| `readonly` | `boolean` | `false` | Trigger stays focusable; panel never opens |
| `loading` | `boolean` | `false` | Inert spinner + `aria-busy`; panel never opens |
| `clearable` | `boolean` | `false` | Adds an inline "clear selection" button when a value is set |
| `editable` | `boolean` | `false` | Trigger becomes a text `<input>`; unmatched typed text becomes the value verbatim |
| `filter` | `boolean` | `false` | Adds a search box inside the panel that narrows visible options without touching `value` |
| `filterPlaceholder` | `string` | `'Search…'` | Placeholder for the in-panel filter input |
| `virtualScrollThreshold` | `number` | `100` | Filtered option count at/above which rendering switches to `<ino-virtual-scroller>` |

`valueChange: EventEmitter<string>` fires on selection (and on editable free-text commit).
`filterChange: EventEmitter<string>` fires on every filter-input keystroke.
`openChange: EventEmitter<boolean>` fires when the panel opens/closes.
`clear: EventEmitter<void>` fires when the clear button is used.

**Templates** — `<ng-template #optionTemplate let-option>` customizes one option row;
`<ng-template #selectedTemplate let-option>` customizes the trigger's selected-value display. Both
receive the `InoSelectOption` as `$implicit`. Omit either to fall back to plain `option.label`.

### Size API

Reads the same `--ino-control-height` / `--ino-control-padding-inline` / `--ino-control-font-size`
alias set as `ino-input`, applied to the trigger. Options rows do not re-scale with `size` — they
track `--ino-row-min-height`/`--ino-target-comfortable` directly, the same density-driven floor
`ino-input`'s control uses.

### Density

`[data-density="dense"|"fluid"]` re-resolves `--ino-row-min-height`, which both the trigger control
and every option row's `min-block-size` read (falling back to `--ino-target-comfortable` outside
any density ancestor).

### Grouping

`InoSelectOption.group?: string` — a run of consecutive options sharing the same `group` value
renders under one heading; the caller keeps grouped options adjacent (the component does not sort).
See SPEC.md §3.

### Variants

| Axis | Values |
|---|---|
| Trigger | Non-editable `<button>` (default) or editable `<input>` (`editable`) |
| Filtering | Off (default) or in-panel search box (`filter`) — combinable with `editable` |
| Options | Plain list (default), grouped (`group` field), or virtualized (`virtualScrollThreshold`, reuses T-3) |
| Value display | Plain label (default) or `#selectedTemplate` |
| Option rendering | Plain label (default) or `#optionTemplate` |

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Trigger border, transparent option rows |
| Hover | `:hover` | Trigger border darkens; option row gets a `surface-sunken` fill |
| Active/pressed | `:active` | Trigger border → `accent-active` |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` on the trigger and the filter input; the *active* option (not DOM-focused, see [Accessibility contract](#accessibility-contract)) gets an inset focus-ring outline instead |
| Disabled | `disabled` input | Trigger `opacity: 0.5`, removed from focus order; panel never opens |
| Readonly | `readonly` input | Trigger stays focusable, `surface-raised` fill, panel never opens |
| Invalid | `error` input set | Trigger border → `--ino-color-danger`, `aria-invalid="true"` |
| Loading/busy | `loading` input | Trailing spinner on the trigger, `aria-busy` on the host, panel never opens |

---

## Motion

Panel open uses `ino-select-panel-in` (`translateY(-4px)` → `0`, opacity `0` → `1`) on
`--ino-motion-duration-fast` / `--ino-motion-easing-decelerate`, gated by
`@media (prefers-reduced-motion: no-preference)` — under `reduce`, the panel simply appears with
no animation declared at all (same idiom `ino-modal` uses). The chevron rotation and trigger
border-color transitions use `--ino-motion-duration-fast` / `--ino-motion-easing-standard`, wrapped
in their own `reduce` guard. The loading spinner uses `--ino-motion-duration-slow` linear rotation,
matching `ino-input`/`ino-button`/`ino-datepicker`.

---

## Accessibility contract

**Role / ARIA** — WAI-ARIA APG "Collapsible Dropdown Listbox," `aria-activedescendant` variant
(SPEC.md §2). The trigger (button or editable input) carries `role="combobox"`,
`aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` pointing at the listbox id. The panel
is `role="listbox"`; each row is `role="option"` with `aria-selected`/`aria-disabled`; group
headings are `role="presentation"`. DOM focus never enters the panel — the trigger (or the
in-panel filter input, when `filter` is on) keeps focus throughout and carries
`aria-activedescendant` pointing at the active option's id. `InoFocusTrapDirective` (T-11) is
deliberately not used — see SPEC.md §2 for why a modal-dialog focus trap does not fit a
listbox popup.

**Keyboard** — see the full table in SPEC.md §2: `ArrowDown`/`ArrowUp` open the panel or move the
active option, `Home`/`End` jump to the first/last enabled option, `Enter` selects, `Escape` closes
without changing `value`, `Tab` closes and lets focus move on natively, and (when neither `editable`
nor `filter` is on) printable characters drive a 500ms typeahead buffer.

**Contrast** — trigger/option text and borders reuse the existing audited roles (`on-surface`,
`on-surface-muted`, `on-surface-subtle`, `accent`, `accent-text-safe`, `danger`); the panel uses
`--ino-elevation-neutral-3` ("dropdown, popover" per its own tokens.css doc comment).

**Target size** — the trigger clears `--ino-control-height-default` (44px) at `default`/`lg`
sizes; every option row clears `--ino-target-comfortable`/`--ino-row-min-height` per density; the
clear button clears `--ino-target-min` (24px, WCAG 2.2 SC 2.5.8 floor).

**RTL** — logical properties only (`padding-inline`, `inset-inline-start/end`, `inset-block-start`);
no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **MultiSelect, AutoComplete, standalone Listbox.** Each is a separate future component, not a
  flag on this one — see SPEC.md §1 for why building all four in this issue would have meant none
  of them shipping at review-ready quality.
- **Grouped + virtualized together.** A grouped `options` array below `virtualScrollThreshold`
  renders group headings normally; at/above the threshold it still virtualizes but drops the
  headings — see SPEC.md §4.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView, satisfied by DoD rows 1–8 plus the 44px touch-target check already covered by
  `--ino-control-height-default`.
- **React Native / Flutter** — not shipped in this issue. Declared `web-only` in
  `scripts/check-theme-parity.mjs`'s component registry, with a scoped single-selection native
  port (no groups, no custom templates, no virtual scroll) filed as a follow-up child issue —
  see SPEC.md §9 for the full reasoning and the datepicker precedent it follows.
