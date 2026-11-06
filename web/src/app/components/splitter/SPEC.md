# `<ino-splitter>` — component spec

**Issue:** [INO-445](/INO/issues/INO-445) (INO-31 Phase B2, doc 26 §5 row `ino-splitter`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).
**Parity benchmark:** PrimeNG 22.1.1 `Splitter`/`SplitterPanel` — a benchmark only; nothing in
this component imports it.

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be
written down rather than silently made.

---

## 1. Gutters are an absolute overlay, not DOM siblings of the panels

`<ino-splitter-panel>` children are real content-projected components (`ContentChildren`), the
same container/leaf split `ino-tabs`/`ino-tab-panel` already establishes. Plain `<ng-content>`
cannot interleave extra elements (the gutters) between specific projected nodes without
reparenting them into a `ViewContainerRef` the author never asked for — so the two live in
separate layers instead:

- `.ino-splitter__track` is the real flex row/column; its only children are the projected panels,
  each sized by its own `flex-basis` percentage.
- `.ino-splitter__gutters` is a `position: absolute; inset: 0` sibling overlay. Each gutter is
  positioned at `inset-inline-start`/`inset-block-start: <cumulative percentage>%`, then
  `transform: translateX(-50%)`/`translateY(-50%)` centers it exactly on the seam between its two
  neighbouring panels.

A gutter has **zero footprint in the flex layout** — panels' `flex-basis` values sum to 100% of
the track with no width subtracted for gutters, and the gutter visually straddles the seam on top.
This is also why collapsing a panel to `flex-basis: 0` needs no special-case math: the gutter
after it (whose offset is the cumulative sum up to that point) simply slides to sit flush against
the gutter before it, with no gap.

---

## 2. Sizing model: percentages, honouring explicit `size`, normalized to 100

`InoSplitterPanelComponent.size` (nullable) and `.minSize` are read **once per `ContentChildren`
sync**, not treated as a live two-way binding — the parent is the sole owner of the resolved
`flexBasis` from then on (same "parent writes, child never reads its own `@Input` again after
mount" split `ino-tab-panel.active` already uses, documented on the panel component itself).

Distribution: panels with an explicit `size` get it; the remaining percentage (`100 -
sum(explicit sizes)`, floored at 0) splits evenly across every panel that omitted `size`; the
whole row is then scaled so the total sums to exactly 100 (guards against an author's explicit
sizes not summing to 100, or all of them being omitted). Each panel's resolved share is floored at
its own `minSize` before the final normalization pass.

**Re-sync on `ContentChildren.changes` always runs this distribution from scratch** — a panel
added or removed at runtime resets every sibling to a fresh even/explicit split rather than
attempting to preserve an in-progress user resize across a structural change. See §7.

---

## 3. Keyboard resize and drag share one clamp function

`resizeGutter(gutterIndex, rawBeforeSize)` is the single place that moves a boundary: it computes
the two adjacent panels' combined total, clamps the requested "before" share between that panel's
`minSize` and `total - after.minSize`, and writes both panels' `flexBasis`. Both the pointer-drag
path (`dragStartBefore + deltaPercent`, computed from the drag's start snapshot so the math never
accumulates rounding error frame-over-frame) and the keyboard path (`before.flexBasis ±
resizeStep`, read live since each keypress is a discrete step) funnel through it — one clamp
invariant instead of two copies that could drift.

---

## 4. `aria-orientation` is the gutter's own line direction, inverted from `[orientation]`

The component's `orientation` input names the **panels'** flow axis (`'horizontal'` = side by
side). A horizontal splitter's gutter is a *vertical* line — so its `role="separator"` carries
`aria-orientation="vertical"`, and vice versa. This is the WAI-ARIA APG definition for a
`separator` used as a resize handle (the orientation describes the separator's own rendered axis,
not the content it divides), and is the one place this component's naming deliberately does not
mirror `ino-tabs`'s `[attr.aria-orientation]="orientation"` (direct passthrough) — a tablist's
`aria-orientation` *is* describing the content's own flow, which is why that passthrough is
correct there and would be wrong here.

`aria-valuenow`/`-valuemin`/`-valuemax` are the **before-panel's** current/min/max share (not the
absolute cumulative boundary position) — directly in the units Home/End/Arrow keys move, so a
screen reader announcing "40%, minimum 10, maximum 80" on a resize matches what the next
keystroke will do.

Per ARIA 1.2, `role="separator"` does not support `aria-readonly`, `aria-invalid`, or
`aria-expanded` — only `aria-disabled` and the generic global states. `readonly` is therefore
surfaced as `data-readonly`, a plain CSS/behaviour hook rather than an ARIA property, the same
choice `ino-tabs.component.html`'s `[attr.data-readonly]` on its own `role="tablist"` already made
for the identical reason (that role doesn't support `aria-readonly` either).

---

## 5. Collapse handles: one toggle per collapsible panel, on its nearer gutter

A `collapsible` panel's toggle button renders on **exactly one** gutter: the gutter right after it
for every panel except the last, whose toggle renders on the gutter right before it. Collapsing
hands the panel's current share to that one neighbour; expanding takes back up to the size it had
before collapsing (`preCollapseSize`, a `Map<panel, number>` owned by the container — not the
panel, which stays the dumb leaf its own doc comment describes), capped by how much the neighbour
can give up without going below its own `minSize`.

The only case two toggles can land on the same gutter is the **last** gutter, when both the
second-to-last and the last panel are independently `collapsible` — both toggles render side by
side there. This is deliberately not specially merged or hidden: it is the one gutter that is
simultaneously "the panel before me"'s nearer gutter and "the panel after me"'s nearer gutter, and
two independent collapse affordances on it is the correct, unambiguous rendering of two
independent panel states.

Chevron glyphs are plain characters (`‹`/`›` horizontal, `▴`/`▾` vertical) — the same no-icon-
library convention `ino-accordion`'s own chevron (`▸`) already uses — chosen per-render from
orientation + which side + current collapsed state + (`‹`/`›` only) RTL, rather than a single
glyph rotated by CSS, since the direction that reads as "this collapses" is genuinely different
content, not a rotation of the same content.

---

## 6. States

**Default** — gutter line renders at `--ino-color-border`, 1px (`--ino-border-width-hairline`),
transparent background.

**Hover** — gutter background `--ino-color-surface-hover`; its line recolors to
`--ino-color-accent`; any collapse toggle on it fades from `opacity: 0` to `1`.

**Focus-visible** — `outline: var(--ino-focus-ring)` inset (negative offset, so the thin gutter's
ring stays inside its own hit box rather than spilling onto the panels); same line recolor as
hover; a focus-visible collapse toggle inside an unfocused gutter also reveals via `:focus-within`.

**Active / dragging** (the spec row's state beyond the §2 standard set) — `background:
--ino-color-surface-active`, line `--ino-color-accent-active`. `document.body` gains a
`.ino-splitter-resizing-x`/`-y` class for the drag's duration (`cursor: col-resize`/`row-resize
!important`, `user-select: none`) — pointer capture keeps move/up events targeting the dragged
gutter even once the cursor strays over a panel's own content, but a captured element's CSS
`cursor` is not reliably what the OS shows in every browser once the pointer is physically over a
*different* element, so the cursor override has to live on `body` for the whole drag.

**Disabled** (whole splitter) — `opacity: 0.5`, `pointer-events: none` on the host; every gutter
drops out of the tab order (`tabindex="-1"`) and carries `aria-disabled="true"`.

**Readonly** — gutters stay in the tab order and keep their visible hover/focus affordances
(`data-readonly` is a styling hook, not a muted-appearance trigger) but every mutating handler
(drag, Arrow/Home/End, collapse-toggle click) early-returns — "focusable but inert," per §4.

**Invalid/error** — deliberate omission. A layout splitter has no bound value to validate; the
WAI-ARIA `separator` pattern defines no error state. Same reasoning `ino-context-menu` SPEC.md §8
and `ino-menu` SPEC.md §10 give for their own omission.

**Loading** — deliberate omission, same reasoning as above: there is no async "the splitter is
loading" state independent of whichever panel's own projected content is or isn't ready.

**Empty** — zero or one panel resolves to zero gutters (`gutterIndices` is `[]`) and, for exactly
one panel, that panel's `flexBasis` is forced to 100 regardless of its own `size` input. No
`role="separator"` renders with nothing to separate.

---

## 7. Deliberate scope limits

- **No runtime-safe panel add/remove.** §2's "re-sync always runs from scratch" means a consumer
  that conditionally adds/removes `*ngIf`-ed panels at runtime will see every panel's width reset
  to a fresh even/explicit split, not a preserved-ratio reflow. Doc 26 §5's row scopes this
  component to dashboard layouts with a fixed-at-mount panel set; a "preserve user resize across a
  structural change" mode is a real but separate enhancement, not speculatively built now.
- **Dragging a gutter next to a collapsed panel is blocked, not auto-expanding.** `onGutterPointerDown`
  and `onGutterKeydown` both no-op if either adjacent panel is `collapsed` — the explicit collapse
  toggle is the one documented way to bring it back, rather than a drag silently reinterpreting
  itself as an expand gesture.
- **A caller's `minSize`s summing to more than 100% across a splitter is not a supported
  configuration** — the result is whatever the clamp math produces, not validated or warned about,
  the same "garbage in" treatment every other numeric `@Input` combination in this catalog gets.

---

## 8. Mobile: web-only (deliberate scope)

Doc 26 §5's row says, verbatim, "Web-only (dashboards)." Neither React Native nor Flutter ships
a resizable-pane idiom for the phone/tablet form factor this catalog's mobile ports target — a
drag-to-resize gutter is a pointer-precision, large-viewport interaction that has no equivalent
touch affordance at typical mobile widths. Same "no native equivalent" reasoning `ino-context-menu`
SPEC.md §10 and `ino-menu` SPEC.md §13 give for their own web-only dispositions. No RN/Flutter
files ship with this issue.
