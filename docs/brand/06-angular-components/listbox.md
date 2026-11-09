# `<ino-listbox>` — Listbox

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
> `ino-listbox` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377).
> Preview: [`previews/listbox.html`](previews/listbox.html).
> Decisions record: `web/src/app/components/listbox/SPEC.md`.

An always-visible WAI-ARIA APG **Listbox** — no trigger, no overlay, never collapsed. Single or
multiple selection, an always-visible filter box, run-boundary option grouping, and
virtualization above the usual 100-option threshold (reusing `<ino-virtual-scroller>`).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` via `ino-label` |
| `options` | `InoListboxOption[]` | `[]` | `{ label, value, disabled?, group? }` |
| `value` | `string \| string[]` | `''` | Banana-in-a-box with `valueChange`; `string` when `multiple` is `false`, `string[]` when `true` |
| `hint` | `string` | `''` | Rendered below the field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + a `role="alert"` message |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Height / padding-inline / font-size from the shared control-size scale |
| `required` | `boolean` | `false` | Decorative `*` marker via `ino-label` |
| `disabled` | `boolean` | `false` | Removes every row from the focus order |
| `readonly` | `boolean` | `false` | Rows stay focusable; selection cannot change |
| `loading` | `boolean` | `false` | Spinner + `aria-busy`; interaction ignored while true |
| `multiple` | `boolean` | `false` | Toggle-membership selection model, reused from `ino-multiselect` |
| `filter` | `boolean` | `true` | Always-visible filter box above the list (baseline structure per doc 26 §5, not opt-in) |
| `filterLabel` | `string` | `'Filter'` | `aria-label` on the filter input |
| `filterPlaceholder` | `string` | `'Filter…'` | Placeholder text on the filter input |
| `virtualScrollThreshold` | `number` | `100` | Options at/above this count render through `<ino-virtual-scroller>` |

`valueChange: EventEmitter<string | string[]>` fires on every selection/toggle.
`filterChange: EventEmitter<string>` fires on every filter keystroke (and on `Escape`-clear).

### Grouping

`InoListboxOption.group` renders a run-boundary heading row exactly like `ino-select`'s own
grouping — a heading appears once, the first time a new `group` value is encountered in list
order; rows are never re-sorted to cluster a group that isn't already contiguous in `options`.

### Custom row rendering

An `#optionTemplate` content child (`<ng-template #optionTemplate let-option>`) replaces the
plain label text in every row, virtualized or not. Context: `$implicit` = `InoListboxOption`.

```html
<ino-listbox label="Country" [options]="countries" [(value)]="country" />
```

### Size and density

`size` reads the same three control-size aliases every other Tier-1 form control uses —
`--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-font-size`. The list
viewport is a fixed **8 rows tall at every size** — `--ino-listbox-scroll-height: calc(var(
--ino-control-height) * 8)` — so density changes row height, never row count.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Bordered `.ino-field__control-wrap` shell, `surface-sunken` fill |
| Hover | `:hover` on a row | Row background → `surface-raised` |
| Focus-visible | `:focus-visible` on a row (real DOM focus, roving `tabindex`) | `--ino-focus-ring` |
| Active/pressed | `:active` on a row | Row background → `surface-raised` |
| Disabled | `disabled` input | `opacity: 0.5` on the whole control; every row removed from focus order |
| Readonly | `readonly` input | Rows stay focusable; click/keydown selection handlers no-op |
| Invalid | `error` input set | `aria-invalid="true"`, `role="alert"` message below the field |
| Loading/busy | `loading` input set | Spinner, `aria-busy="true"`, interaction ignored |
| **Selected** | `valuesArray.length > 0` | `.ino-listbox--selected` host class; selected row(s) get `--ino-color-accent-text-safe` text + bold |
| **Filtered-empty** | non-empty filter query narrows the list to nothing | `.ino-listbox--filtered-empty` host class; "No options match your filter." message replaces the list |

`selected`/`filtered-empty` are this component's two states beyond the §2 standard set (doc 26 §5).

---

## Motion

Option-row background transitions use `--ino-motion-duration-fast` /
`--ino-motion-easing-standard` implicitly via the shared hover/active token values; the loading
spinner's rotation collapses under `prefers-reduced-motion: reduce`.

---

## Labels and fields

`label` renders through the shared `ino-label` leaf — a real `<label for>`, `[required]` for the
decorative marker, `[invalid]="!!error"` for the danger-token treatment. A second, independent
label (`filterLabel`) names the always-visible filter box via `aria-label` (it has no visible
`<label>` of its own — the filter box's purpose is self-evident next to the listbox it filters,
same convention `ino-select`'s in-panel filter uses). `hint`/`error` render below the field,
`error` winning when both are set.

---

## Accessibility contract

**Role / ARIA** — WAI-ARIA APG **Listbox** pattern, roving-`tabindex` variant: `role="listbox"` is
always in the DOM; each row is `role="option"` with `aria-selected` reflecting membership;
`aria-multiselectable="true"` is set only when `multiple` is `true`; `aria-disabled`/`aria-busy`
mirror `disabled`/`loading`. `aria-activedescendant` is never used — see `SPEC.md` §2 for why that
diverges from `ino-select`.

**Keyboard** —

| Key | Single-selection | Multi-selection |
|---|---|---|
| `Tab` / `Shift+Tab` | Moves focus onto/off the one row carrying `tabindex="0"` | Same |
| `ArrowDown` / `ArrowUp` | Move the roving tab stop to the next/previous enabled row (clamped, no wrap) **and** select it | Move the roving tab stop only |
| `Home` / `End` | Jump to the first/last enabled row, select it | Jump to the first/last enabled row, focus only |
| `Space` / `Enter` | Select the focused row | Toggle membership of the focused row |
| Printable character | Typeahead — jump to the next row whose label starts with the typed text (500 ms buffer reset) | Same, focus only |
| `ArrowDown` from the filter box | Moves real focus from the filter box into the list | Same |
| `Escape` in the filter box | Clears the filter query | Same |

**Focus management under virtualization** — a row can only receive real DOM focus once it's
rendered. Moving the roving tab stop first calls `<ino-virtual-scroller>`'s `scrollToIndex()` to
bring the target row into the rendered window, then looks it up by id once change detection has
re-rendered — see `SPEC.md` §2 for the full sequencing argument.

**Contrast** — selected-row text (`--ino-color-accent-text-safe`) and the filtered-empty/loading
message colors (`--ino-color-on-surface-muted`) are existing audited roles
(`check-theme-parity.mjs`), not new values, across all 3 themes.

**Target size** — every row clears `min-block-size: var(--ino-control-height)` at every size rung.

**RTL** — logical properties only (`inline-size`, `padding-inline`, `inset-inline-*`); no
`left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **A second, separately-imported multi-select component.** `ino-select`/`ino-multiselect` are
  two components because their *trigger* chrome differs sharply (single text vs. chip row); a
  listbox has no trigger at all, so the single/multiple difference is one input flag
  (`multiple`) and a checkbox per row — not enough divergence to justify a second component. See
  `SPEC.md` §3.
- **`aria-activedescendant` combobox focus model.** Deliberately not reused from `ino-select` —
  a listbox has no collapsed/combobox state to park focus on. See `SPEC.md` §2.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView.
- **React Native** — `mobile/react-native/src/components/InoListbox.tsx`. Renders a trigger field
  (same shape as `InoMultiSelect`'s) that opens a near-full-height modal sheet containing the
  filterable, scrollable option list — there is no inline always-visible list on a phone screen.
  Single-selection closes the sheet on row tap; multi-selection keeps it open across taps.
- **Flutter** — `mobile/flutter/lib/widgets/ino_listbox.dart`. Same trigger-plus-sheet structure
  via `showModalBottomSheet`, reusing `InoMultiSelect`'s sheet idiom. See `SPEC.md` §8 for the
  full reasoning and the omissions list (option groups, virtual scrolling — not ported, same as
  `InoMultiSelect`'s own mobile ports).
