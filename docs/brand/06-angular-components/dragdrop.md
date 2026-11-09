# `<ino-dragdrop>` — Drag-and-drop

> **Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 row
> "ino-dragdrop" (rev-2 amendment `a21a93c`).
> **Board approval:** `f55baa72` on INO-377.
> **Issue:** INO-491 (INO-31 Phase B5).
> **Parity benchmark:** PrimeNG 22.1.1 `pDraggable` + `pDroppable` directives (no single
> DragDrop component; two separate capabilities that compose). PrimeNG is a benchmark,
> **not a runtime dependency** — nothing here imports it.
> **Decisions record:** `web/src/app/components/dragdrop/SPEC.md`.

Two composable directives — `[inoDraggable]` (source) and `[inoDroppable]` (target) — wire
mouse, touch, and keyboard interaction onto a pair of elements, plus a `[inoDropHandle]` child
directive to restrict drag initiation to a named handle and a `[inoDropZone]` decorative
styling directive. `<ino-dragdrop>` is a convenience wrapper that composes the two directives
for the common two-list "pick items, place them in a zone" case; the directives render no
visible affordance of their own — styling and visual feedback are the caller's responsibility.
The core contract: keyboard operation is full parity with mouse/touch, not a fallback, reachable
in one key chord.

---

## API

### `<ino-dragdrop>` (two-list convenience wrapper)

| Input | Type | Default | Notes |
|---|---|---|---|
| `sourceLabel` / `targetLabel` | `string` | `'Available'` / `'Selected'` | Column headings, wired via `aria-labelledby` on each zone |
| `sourceItems` / `targetItems` | `InoDragDropItem[]` | `[]` | `{ label, value, disabled? }`; array order is authoritative, a move clones both arrays and emits change events, never mutates in place |
| `maxItems` | `number` | `Infinity` | Target-zone capacity; drops beyond it are rejected with "full" feedback |
| `disabled` | `boolean` | `false` | Neither zone accepts drag or drop interaction |
| `(sourceItemsChange)` / `(targetItemsChange)` | `EventEmitter<InoDragDropItem[]>` | — | Emitted after every move |
| `(moved)` | `EventEmitter<InoDragDropItem>` | — | Emitted once per successful source → target move (not on the return path) |

### `[inoDraggable]` / `[inoDroppable]` / `[inoDropHandle]` / `[inoDropZone]` (compose directly)

| Directive | Input | Type | Default | Notes |
|---|---|---|---|---|
| `[inoDraggable]` | `inoDraggable` | `any` | — | Payload carried to the drop handler |
| `[inoDraggable]` | `inoDraggableDisabled` | `boolean` | `false` | Cannot be dragged |
| `[inoDraggable]` | `inoDraggableHandle` | `string` (CSS selector) | — | Restrict drag initiation to a matching child; a `[inoDropHandle]` descendant does this automatically without one |
| `[inoDroppable]` | `inoDroppable` | `any[]` | `[]` | Items currently in this zone (count + render source) |
| `[inoDroppable]` | `inoDroppableAccept` | `(data) => boolean` | `() => true` | Per-drop accept predicate |
| `[inoDroppable]` | `inoDroppableMaxItems` | `number` | `Infinity` | Zone capacity |
| `[inoDroppable]` | `inoDroppableDisabled` | `boolean` | `false` | Zone rejects all drops |
| `[inoDroppable]` | `inoDroppableEffect` | `'move' \| 'copy' \| 'link'` | `'move'` | Sets `aria-dropeffect` |
| `(inoDraggableOnDragStart)` / `(inoDraggableOnDragEnd)` | `EventEmitter` | — | Drag lifecycle (mouse or keyboard) |
| `(inoDroppableOnDrop)` / `(inoDroppableOnReject)` | `EventEmitter` | — | Drop outcome; reject carries `reason: 'full' \| 'rejected' \| 'disabled'` |

Full input/output reference: `SPEC.md` §4.

### Variants (structure)

- **`[inoDraggable]` + `[inoDroppable]`** — the two required composable directives; every other
  piece layers on top of this pair.
- **`[inoDropHandle]`** — named drag handle: restricts drag initiation to one child element so
  the rest of the row stays selectable/clickable text.
- **`[inoDropZone]`** — visual-only drop-zone affordance (styling hook, no data binding) for a
  decorative wrapper near a real `[inoDroppable]`.
- **`<ino-dragdrop>`** — the two-list convenience composition; for any other shape (nested zones,
  non-list layouts) compose the directives directly.

### Structure (anatomy, `<ino-dragdrop>`)

```
ino-dragdrop
└── .ino-dragdrop__body
    ├── .ino-dragdrop__column (source)
    │   ├── .ino-dragdrop__heading
    │   └── ul.ino-dragdrop__list[inoDroppable]
    │       └── li.ino-dragdrop__item[inoDraggable] (one per item, or .ino-dragdrop__empty)
    └── .ino-dragdrop__column (target)
        ├── .ino-dragdrop__heading
        ├── ul.ino-dragdrop__list[inoDroppable]
        │   └── li.ino-dragdrop__item[inoDraggable] (one per item, or .ino-dragdrop__empty)
        └── .ino-dragdrop__count (only when maxItems is finite)
```

## States

| State | Behavior |
|---|---|
| default (idle) | `aria-grabbed="false"` on every draggable item |
| hover | Pointer over a valid drop zone — caller-styled via `ino-drop-zone-active` |
| focus-visible | Keyboard focus ring on the focused draggable or drop zone |
| active | Mouse button held on a draggable (native `dragstart` → `dragend`) |
| disabled | Item or zone cannot be dragged/dropped; `aria-disabled` on zones |
| readonly | N/A — "read-only drag-drop" has no meaning; use `disabled` |
| invalid | A rejected drop announces the reason (`full`/`rejected`/`disabled`); no persistent invalid state |
| loading | N/A — no async source feeds the directives directly |
| empty | A zone with no items shows its `.ino-dragdrop__empty` message |
| **dragging** (spec-seed extra) | Item is being carried — `aria-grabbed="true"`, `ino-dragging-active` class |
| **over-target** (spec-seed extra) | Pointer or keyboard focus is over a valid drop zone — `ino-drop-zone-active` class |
| **dropped-flash** (spec-seed extra) | 200ms high-contrast pulse (`ino-dropped-flash` class) on both source and target after a successful drop |

## Labels and fields

Neither the directives nor `<ino-dragdrop>` own a label/help/error text contract of their own —
whatever is dragged or dropped keeps its own labeling. `<ino-dragdrop>`'s `sourceLabel`/
`targetLabel` are column headings wired to each zone via `aria-labelledby`, not form-field
labels. Every draggable and droppable needs an `aria-label` or `aria-labelledby`; the directive
auto-labels an unlabeled draggable `"Draggable item"` as a floor, but the caller should supply a
real one (`<ino-dragdrop>`'s template sets `aria-label` from each item's `label` field).

## Accessibility contract

**Roles / ARIA** — `[inoDraggable]` hosts get `role="button"`, `tabindex="0"`, native
`draggable="true"`, and `aria-grabbed` (`"true"` while carrying, else `"false"`).
`[inoDroppable]` hosts get `role="region"` (preserved if the caller already set one — e.g. a
`<ul>` keeps `role="list"`) and `aria-dropeffect` (`move`/`copy`/`link`). Both carry
`aria-label`/`aria-labelledby` (caller-provided) and optionally `aria-describedby`.

**Keyboard** — full parity with mouse, not a fallback (`SPEC.md` §3.1): Tab to a draggable,
**Space** or **Enter** picks it up (`aria-grabbed="true"`), **arrow keys** or **Tab** move
through drop zones in DOM order, **Enter** on a focused zone drops, **Escape** aborts and
returns focus to the source. RTL: arrow semantics are logical (toward document start/end), not
physical left/right.

**`aria-live` announcements** — a single polite, atomic region (one per app, created on first
use) announces every state change: pick-up, each zone visited while carrying (available/full/
disabled), successful drop, rejected drop (with reason), and cancel. The region clears and
re-writes on each event so repeated identical text is still announced (`SPEC.md` §3.3).

**Contrast** — the directives paint no text or non-text content; the visual feedback classes
(`ino-dragging-active`, `ino-drop-zone-active`, `ino-dropped-flash`) are caller-styled.
`<ino-dragdrop>`'s own styling of them uses role tokens (`--ino-color-accent`,
`--ino-color-success`, `--ino-color-border`) in all 3 themes, both densities.

## Deliberate omissions

- **Sizing (sm/md/lg + dense/fluid)** — the directives have no intrinsic size; the dragged and
  dropped elements own their own sizing. (`SPEC.md` §2 row 3)
- **Labels** — no label/help/error text of the directives' own; see Labels and fields above.
  (`SPEC.md` §2 row 4)
- **Drag-reorder within a single list** — swapping positions inside the same zone is out of
  scope here; that is `ino-orderlist`'s contract (B3). This component covers cross-zone drags
  (source → target), not in-zone reorder.
- **Multi-select drag** — each item is dragged independently; grabbing several at once is not
  supported.
- **Spatial/custom keyboard navigation order** — the default (and only shipped) order is DOM
  order; a visible-order, nearest-neighbor, or caller-custom order is a future extension
  (`SPEC.md` §5.4).

## Mobile parity

**Web-only by spec.** The doc 26 §5 row's mobile disposition for `ino-dragdrop` is "Web-only":
no React Native or Flutter port is planned, and none ships. Touch interactions (long-press,
swipe, pinch) are not defined by this spec — each app surface decides touch UX separately; the
directives do not interfere with touch, so a surface-specific touch handler can coexist.
