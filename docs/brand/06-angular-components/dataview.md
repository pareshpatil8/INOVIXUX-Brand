# `<ino-dataview>` — DataView

> Parity benchmark: PrimeNG 22.1.1 `DataView` (`specs/primeng/llms-22.1.1.txt`, line 51).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Spec seed: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 (Phase B3 —
> Data display). Decisions record: `web/src/app/components/dataview/SPEC.md`.

Renders a collection as a list or a grid, with a built-in layout switch and paginator integration.
A controlled component: it never mutates its own data, and paging round-trips through `(page)`
exactly the way `<ino-table>` already does.

**Composes rather than reinvents:** the layout switch is a plain `<ino-select-button>`; paging is a
plain `<ino-paginator>`. Neither is rebuilt here.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `value` | `readonly unknown[]` | `[]` | Items for the current page (already the loaded window when `lazy`) |
| `trackBy` | `(index, item) => unknown \| null` | `null` | `@for` tracking function |
| `layout` | `'list' \| 'grid'` | `'list'` | Two-way bindable via `(layoutChange)` |
| `showLayoutSwitcher` | `boolean` | `true` | `false` hides the built-in `<ino-select-button>` switch |
| `paginator` | `boolean` | `false` | Mounts the built-in `<ino-paginator>` footer |
| `rows` | `number` | `10` | Page size |
| `first` | `number` | `0` | 0-based index of the first visible record |
| `rowsPerPageOptions` | `number[]` | `[]` | Forwarded to `<ino-paginator>` |
| `lazy` | `boolean` | `false` | `true`: `value` already holds only the current page |
| `totalRecords` | `number` | `0` | Lazy mode only — the true collection length |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Drives the grid gap scale — see [Sizing](#sizing) |
| `gridMinColumnWidth` | `string` | `'220px'` | CSS length — grid cell minimum track width |
| `loading` | `boolean` | `false` | Renders shimmer placeholders instead of items |
| `skeletonItemCount` | `number` | `0` | `0` falls back to `rows`, else `6` |
| `emptyMessage` | `string` | `'No records found.'` | Shown when `value` is empty and not loading |
| `label` | `string` | `''` | Visible caption for the region (the "list label") |
| `ariaLabel` | `string` | `'Data view'` | Accessible name when no visible `label` is given |

### Outputs

| Output | Type | Fires when |
|---|---|---|
| `layoutChange` | `'list' \| 'grid'` | The layout switch commits a new value |
| `page` | `InoPaginatorPageEvent` | Any paginator navigation gesture |
| `firstChange` | `number` | Companion to `page`, for a plain `[(first)]` two-way binding |

### Template slots

| Directive | Context | Notes |
|---|---|---|
| `inoDataViewListItem` | `{ $implicit: item, index }` | Required for `layout="list"` |
| `inoDataViewGridItem` | `{ $implicit: item, index }` | Optional — falls back to the list item template |
| `inoDataViewEmpty` | — | Optional — overrides `emptyMessage` |

### Sizing

Grid gap rebinds from the existing `--ino-control-padding-inline-sm`/`-default`/`-lg` aliases per
`size`, which already resolve correctly per density — no new token was introduced. Full reasoning:
`SPEC.md` §3.

---

## Labels and fields

`<ino-dataview>` takes a `label`, but it is **not a form field** — the `label` is the region's
visible caption (the "list label" doc 26 §5 calls for, the role a table caption plays), not a
control label. So the §2.4 form-field furniture does not apply here, and that is a deliberate
contract rather than an omission:

| §2.4 element | Applies? | Why |
|---|---|---|
| Visible label | **Yes** — `label="..."` | Rendered as `<span class="ino-dataview__label">` in the header row, alongside the layout switcher |
| Required marker | No | There is nothing to fill in. A data view presents rows; it collects no value, so "required" has no meaning |
| Help / hint text | No | Guidance belongs to whatever form or page owns the view, not to the region caption |
| Error text | No | The component has no validity state. The nearest things are the empty state (`emptyMessage` / the `inoDataViewEmpty` slot) and `loading`, both documented under States |

**Naming resolution** — exactly one accessible name is applied, never both:

| `label` | Result on the list region |
|---|---|
| Set | `aria-labelledby` points at the caption's generated id; `aria-label` is left off, so the visible text and the accessible name cannot drift apart |
| Empty (default) | `aria-label` falls back to `ariaLabel` (default `"Data view"`); no caption is rendered |

The header row renders only when `label` or `showLayoutSwitcher` is set, so a captionless view with
the switcher hidden adds no empty chrome.

---

## Variants

| Named in the issue | Shipped | Surface |
|---|---|---|
| List/grid layout switch | ✅ | Built-in `<ino-select-button>`, `[layout]` / `(layoutChange)` |
| Paginator integration | ✅ | `paginator` input, same contract as `<ino-table>` |
| Item templates | ✅ | `inoDataViewListItem` / `inoDataViewGridItem` directives |

---

## States

| State | Signal |
|---|---|
| default | `.ino-dataview__item` base rule |
| loading | `[data-loading]` host attribute + `aria-busy`; shimmer placeholders in the current layout shape |
| empty | `.ino-dataview__empty`, `emptyDef` or `emptyMessage` |
| disabled / readonly / invalid | **Deliberately N/A** — a pure read/present component has no form-validity concept. `SPEC.md` §4 |

---

## Accessibility contract

**Role / ARIA** — the items container is `role="list"`; every item (including skeleton
placeholders) is `role="listitem"`, in both `list` and `grid` layout — the spec names exactly these
two roles, not a 2-D `role="grid"`. `aria-labelledby` points at the visible `label` when given,
otherwise `aria-label` falls back to the `ariaLabel` input.

**Layout toggle announced** — the built-in `<ino-select-button>` carries its own `radiogroup`/
`radio` semantics. On top of that, a transient `role="status" aria-live="polite"` region speaks
"List view" / "Grid view" on every change and clears after 1s, narrating the *effect* of the choice
on the content below in addition to the control's own native announcement.

**Keyboard** — every interactive element (the layout switch's radios, the paginator's controls) is
covered by that sub-component's own keyboard contract; this component adds no key handling of its
own.

**RTL** — logical properties only; the header row and the `auto-fill`/`minmax` grid both reflow for
the inline axis automatically. No physical-direction glyph exception exists in this component.

---

## Deliberate omissions

Recorded here rather than silently dropped (full detail in `SPEC.md`):

- **`role="grid"` / 2-D cell navigation.** Not carried — the spec row names `role=list/listitem`
  only; `ino-treetable`'s `role=treegrid` is the component that owns 2-D grid semantics.
- **Invalid / disabled / readonly states.** Not carried — see [States](#states) above.
- **Grid-mode mobile port.** Not carried — see Mobile parity below.

## Mobile parity

**Web-first; mobile ships list mode only.** The doc 26 §5 Notes column reads "Port both (list
mode)" — the RN and Flutter ports are a styled `FlatList`/`ListView.builder` over the same item
shape, with no grid layout, no layout switch, and no ported paginator (both mobile tracks already
answer "get more data" with native infinite scroll, the same reasoning `ino-paginator`'s `SPEC.md`
§1 records for its own mobile counterpart). A grid-mode mobile port is a different component and
gets its own issue in a later wave if a product screen needs one. Full reasoning: `SPEC.md` §7.

---

## Usage

```html
<ino-dataview
  [value]="items"
  [(layout)]="layout"
  [paginator]="true"
  [rows]="10"
  [first]="first"
  label="Companies"
  (page)="onPage($event)"
>
  <ng-template inoDataViewListItem let-item>
    <div class="company-row">{{ item.name }}</div>
  </ng-template>
  <ng-template inoDataViewGridItem let-item>
    <div class="company-card">{{ item.name }}</div>
  </ng-template>
</ino-dataview>
```

Import by path — there is no barrel file:

```ts
import { InoDataViewComponent } from './components/dataview/ino-dataview.component';
import { InoDataViewListItemDirective, InoDataViewGridItemDirective } from './components/dataview/ino-dataview.templates';
```
