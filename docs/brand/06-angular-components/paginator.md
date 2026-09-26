# `<ino-paginator>` — Paginator

> Parity benchmark: PrimeNG 22.1.1 `Paginator` (`specs/primeng/llms-22.1.1.txt`, line 92).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes the `Paginator` row in
> `docs/brand/16-design-system-parity-vs-echeque-reference.md`, a prerequisite for **H-2**
> (Table / dense data component) alongside `ino-virtual-scroller` (already shipped).
> Preview: [`previews/paginator.html`](previews/paginator.html).
> Decisions record: `web/src/app/components/paginator/SPEC.md`.

A Table prerequisite the original 38-component plan omitted entirely. Page links, first/prev/next/
last, a rows-per-page select, a current-page report, and a jump-to-page input — a controlled
component: it never mutates a paged dataset itself, every navigation gesture round-trips through
`(pageChange)`.

**Web-only by design.** A row of numbered page-link buttons is a desktop/pointer-and-keyboard idiom;
both mobile tracks answer "get more data" with native infinite scroll instead. See SPEC.md §1 for
the full reasoning.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `totalRecords` | `number` | `0` | Total collection length |
| `rows` | `number` | `10` | Page size |
| `first` | `number` | `0` | 0-based index of the first visible record — the PrimeNG `first` convention |
| `rowsPerPageOptions` | `number[]` | `[]` | Empty hides the rows-per-page select entirely |
| `pageLinkSize` | `number` | `5` | Numbered page links shown before collapsing into `…` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale — see [Size API](#size-api) |
| `ariaLabel` | `string` | `'Pagination'` | Host `aria-label`; override when a page has more than one paginator |
| `currentPageReportTemplate` | `string` | `'{first}–{last} of {totalRecords}'` | `{first}`/`{last}`/`{rows}`/`{page}`/`{pageCount}`/`{totalRecords}` placeholders |
| `disabled` | `boolean` | `false` | Native `disabled` on every control + dimmed |
| `readonly` | `boolean` | `false` | Controls stay focusable and undimmed; navigation no-ops. See [States](#states) |
| `loading` | `boolean` | `false` | `aria-busy`; controls disabled while a page fetch is in flight |
| `showFirstLastIcon` | `boolean` | `true` | Toggles the outer First/Last buttons; Prev/Next always render |
| `showCurrentPageReport` | `boolean` | `false` | |
| `showJumpToPageInput` | `boolean` | `false` | |
| `alwaysShow` | `boolean` | `true` | `false` hides the host entirely while there's only one page |

### Outputs

| Output | Type | Fires when |
|---|---|---|
| `pageChange` | `{ page, first, rows, pageCount }` | Any navigation gesture commits a new page or page size |
| `firstChange` | `number` | Companion to `pageChange`, for a plain `[(first)]` two-way binding |
| `rowsChange` | `number` | Companion to `pageChange`, fires only when the rows-per-page select changes |

### Size API

Reads all six Wave 0 control-size aliases, including `--ino-control-height` — every button here is a
real interactive control, unlike `ino-tag`'s label-only subset. `size="default"` in fluid density
resolves to 44px (`--ino-target-comfortable`). Full reasoning: `SPEC.md` §4.

---

## Variants

| Named in the issue | Shipped | Surface |
|---|---|---|
| Page links | ✅ | `pageLinks` sliding window, `pageLinkSize` |
| First / last | ✅ | `showFirstLastIcon` |
| Rows-per-page select | ✅ | `rowsPerPageOptions` |
| Current-page report | ✅ | `showCurrentPageReport` + `currentPageReportTemplate` |
| Compact mobile form | ❌ **web-only decision** | See SPEC.md §1 — a different component, later wave |

Deliberately omitted from the PrimeNG benchmark: arbitrary template-segment reordering (fixed layout
order instead) and an overlay-portaled rows-per-page dropdown (plain native `<select>`). Reasons in
`SPEC.md` §2.

---

## States

| State | Signal |
|---|---|
| default | `.ino-paginator__btn` base rule |
| hover | `:hover:not(:disabled)` per button |
| active / pressed | `:active:not(:disabled)`, pressed-accent foreground |
| focus-visible | `--ino-focus-ring` + `--ino-focus-ring-offset`, never hand-rolled |
| disabled | Native `disabled` attribute on every control + `[data-disabled]` host dim |
| readonly | Stays focusable and undimmed; only the hover affordance withdraws. Handlers no-op rather than the control leaving the tab order |
| loading / busy | `aria-busy` + lighter dim + `cursor: progress`; controls disabled while a fetch is in flight |
| invalid | **Deliberately N/A** — a navigation control has no form-validity concept. `SPEC.md` §3 |

---

## Accessibility contract

**Role / ARIA** — host is `role="navigation"` `aria-label="Pagination"` (override via `ariaLabel`).
The active page link carries `aria-current="page"`; every icon-only nav button carries an explicit
`aria-label` ("Go to first page", etc). The current-page report is `aria-live="polite"`.

**Keyboard** — every control is a native focusable element in normal tab order; no roving tabindex.
`Enter`/`Space` activates the focused button; the rows-select and jump input use native `<select>`/
`<input type="number">` behavior.

**Contrast** — every nav/page button is square and never below the 24px SC 2.5.8 floor at any size/
density rung; the active page link's fill/on-fill pair and hover/press surfaces reuse role pairs
`check-theme-parity.mjs` already audits.

**RTL** — logical properties only; the flex row mirrors automatically under `dir="rtl"`. The four
nav-icon chevrons are a recorded, deliberate physical-direction exception (glyph chirality can't be
expressed with logical properties) — flipped via `:host-context([dir='rtl'])`. Full reasoning:
`SPEC.md` §6.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6, full detail in `SPEC.md` §2):

- **Arbitrary template-segment composition.** Fixed layout order (report → rows-per-page → links →
  jump) behind boolean/string `@Input`s instead of PrimeNG's free-form `[template]` slotting.
- **Invalid state.** Not carried — see [States](#states) above.
- **Compact mobile form.** Web-only; see `SPEC.md` §1.

## Mobile parity

**Web-only.** See `SPEC.md` §1 for the full reasoning. The mobile counterpart is a different
component and gets its own issue in a later wave; nothing in `check-theme-parity.mjs`'s mobile-port
palette audit is affected by this issue.

---

## Usage

```html
<ino-paginator
  [totalRecords]="248"
  [rows]="rows"
  [first]="first"
  [rowsPerPageOptions]="[10, 25, 50]"
  [showCurrentPageReport]="true"
  ariaLabel="Pagination, users table"
  (pageChange)="onPageChange($event)"
></ino-paginator>
```

Import by path — there is no barrel file:

```ts
import { InoPaginatorComponent } from './components/paginator/ino-paginator.component';
```
