# `<ino-timeline>` — Timeline

> Parity benchmark: PrimeNG 22.1.1 `Timeline` (`specs/primeng/llms-22.1.1.txt`, line 121).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes the `Timeline` row in
> `docs/brand/16-design-system-parity-vs-echeque-reference.md`, the third Data-group prerequisite
> the 38-component plan missed (alongside `ino-paginator` and `ino-virtual-scroller`, both already
> shipped) — flagged there as a **strong fit for a KYB audit trail**.
> Preview: [`previews/timeline.html`](previews/timeline.html).
> Decisions record: `web/src/app/components/timeline/SPEC.md`.

A chained series of events — a marker + connector rail down one side, event content down the
other — built for the KYB audit trail: who verified what, when, and what the human approver
decided. Data-driven (`value` + three per-event template slots), not fully content-projected: a
`*ngFor`-in-the-host design would force every consumer to hand-roll the marker/connector/side logic
this component exists to own.

**Non-interactive by default**, matching the PrimeNG benchmark — an audit trail is a read-only log.
Setting `interactive` opts a row into a roving-tabindex, arrow-key-navigable listbox for the case a
reviewer needs to pick one entry out of a long trail.

**Web-only by design.** The component is more content-projection-heavy (three `ng-template` slots)
than `ino-virtual-scroller`, whose own web-only decision (INO-129) this one extends the reasoning
from. See SPEC.md §1 for the full argument, including why a "collapse to fixed fields" cheap port
was rejected rather than silently skipped.

---

## API

### Data

| Input | Type | Default | Notes |
|---|---|---|---|
| `value` | `readonly unknown[]` | `[]` | Events, oldest-to-newest or reverse — rendered in the order given |
| `dataKey` | `(item, index) => unknown \| null` | `null` | Identity for `@for` tracking. Defaults to index |
| `markerRole` | `(item, index) => InoTimelineMarkerRole` | `() => 'neutral'` | Resolves each event's marker/connector colour role |

### Layout

| Input | Type | Default | Notes |
|---|---|---|---|
| `layout` | `'vertical' \| 'horizontal'` | `'vertical'` | A real horizontal rail, not vertical CSS rotated — see [Variants](#variants) |
| `align` | `'start' \| 'end' \| 'alternate'` | `'start'` | Logical, not physical — see the type's doc comment. `alternate` zig-zags per row index |

### Presentation

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale — see [Size API](#size-api) |

### States

| Input | Type | Default | Notes |
|---|---|---|---|
| `interactive` | `boolean` | `false` | Opts rows into a focusable, selectable listbox |
| `disabled` | `boolean` | `false` | |
| `readonly` | `boolean` | `false` | |
| `invalid` | `boolean` | `false` | |
| `loading` | `boolean` | `false` | First load (empty `value`) renders skeleton rows; a refresh (non-empty `value`) dims the real rows instead |
| `skeletonCount` | `number` | `3` | Placeholder rows drawn during the first-load loading state |

### Accessibility

| Input | Type | Default | Notes |
|---|---|---|---|
| `ariaLabel` | `string \| null` | `null` | |
| `ariaDescribedBy` | `string \| null` | `null` | |

### Outputs

| Output | Type | Fires when |
|---|---|---|
| `itemSelect` | `{ item, index }` | `interactive` only — click or Enter/Space on the focused row |
| `focusedIndexChange` | `number` | `interactive` only — roving focus moves |

### Template slots

Three structural directives, same rationale `ino-virtual-scroller.templates.ts` records: a
directive selector is a compile-time-checked contract, unlike PrimeNG's stringly-typed `#template`
reference-name convention.

| Directive | Context |
|---|---|
| `[inoTimelineContent]` | `$implicit` = the event, `index` |
| `[inoTimelineOpposite]` | `$implicit` = the event, `index` — typically a timestamp |
| `[inoTimelineMarker]` | `$implicit` = the event, `index`, `role` — the resolved `InoTimelineMarkerRole`, so a custom marker can still key off it |

An event with no `[inoTimelineOpposite]` content leaves that side of the row empty rather than
collapsing the layout, so mixed rows (some events with a timestamp, some without) stay aligned.

### Size API

Reads four Wave 0 control-size aliases (`--ino-control-height`, `--ino-control-font-size`,
`--ino-control-padding-inline`, `--ino-control-gap`) plus a fifth local property scaling the marker
dot off `--ino-control-icon-size-{sm,default,lg}`. `--ino-control-height` only applies as a minimum
target size on `interactive` rows — a read-only row's height is intrinsic to its content. Full
reasoning: `SPEC.md` §4.

---

## Variants

| Named in the issue | Shipped | Surface |
|---|---|---|
| Vertical layout | ✅ | `layout="vertical"` (default) |
| Horizontal layout | ✅ | `layout="horizontal"` — an actual horizontal rail (flex row of column-triplets) |
| `align: start / end / alternate` | ✅ | `align` — zig-zag in both layouts |
| Opposite content | ✅ | `[inoTimelineOpposite]` |
| Custom marker | ✅ | `[inoTimelineMarker]` |
| Marker colour by role | ✅ | `markerRole` resolver → closed union, same shape as `ino-tag`'s `severity` |
| Interactive/selectable rows | ✅ *(beyond PrimeNG)* | `interactive` |
| Loading/skeleton | ✅ *(beyond PrimeNG)* | `loading` + `skeletonCount` |
| React Native / Flutter port | ❌ **web-only decision** | See [Mobile parity](#mobile-parity) |

Deliberately omitted from the PrimeNG benchmark: `[style]`/`[styleClass]` passthrough, and a raw
per-event colour input (closed `markerRole` union instead). Reasons in `SPEC.md` §2.

---

## States

| State | Signal |
|---|---|
| default | `.ino-timeline__row` base rule |
| hover | *(`interactive` only)* `:hover` on the row |
| active / pressed | *(`interactive` only)* `:active` on the row, marker dot swaps to the pressed-accent fill |
| focus-visible | *(`interactive` only)* `--ino-focus-ring` + `--ino-focus-ring-offset`, never hand-rolled |
| disabled | `[data-disabled]` host attr — dims + suppresses pointer events |
| readonly | `[data-readonly]` host attr — stays fully legible; only the hover affordance withdraws |
| invalid | `[data-invalid]` host attr — danger-coloured accent bar per row, border only |
| loading / busy | `aria-busy`; first load → skeleton rows, refresh → dimmed real rows |

Hover/active/focus-visible are gated behind `interactive` on purpose: a non-interactive row accepts
no pointer/keyboard gesture, so drawing feedback for one would misrepresent the row's own
affordance. Full reasoning: `SPEC.md` §3.

---

## Accessibility contract

**Role / ARIA** — host is `role="list"` (or `"listbox"` when `interactive`; `null` while empty and
not loading). Rows are `role="listitem"`/`"option"` to match, with `aria-setsize`/`aria-posinset`
set from the true collection length.

**Keyboard** (`interactive` only) — roving tabindex; `ArrowDown`/`ArrowRight` and `ArrowUp`/
`ArrowLeft` (axis follows `layout`) move focus, `Home`/`End` jump to the ends, `Enter`/`Space`
emits `itemSelect`.

**Target size** — `interactive` rows carry `min-block-size: var(--ino-row-min-height, 44px)`,
never below the SC 2.5.8 24px floor at any density rung. Non-interactive rows are exempt.

**Contrast** — marker role colours and the invalid-state accent bar reuse `check-theme-parity.mjs`-
audited role pairs; no new colour role was introduced.

**RTL** — logical properties only; row ordering uses the CSS `order` property inside a flex
container, which resolves against the container's own inline/block axis and therefore flips
automatically under `dir="rtl"` — one code path for the `alternate` zig-zag in both directions.
Full reasoning: `SPEC.md` §6.

---

## Deliberate omissions

Recorded here rather than silently dropped (full detail in `SPEC.md` §2):

- **`[style]`/`[styleClass]` passthrough.** Same Layer-4 escape-hatch reasoning every INO-31
  component through this DoD records.
- **Raw per-event marker colour.** Closed `markerRole` union instead, so every theme repaints for
  free and the token pair stays auditable.

## Mobile parity

**Web-only.** See `SPEC.md` §1 for the full reasoning: unlike `ino-virtual-scroller` and
`ino-paginator`, whose web-only decisions rest on a strictly-better native equivalent already
existing (`FlatList`/`ListView.builder`, native infinite scroll), this component's three
content-projection template slots are two-thirds of its public surface and have no honest
cross-platform equivalent — a literal port would require inventing a different API per platform,
and a "collapse to fixed fields" cheap port would silently drop the feature that makes this
component worth having. The mobile counterpart is a **different component**, built directly on
each platform's own list primitive, and gets its own issue in a later wave.

---

## Usage

```html
<ino-timeline
  [value]="auditEvents"
  [markerRole]="resolveRole"
  align="alternate"
  interactive
  (itemSelect)="onSelect($event)"
>
  <ng-template inoTimelineOpposite let-event>
    <time>{{ event.at | date: 'short' }}</time>
  </ng-template>
  <ng-template inoTimelineContent let-event>
    <p>{{ event.summary }}</p>
  </ng-template>
</ino-timeline>
```

Import by path — there is no barrel file:

```ts
import { InoTimelineComponent } from './components/timeline/ino-timeline.component';
import { INO_TIMELINE_TEMPLATES } from './components/timeline/ino-timeline.templates';
```
