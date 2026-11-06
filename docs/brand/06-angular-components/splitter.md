# `<ino-splitter>` — Splitter

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-splitter` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-445](/INO/issues/INO-445).
> Parity benchmark: PrimeNG 22.1.1 `Splitter`/`SplitterPanel` — PrimeNG is a benchmark,
> **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/splitter/SPEC.md`.

Resizable panes for dashboard layouts. Content-projected `<ino-splitter-panel>` children lay out
in a flex row (`orientation="horizontal"`) or column (`"vertical"`), divided by drag/keyboard
resizable gutters. Implements the WAI-ARIA `separator` pattern on each gutter: `role="separator"`
with `aria-orientation`/`aria-valuenow`/`-valuemin`/`-valuemax`, Arrow-key resize, Home/End to
snap a panel to its floor.

---

## API

### `<ino-splitter>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Panel flow axis — the gutter's own `aria-orientation` is the inverse (see Accessibility contract) |
| `resizeStep` | `number` | `5` | Percentage points moved per Arrow-key press on a focused gutter |
| `disabled` | `boolean` | `false` | Dims the whole splitter, inert, gutters drop out of the tab order |
| `readonly` | `boolean` | `false` | Gutters stay focusable; drag/keyboard resize/collapse all no-op |

| Output | Payload | Fires |
|---|---|---|
| `sizesChange` | `number[]` (percentages, index-aligned to panel order) | On pointerup/keyup/collapse-toggle, not on every intermediate drag frame |
| `panelCollapsedChange` | `{ index: number; collapsed: boolean }` | When a collapse toggle changes a panel's collapsed state |

### `<ino-splitter-panel>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `number \| null` | `null` | Initial percentage of the main axis; omit to split evenly among every panel that also omits it |
| `minSize` | `number` | `0` | Floor, as a percentage of the main axis, a drag/keyboard resize on either gutter never pushes it below |
| `collapsible` | `boolean` | `false` | Renders a collapse/expand toggle on this panel's nearer gutter |

---

## Variants/Structure

**Horizontal** (default) — panels side by side, vertical gutter lines, resize moves panels
left/right.

**Vertical** — panels stacked, horizontal gutter lines, resize moves panels up/down.

**Nested** — an `<ino-splitter>` placed inside an `<ino-splitter-panel>`'s projected content is
just another descendant; no special wiring. A vertical splitter nested inside one panel of a
horizontal splitter (editor/console split inside a main-content pane) is the canonical dashboard
shape and needs zero extra code (SPEC.md §1).

**Min sizes** — `minSize` on each panel is a hard floor in both the drag and keyboard resize
paths; `resizeGutter`'s single clamp function (SPEC.md §3) guarantees neither side of a gutter
can be pushed below its own floor, and the two panels' combined total never changes from one
resize.

**Collapse handles** — a `collapsible` panel's toggle button renders on its nearer gutter: the
gutter right after it for every panel except the last, whose toggle renders on the gutter right
before it (SPEC.md §5). Collapsing hands the panel's current share to that neighbour; expanding
restores up to its pre-collapse size.

---

## States

**Default** — gutter renders a 1px line (`--ino-color-border`), transparent background.

**Hover** — gutter background `--ino-color-surface-hover`, line recolors to `--ino-color-accent`;
any collapse toggle on it fades in.

**Focus-visible** — `outline: var(--ino-focus-ring)` inset on the gutter; same line recolor as
hover.

**Active** — `background: --ino-color-surface-active` on pointer-down.

**Dragging** (the spec row's state beyond the §2 standard set) — same visual as active, plus
`document.body` carries a resize-cursor class for the whole drag so the cursor doesn't flicker
once the pointer strays off the gutter's own thin hit area under pointer capture (SPEC.md §6).

**Disabled** — `opacity: 0.5`, `pointer-events: none` on the host; every gutter drops out of the
tab order (`tabindex="-1"`, `aria-disabled="true"`).

**Readonly** — gutters stay in the tab order with their visible hover/focus affordances, but
drag/Arrow/Home/End/collapse all no-op — "focusable but inert," the same contract `ino-tabs`'s own
`readonly` documents.

**Invalid/error** — deliberate omission. A layout splitter has no bound value to validate; the
`separator` pattern defines no error state.

**Loading** — deliberate omission. No async "splitter is loading" state independent of whichever
panel's own projected content is or isn't ready.

**Empty** — zero or one panel resolves to zero gutters; a single panel's `flexBasis` is forced to
100% regardless of its own `size`.

---

## Sizing

No `sm`/`default`/`lg` scale, per the spec row — "Sizing: gutter tokens" is satisfied by reusing
two existing tokens rather than inventing new ones (tokens.css is frozen after Wave 0, the same
constraint `ino-slider`'s own thumb/track sizing names):

- `--ino-target-min` (24px, WCAG 2.2 SC 2.5.8) — the gutter's interactive hit width.
- `--ino-border-width-hairline` (1px) — the gutter's visible line thickness, the same token
  `ino-divider` already uses for an on-screen dividing line.

Both are density-invariant (same reasoning `ino-divider`'s own `--ino-border-width-*` tokens and
`ino-context-menu`/`ino-menu`'s `-compact` tier already use) — dense and fluid render identically.

---

## Labels

N/a, per the spec row — a splitter divides layout, it doesn't name a value. Each collapse toggle
still carries its own dynamic `aria-label` ("Collapse panel before gutter" / "Expand panel after
gutter", etc.).

---

## Accessibility contract

**Role / ARIA** — each gutter is `role="separator"`, always in the tab order. `aria-orientation`
is the gutter's own rendered line direction — **inverted** from the `[orientation]` input, which
names the panels' flow axis: a horizontal splitter's gutter is a vertical line, so it carries
`aria-orientation="vertical"`, and vice versa (SPEC.md §4). `aria-valuenow`/`-valuemin`/`-valuemax`
are the before-panel's current/min/max share — the same units Home/End/Arrow keys move.

**Keyboard** — on a focused gutter: ArrowLeft/ArrowRight (horizontal) or ArrowUp/ArrowDown
(vertical) resize by `resizeStep`; Home collapses the panel before the gutter to its `minSize`;
End pushes the panel after it down to its own `minSize`. RTL flips the horizontal mapping to match
the visual direction. Collapse toggles are plain `<button>`s — Tab/Enter/Space, no custom
handling.

**`readonly` is `data-readonly`, not `aria-readonly`.** Per ARIA 1.2, `role="separator"` does not
support `aria-readonly` (nor `aria-invalid`, nor `aria-expanded`) — only `aria-disabled` and the
generic global states. `readonly` is therefore a plain `data-readonly` styling/behaviour hook, the
same choice `ino-tabs.component.html`'s own `role="tablist"` already made for the identical reason
(SPEC.md §4).

**Contrast** — gutter line/background, focus ring, and collapse-toggle colors all resolve through
tokens audited across all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`inset-inline-start`, `inset-block-start`). No `left`/`right`/
`top`/`bottom` in the stylesheet. Drag delta sign and the Arrow-key forward/backward mapping both
flip under `dir="rtl"` for a horizontal splitter (vertical orientation has no RTL concern — block
direction is unaffected by `dir`).

**State announcements** — `aria-disabled="true"` (disabled splitter), `aria-valuetext` on every
gutter (e.g. "40%"), `aria-expanded`/`aria-label` on every collapse toggle.

---

## Deliberate omissions

**PrimeNG mapping.** PrimeNG 22.1.1 `Splitter`'s `layout` input maps to `orientation` here;
`SplitterPanel`'s `size`/`minSize` map directly onto `<ino-splitter-panel>`'s own inputs of the
same name. PrimeNG's `gutterSize`/`step` props are replaced by this component's token-driven
gutter sizing (Sizing, above) and `resizeStep`.

**No runtime-safe panel add/remove.** `ContentChildren.changes` always re-runs the initial
even/explicit distribution from scratch — a panel added or removed at runtime resets every
sibling's width rather than preserving an in-progress user resize across the structural change.
See `SPEC.md` §7.

**Dragging a gutter next to a collapsed panel is blocked, not auto-expanding.** The explicit
collapse toggle is the one documented way to bring a collapsed panel back.

**No `invalid`/`loading` states.** See States, above.

---

## Mobile parity

No mobile ports (per the spec row's "Web-only (dashboards)" disposition). Neither React Native
nor Flutter ships a resizable-pane idiom for the phone/tablet form factor this catalog's mobile
ports target — a drag-to-resize gutter is a pointer-precision, large-viewport interaction with no
equivalent touch affordance at typical mobile widths. See `SPEC.md` §8.

---

## Usage examples

### Basic horizontal splitter

```html
<ino-splitter orientation="horizontal" style="block-size: 400px;">
  <ino-splitter-panel [size]="30" [minSize]="15">Sidebar</ino-splitter-panel>
  <ino-splitter-panel [size]="70" [minSize]="30">Main content</ino-splitter-panel>
</ino-splitter>
```

### Nested splitters

```html
<ino-splitter orientation="horizontal" style="block-size: 400px;">
  <ino-splitter-panel [size]="25" [minSize]="15">Navigation</ino-splitter-panel>
  <ino-splitter-panel [size]="75" [minSize]="30">
    <ino-splitter orientation="vertical">
      <ino-splitter-panel [minSize]="20">Editor</ino-splitter-panel>
      <ino-splitter-panel [minSize]="20">Console</ino-splitter-panel>
    </ino-splitter>
  </ino-splitter-panel>
</ino-splitter>
```

### Collapsible sidebar

```html
<ino-splitter
  orientation="horizontal"
  style="block-size: 400px;"
  (sizesChange)="onSizesChange($event)"
  (panelCollapsedChange)="onPanelCollapsedChange($event)"
>
  <ino-splitter-panel [size]="25" [minSize]="15" [collapsible]="true">Sidebar</ino-splitter-panel>
  <ino-splitter-panel [size]="75" [minSize]="30">Main content</ino-splitter-panel>
</ino-splitter>
```

```typescript
onSizesChange(sizes: number[]) {
  console.log('Panel sizes (%):', sizes);
}

onPanelCollapsedChange(event: { index: number; collapsed: boolean }) {
  console.log(`Panel ${event.index} is now ${event.collapsed ? 'collapsed' : 'expanded'}`);
}
```
