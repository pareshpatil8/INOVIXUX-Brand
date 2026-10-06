# `<ino-cascade-select>` — CascadeSelect

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
> `ino-cascade-select` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377).
> Preview: [`previews/cascade-select.html`](previews/cascade-select.html).
> Decisions record: `web/src/app/components/cascade-select/SPEC.md`.

A combobox trigger that opens a panel showing **exactly one level of a hierarchical `options`
tree at a time**, replaced in place as the user drills in or goes back, with a breadcrumb trail
above the list recording the path taken. Only leaf options (no `children`) are selectable values —
a parent option is a drill target.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` via `ino-label` |
| `options` | `InoCascadeSelectOption[]` | `[]` | `{ label, value, disabled?, children? }`; presence of a non-empty `children` makes a row a drill target instead of a selectable leaf |
| `value` | `string` | `''` | Selected leaf's `value`; banana-in-a-box with `valueChange`. `''` = no selection |
| `placeholder` | `string` | `'Select an option'` | Trigger text while nothing is selected |
| `hint` | `string` | `''` | Rendered below the field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + a `role="alert"` message |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Height / padding-inline / font-size from the shared control-size scale |
| `required` | `boolean` | `false` | Decorative `*` marker via `ino-label` |
| `disabled` | `boolean` | `false` | Trigger removed from the focus order |
| `readonly` | `boolean` | `false` | Trigger stays focusable; the panel cannot be opened |
| `loading` | `boolean` | `false` | Spinner + `aria-busy`; same contract as every other Tier-1 control's `loading` input — all interaction ignored while true |
| `backLabel` | `string` | `'Back'` | `aria-label` on the "go back one level" affordance |

`valueChange: EventEmitter<string>` fires once a leaf is activated.
`openChange: EventEmitter<boolean>` fires when the panel opens/closes.

```html
<ino-cascade-select label="Destination" [options]="geoTree" [(value)]="destination" />
```

### Only leaves are values

```ts
geoTree = [
  { label: 'Asia', value: 'asia', children: [
    { label: 'India', value: 'india', children: [
      { label: 'Maharashtra', value: 'maharashtra' },
      { label: 'Karnataka', value: 'karnataka' },
    ]},
  ]},
];
```

Activating `Asia` or `India` (click, `Enter`, `Space`, `ArrowRight`) drills in — it never becomes
`value`. Only `maharashtra`/`karnataka` can. See SPEC.md §2 for why an intermediate node is never
allowed to "count" as a value.

### Breadcrumb of the chosen path

The trigger displays `selectedLabel` — every ancestor's label down to the selected leaf, joined
with `" / "` (e.g. "Asia / India / Maharashtra"). This is derived from `value` via a tree search on
every read (SPEC.md §3), distinct from `path`, the in-panel breadcrumb bar's navigation state,
which resets to `[]` every time the panel opens or closes.

### Size and density

`size` reads the same three control-size aliases every other Tier-1 control uses. Density
(`[data-density]`) is a layout-level concern, same as every other Tier-1 control — no
component-specific override.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Bordered combobox trigger, `surface-sunken` fill |
| Hover | `:hover` on the trigger or a row | Border/background → muted/sunken |
| Focus-visible | `:focus-visible` on the trigger | `--ino-focus-ring` |
| Active/pressed | `:active` on the trigger | Border → `accent-active` |
| Disabled | `disabled` input | `opacity: 0.5`, trigger removed from focus order |
| Readonly | `readonly` input | Trigger stays focusable; the panel cannot be opened |
| Invalid | `error` input set | `aria-invalid="true"`, `role="alert"` message below the field |
| Empty | Current level has no options | "No options found." message replaces the listbox |
| **Open-level** | Panel open and `path.length > 0` (drilled in past root) | `.ino-cascade-select--level-open` host class; breadcrumb bar renders |
| **Loading** | `loading` input set | Spinner on the trigger, `aria-busy="true"`; all interaction ignored while true |

`open-level`/`loading` are this component's two states beyond the §2 standard set (doc 26 §5).

---

## Motion

Panel open/close and chevron rotation use `--ino-motion-duration-fast`/
`--ino-motion-easing-standard`/`-decelerate`; the loading spinner collapses under
`prefers-reduced-motion: reduce`.

---

## Labels and fields

`label` renders through the shared `ino-label` leaf. `hint`/`error` render below the field, `error`
winning when both are set — the full label set doc 26 §5 calls for.

---

## Accessibility contract

**Role / ARIA** — `role="combobox"` trigger (`aria-haspopup="listbox"`, `aria-expanded`,
`aria-controls` pointing at the current level's listbox), opening a `role="listbox"` panel for
whichever level is currently displayed. Each row is `role="option"`; a row with children carries
`aria-haspopup="listbox"` instead of `aria-selected="true"` (only a leaf can be selected).
`aria-activedescendant` tracks the active row by id, same model `ino-select` uses — real DOM focus
never leaves the trigger. The breadcrumb bar is a `<nav aria-label="Selected path">` with each
ancestor a button and the current level's ancestor marked `aria-current="true"`.

**Keyboard** — see SPEC.md §4 for the full table; summary:

| Key | Action |
|---|---|
| `ArrowDown`/`ArrowUp` | Move the active row within the current level (clamped, no wrap) |
| `ArrowRight` | Drill into the active row, if it has children |
| `ArrowLeft` | Go back one level, if not at root |
| `Home`/`End` | Jump to the first/last enabled row in the current level |
| `Enter`/`Space` | Activate the active row — drill in (parent) or select + close (leaf) |
| Printable character | Typeahead within the current level only (500 ms reset window) |
| `Escape` | Close the panel entirely — does not step back a level first |
| `Tab` | Close without restoring focus to the trigger |

**Contrast** — selected-row text (`--ino-color-accent-text-safe`) and empty/muted message colors
are existing audited roles (`check-theme-parity.mjs`), not new values, across all 3 themes.

**Target size** — the trigger, every row, and the breadcrumb back button clear
`min-block-size: var(--ino-control-height)` / `var(--ino-target-comfortable)` /
`var(--ino-target-min)` as appropriate at every size rung.

**RTL** — logical properties only (`inline-size`, `padding-inline-*`, `inset-inline-*`); no
`left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **No cascading flyout of simultaneous panels.** The popup is one level, replaced in place, not N
  side-by-side panels (which is what PrimeNG's own `CascadeSelect` renders) — see SPEC.md §1 for
  why this is the shape that also works as a phone-width stacked sheet.
- **No async per-level children loader.** The full `options` tree is a synchronous `@Input()`,
  same as `ino-select`/`ino-listbox`. Doc 26 §5 names "loading" as a state, not an async-loading
  feature. See SPEC.md §5.
- **No custom option templates or virtual scrolling on mobile.** Same omissions `InoSelect`'s own
  port documents, for the same reason — see SPEC.md §7.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView.
- **React Native** — `mobile/react-native/src/components/InoCascadeSelect.tsx`. Trigger-plus-modal-
  sheet; drill-in/go-back navigation replaces the sheet's content state, with a back chevron and
  the current level's breadcrumb trail as the page title — matching doc 26 §5's "stacked sheet
  pages" mobile disposition.
- **Flutter** — `mobile/flutter/lib/widgets/ino_cascade_select.dart`. Same trigger-plus-
  `showModalBottomSheet` structure and stacked-page navigation model.
