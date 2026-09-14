# `<ino-virtual-scroller>` — Virtual Scroller

> Parity benchmark: PrimeNG 22.1.1 `VirtualScroller` (`specs/primeng/llms-22.1.1.txt`, line 130).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes the `VirtualScroller` row in
> `docs/brand/16-design-system-parity-vs-echeque-reference.md`, a prerequisite for **H-2**
> (Table / dense data component).
> Preview: [`previews/virtual-scroller.html`](previews/virtual-scroller.html).
> Decisions record: `web/src/app/components/virtual-scroller/SPEC.md`.

Renders only the slice of a collection that is actually on screen. Built for INO-155 (Table): a KYB
result set is routinely tens of thousands of rows, and the decision that makes the Table issue
tractable is that row windowing lives **here, once**, rather than inside the Table's own rendering
path.

**Web-only by design.** The mobile tracks have platform-native equivalents (`FlatList`,
`ListView.builder`) that are strictly better than a port would be — see SPEC.md §1 for the full
reasoning and the three desktop-idiom features that have no mobile counterpart.

---

## Why it is not a `for` loop with `overflow: auto`

Three things a naive windowing implementation does not do:

- **Variable item extent.** `autoSize` seeds every item from an estimate (or `itemSizeFn`), corrects
  it from real post-render measurement, and **anchors** the scroll offset so that correcting an item
  *above* the fold does not yank the content under the reader's eye.
- **Scroll-position restoration.** `scrollRestorationKey` persists the logical offset across
  destroy/recreate — the reviewer who opens a company file from row 4,120 and comes back lands on
  row 4,120, not on row 1.
- **RTL correctness.** Offsets are logical throughout; `scrollLeft` is normalised on read and
  de-normalised on write, so an Arabic or Hebrew locale scrolls the right way with no second code
  path.

The scroll math lives in `virtual-axis.ts`, deliberately free of Angular and of the DOM — it is the
part most worth being able to reason about (and unit-test) in isolation. Fixed mode is pure
arithmetic with **no per-item allocation at all**, which is why a 100k-row set needs no size table
in memory. Auto mode keeps a lazily-rebuilt prefix-sum table: a correction at index 9,000 does not
re-sum indices 0–8,999 until something actually asks for an offset past 9,000.

---

## API

### Data

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `readonly unknown[]` | `[]` | Row-major 2-D array in `orientation="both"`; may be sparse in `lazy` mode |
| `itemSize` | `number` | `0` | Fixed block extent, px. **0 inherits the `size` × density control-height scale — the recommended setting** |
| `columnSize` | `number` | `0` | Fixed inline extent, px. 0 inherits the scale |
| `columns` | `number` | `0` | Grid only. 0 derives it from the widest rendered row |
| `orientation` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | |
| `autoSize` | `boolean` | `false` | Measure each rendered item and correct the offset table |
| `estimatedItemSize` | `number` | `0` | `autoSize` seed. 0 inherits the scale. Affects first-paint accuracy only |
| `itemSizeFn` | `(item, index) => number \| null` | `null` | Per-item seed — cheaper than a wrong global estimate when extents are known up front |
| `buffer` | `number` | `4` | Items rendered beyond each viewport edge. Trades memory for blank-on-fling resistance |
| `trackBy` | `(index, item) => unknown \| null` | `null` | Defaults to the absolute index |

### Presentation

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Drives row extent, padding, font size and gap off the Wave 0 control scale |
| `scrollHeight` | `string \| null` | `null` | Any CSS length. Null lets the host box decide — which is what Table wants |
| `scrollWidth` | `string \| null` | `null` | |
| `delay` | `number` | `0` | ms to coalesce scroll events. 0 renders every frame |

### Lazy + states

| Input | Type | Default | Notes |
|---|---|---|---|
| `lazy` | `boolean` | `false` | |
| `totalRecords` | `number` | `0` | True collection length when `items` holds only the loaded window |
| `loading` | `boolean` | `false` | Sets `aria-busy` |
| `showLoader` | `boolean` | `false` | Draw placeholder rows while loading |
| `loaderItemCount` | `number` | `0` | 0 fills the current window |
| `disabled` / `readonly` / `invalid` | `boolean` | `false` | See the state table below |

### Accessibility + persistence

| Input | Type | Default | Notes |
|---|---|---|---|
| `role` | `string` | `'group'` | `list` when the rows are a list; `presentation` when an ancestor owns semantics |
| `itemRole` | `string \| null` | `'listitem'` | Must pair with `role` |
| `ariaLabel` / `ariaDescribedBy` | `string \| null` | `null` | |
| `scrollRestorationKey` | `string \| null` | `null` | `sessionStorage` key. Null disables persistence |
| `scrollOptions` | `{ behavior?, align? }` | `{ behavior: 'auto', align: 'start' }` | Defaults for `scrollToIndex()` |

### Outputs

| Output | Type | Fires when |
|---|---|---|
| `lazyLoad` | `{ first, last, firstColumn, lastColumn }` | The rendered window moves, in `lazy` mode |
| `rangeChange` | `{ first, last }` | The rendered window moves |
| `scrollPositionChange` | `{ block, inline }` | A user scroll settles. `inline` is `>= 0` even in RTL |
| `scrollEnd` | `void` | The last item enters the window |

### Methods

| Method | Notes |
|---|---|
| `scrollToIndex(index, options?)` | `align: 'start' \| 'center' \| 'end' \| 'auto'`. Honours `prefers-reduced-motion` |
| `getScrollPosition()` / `setScrollPosition(pos, behavior?)` | Logical offsets |
| `saveScrollPosition()` / `restoreScrollPosition()` | `restore` returns `false` and retries next render while the content is still shorter than the saved offset, so a restore issued before data arrives is not silently clamped to the bottom of a short list |
| `refresh()` | Drop every cached measurement and re-seed |

### Template slots

| Directive | Context |
|---|---|
| `[inoVirtualScrollerItem]` | `$implicit`, `index`, `count`, `columnOffset`, `columnSize`, `even`, `odd` |
| `[inoVirtualScrollerLoader]` | `$implicit` = null, `index`, `count` |
| `[inoVirtualScrollerEmpty]` | — |
| `[inoVirtualScrollerHeader]` | — renders **outside** the scroll port |
| `[inoVirtualScrollerFooter]` | — renders **outside** the scroll port |

---

## Variants

| `orientation` | Behaviour |
|---|---|
| `vertical` | Block-axis windowing. The Table case |
| `horizontal` | Inline-axis windowing. Columns rather than rows |
| `both` | Grid. Both axes windowed; the item template receives the visible **column slice** of its row |

Omitted from the benchmark on purpose: `[style]`/`[styleClass]` passthrough inputs, and PrimeNG's
`#content` whole-viewport slot. Reasons in SPEC.md §2.

---

## States

All eight, carried by one inherited custom property (`--ino-vs-border`) that each state rebinds —
specificity does the arbitration, so invalid-while-hovered and readonly-while-pressed cannot
silently disagree.

| State | Signal |
|---|---|
| default | `--ino-color-border` |
| hover | `--ino-color-on-surface-muted` |
| active / pressed | `--ino-color-accent-active` — acknowledges that the scrollbar drag landed on *this* container, not an ancestor |
| focus-visible | `--ino-focus-ring` + `--ino-focus-ring-offset`, never hand-rolled |
| disabled | Scrolling genuinely suppressed (`overflow: hidden`, `pointer-events: none`), not merely dimmed |
| readonly | Stays scrollable and legible; only the hover/press affordances are withdrawn. **Focus ring unaffected** |
| invalid | `--ino-color-danger` border only — the fill stays neutral so row content keeps its audited contrast against `surface-sunken` |
| loading / busy | `aria-busy` + shimmer skeleton (built-in when no loader template is projected) |

---

## Accessibility contract

Full contract in SPEC.md §4. The two decisions worth repeating here:

1. **`aria-setsize` / `aria-rowcount` report the true collection length, not the rendered window.**
   Without this the a11y tree says "item 3 of 30" when it is item 3 of 100,000 — the most common
   virtual-scroller a11y defect. `lazy` with an unknown total reports `-1` ("size unknown") rather
   than inventing a number.
2. **A polite live region names the rendered window** ("Items 4,120 to 4,149 of 100,000"). A sighted
   user reads virtualization off the scrollbar; this is the equivalent signal.

Keyboard: `↑`/`↓` by item, `←`/`→` by column (**direction-aware in RTL**), `PageUp`/`PageDown` by
viewport, `Home`/`End`, `Ctrl+Home`/`Ctrl+End` for the inline axis. The viewport is focusable
because a mouse-only scroll container is a keyboard trap for the content inside it (SC 2.1.1).

Targets: rows are at least `--ino-row-min-height` (32px dense, above the SC 2.5.8 24px floor);
`size="default"` in fluid density resolves to the comfortable 44px.

---

## Motion

- Border-colour state changes use `--ino-motion-duration-fast` + `--ino-motion-easing-standard`.
- The loading shimmer uses `--ino-motion-duration-slow` + `--ino-motion-easing-standard`, scoped to
  `prefers-reduced-motion: no-preference`. Under `reduce` it inherits the flat bar: the loading
  state stays fully perceivable, it simply stops moving.
- The JS half of the same rule is in `resolveBehavior()` — a programmatic smooth scroll is
  vestibular motion too, and is downgraded to `'auto'` under the same query.

---

## Usage

```html
<ino-virtual-scroller
  [items]="entities"
  size="default"
  scrollHeight="480px"
  role="list"
  itemRole="listitem"
  ariaLabel="Screened entities"
  scrollRestorationKey="kyb-results"
  [buffer]="6"
  (rangeChange)="onRangeChange($event)"
>
  <div *inoVirtualScrollerHeader>{{ entities.length | number }} entities</div>

  <ng-template inoVirtualScrollerItem let-entity let-i="index">
    <span class="cell-index">{{ i + 1 }}</span>
    <span class="cell-name">{{ entity.name }}</span>
  </ng-template>

  <div *inoVirtualScrollerEmpty>No entities match these filters.</div>
</ino-virtual-scroller>
```

Lazy, with a known total and skeleton rows:

```html
<ino-virtual-scroller
  [items]="window"
  [lazy]="true"
  [totalRecords]="1_000_000"
  [loading]="isLoading"
  [showLoader]="true"
  (lazyLoad)="fetch($event.first, $event.last)"
>
  <ng-template inoVirtualScrollerItem let-row>{{ row.name }}</ng-template>
</ino-virtual-scroller>
```

Import by path — there is no barrel file:

```ts
import { InoVirtualScrollerComponent } from './components/virtual-scroller/ino-virtual-scroller.component';
import { INO_VIRTUAL_SCROLLER_TEMPLATES } from './components/virtual-scroller/ino-virtual-scroller.templates';
```
