# `<ino-knob>` — component spec

Contract: INO-469 (INO-31 Phase B5), doc 26 §5 row `ino-knob`:

> circular dial input; min/max/step; value template; readonly | dragging, at-bounds |
> dial sm/md/lg | value label + `aria-label` | `role=slider`, Arrow/Home/End, `aria-valuetext` |
> Web-only (mobile prefers native pickers)

This file records the contract decisions that aren't obvious from the source; the class doc
comment in `ino-knob.component.ts` carries the implementation-level ones.

## 1. One SVG, unit-space geometry, size via custom property

The dial is a single `viewBox="0 0 100 100"` SVG: a 270° range arc (bottom gap, the
conventional knob shape), a value arc from `min` to the current value, an indicator dot at the
value angle, and a centre `<text>` value label. All geometry lives in the 100-unit space; the
rendered diameter is just `--ino-knob-dial` on the host (§3), so sm/md/lg need zero
size-dependent math and the stroke/label proportions hold at every rung.

## 2. Pointer model — angle mapping with gap snapping

`pointerdown` on the dial captures the pointer (`setPointerCapture`, same drag pattern as
`ino-slider`) and every move maps the pointer's angle around the dial centre to a value. The 90°
bottom gap is dead ground: angles inside it snap to the nearer bound, split at the gap's
midpoint, so a drag approaching max can't wrap around to min (the classic knob-drag glitch).
`pointerdown` itself commits (click-to-set anywhere on the dial), matching `ino-slider`'s
track-click behaviour.

Drag does emit `valueChange` continuously (per committed step change, deduplicated — an
unchanged clamp result does not re-emit). This differs from `ino-colorpicker`'s commit-on-release
model deliberately: a knob's value *is* the live output (volume, zoom), not a composite picked
value, and the §5 row's `dragging` state exists to style exactly that live phase.

## 3. Sizing — dial sm/md/lg from the frozen space scale

`InoKnobSize = 'sm' | 'md' | 'lg'` → `--ino-knob-dial` = `--ino-space-9/10/11` (56/80/96px).
A local three-rung union, not `InoControlSize`, for the same reason as `InoSliderTrackSize`: the
varying dimension is a diameter, not a control height, and there is no text baseline to align.
Tokens.css is frozen after Wave 0, so the rungs reuse the space scale directly rather than
minting dial tokens. Density: the dial is not a text-entry control and has no dense-register
height row; it renders identically in dense and fluid (documented on the docs page).

## 4. Value template — one format string feeding both the eye and the screen reader

`valueTemplate` (default `'{value}'`) substitutes the current value into the centre label *and*
`aria-valuetext`. The spec row names `aria-valuetext` explicitly because a templated display
like `75%` or `3 of 10` must be what's announced — `aria-valuenow` alone would read the bare
number while the eye sees the formatted one. `showValue={false}` hides the centre label (for
compact dashboards); `aria-valuetext` still carries the formatted value.

## 5. Accessibility contract (WCAG 2.2 AA)

- `role="slider"` + `tabindex="0"` on the SVG handle group — one tab stop.
- `aria-valuemin/max/now` + `aria-valuetext` (§4); `aria-label` from `label`, falling back to
  the `ariaLabel` input ("value label + `aria-label`" — the row's Labels cell), then `'Value'`.
- Keyboard (APG slider pattern): ArrowRight/ArrowUp +step, ArrowLeft/ArrowDown −step,
  PageUp/PageDown ±step×10, Home/End → min/max. All consumed with `preventDefault` so the page
  doesn't scroll.
- `aria-disabled`/`aria-readonly` reflected; both block pointer and keyboard mutation.
- Focus: `:focus-visible` on the handle draws the standard `--ino-focus-ring` on the dial (via
  `:has()`) plus a thickened indicator stroke — visible at every dial size, and the
  high-contrast theme's 3px ring override flows through the token.
- `aria-describedby` → hint, swapped to the error id when `error` is set; error carries
  `role="alert"`.
- Centre label is `aria-hidden` — it duplicates `aria-valuetext` verbatim.

## 6. States

§2 standard set: default, hover (value arc → accent-active), focus-visible (§5), active,
disabled (0.5 opacity, input blocked), readonly (input blocked, muted centre label, no opacity
drop — the value is still meaningful output), invalid (`error` input → danger-stroked range arc,
3:1 non-text boundary, `ino-slider` precedent). Row extras: `dragging`
(`.ino-knob--dragging`, accent-active arc + indicator) and at-bounds (`.ino-knob--at-min` /
`.ino-knob--at-max`, accent-active indicator stroke).

## 7. Deliberate omissions

- **No vertical/orientation variant** — a dial has no orientation; the row doesn't ask for one.
- **No range (two-handle) mode** — the row is single-value; `ino-slider` owns range selection.
- **No tick marks** — the continuous arc plus the value label covers the row; marks on a 270°
  arc at arbitrary steps are visual noise at sm.
- **No form `ControlValueAccessor`** — matches every other INO-31 control to date
  (`value`/`valueChange` two-way binding only); CVA adoption is a fleet-wide decision, not a
  per-component one.

## 8. Mobile — web-only by spec

Doc 26 §5 row disposition: "Web-only (mobile prefers native pickers)". No RN/Flutter port is
built, deliberately — §2 point 7 applies only to rows whose disposition is "port". The docs
page's Mobile parity section records the native alternatives.

## 9. Testing and QA validation (§2 contract row 8)

`ino-knob.spec.ts` pins: slider-role ARIA surface, `valueTemplate` → `aria-valuetext` + centre
label, full keyboard map with bound clamping, disabled/readonly input blocking, pointer
angle→value mapping (centre-top = 50%), gap snapping to both bounds, and single-emit-per-change
`valueChange` semantics. The §2 point-8 QA sign-off (QALead) validates the rendered docs page —
3 themes × dense/fluid, keyboard-only walkthrough — per doc 26 §2.1.
