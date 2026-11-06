# `<ino-rating>` — component spec

Contract: INO-471 (INO-31 Phase B5), doc 26 §5 row `ino-rating`:

> configurable star count; custom icons; clear/cancel toggle; integer values |
> hover-preview, readonly | sm/md/lg | own label; value announced |
> radiogroup of stars, Arrow keys | Port both

This file records the contract decisions that aren't obvious from the source; the class doc
comment in `ino-rating.component.ts` carries the implementation-level ones.

## 1. Native-radiogroup selection model, not a drag/continuous input

Unlike `ino-slider`/`ino-knob`, the row names the interaction explicitly: "radiogroup of stars".
Star *N* is `role="radio"` representing "rate N"; selecting it sets `value` to `N` and every star
at index `<= value` renders filled. Exactly one radio is `aria-checked` at a time — standard
`ino-radio-group` semantics, just hand-rolled on styled `<span>`s instead of native `<input
type="radio">` elements, because the visible control is a glyph, not a dot-and-ring.

## 2. Clear/cancel toggle — click-to-clear, no separate cancel icon

PrimeNG's `Rating` ships a dedicated cancel/"x" icon ahead of the stars. `ino-rating` implements
the same capability — clicking the already-selected star clears `value` to `0` — gated by
`cancelable`, with no extra icon. One fewer rendered element, no extra tab stop, and the gesture
("click what's selected to unselect it") is the same one every native radio-adjacent toggle in
this library already uses; a second explicit cancel affordance would duplicate it.

## 3. Hover-preview is pointer-only and never touches `value`

`hoverIndex` (component-private) previews the value a click at that position would commit — all
stars up to the hovered index render filled — without emitting `valueChange`. It resets on
`pointerleave` from the group. Keyboard interaction has no equivalent preview step: in a
radiogroup, arrow-key selection *is* the commit (APG radiogroup pattern — selection follows
focus), so there is nothing to preview between moving focus and selecting.

## 4. Roving tabindex tracked separately from `value`

`rovingIndex` (the one star with `tabindex="0"`) defaults to `value` when set, `1` otherwise, then
tracks the last star interacted with — independently of `value` — so a cancel-to-clear click keeps
keyboard focus on the star that was just clicked rather than snapping back to star 1. This mirrors
`ino-radio-group`'s native roving behavior without inheriting its native-`<input>` implementation.

## 5. Sizing — sm/md/lg from the frozen space scale

`InoRatingSize = 'sm' | 'md' | 'lg'` → `--ino-rating-star-size` = `--ino-space-5/6/7`
(20/24/32px). A local three-rung union, not `InoControlSize`, for the same reason as
`InoKnobSize`/`InoSliderTrackSize`: the varying dimension is a glyph's `font-size`, not a control
height against a text baseline. Density: stars are not a text-entry control and have no
dense-register height row; they render identically in dense and fluid (documented on the docs
page).

## 6. Custom icons — plain glyph inputs, not an icon-component dependency

`iconFilled`/`iconEmpty` (defaults `'★'`/`'☆'`) are plain string content, rendered as text, not
bound to an icon-font or SVG-sprite system — the library has no shared icon component yet
(ponytail rung: stdlib/platform capability — a text glyph sized via `font-size` — covers the row's
"custom icons" variant without inventing one). Any short string works: a single emoji, a letter,
or a multi-character token; callers needing vector icons can still pass an SVG-producing string
via Angular's sanitizer boundary is explicitly **not** supported — see Deliberate omissions.

## 7. Deliberate omissions

- **No half-star increments** — the row says "integer values" explicitly; `value` is always a
  whole number in `[0, count]`. PrimeNG's `Rating` supports `0.5` steps; this component does not.
- **No innerHTML/SVG custom icons** — `iconFilled`/`iconEmpty` are rendered via text
  interpolation (auto-escaped), never `[innerHTML]`, to avoid an XSS surface for a cosmetic input.
  A future icon-component dependency can widen this without a breaking change to `value`/`size`.
- **No separate cancel icon** — see §2.
- **No form `ControlValueAccessor`** — matches every other INO-31 control to date
  (`value`/`valueChange` two-way binding only); CVA adoption is a fleet-wide decision, not a
  per-component one.

## 8. Accessibility contract (WCAG 2.2 AA)

- `role="radiogroup"` on the container; `aria-label` from `label`, falling back to `ariaLabel`,
  then `'Rating'`. `aria-disabled`/`aria-readonly` reflected — `radiogroup` supports
  `aria-readonly` directly (unlike the bare `radio`/`group` roles — see the grouped-control
  gotchas this program already hit on `ino-toggle-button`), so it is placed on the group, not
  worked around per-star.
- Each star: `role="radio"`, `aria-checked` (true only for the star matching `value`),
  `aria-label` ("N star"/"N stars"), `aria-posinset`/`aria-setsize` for position announcements.
  "Value announced" (the row's Labels cell) falls out of this for free: a screen reader landing on
  the checked radio announces its label, checked state, and position — no extra live region.
- Keyboard (APG radiogroup — selection follows focus): ArrowRight/ArrowDown → next star (commits),
  ArrowLeft/ArrowUp → previous star (commits), Home/End → first/last star, Space/Enter → commit
  the focused star. All consumed with `preventDefault`.
- Focus: `:focus-visible` on the focused star draws the standard `--ino-focus-ring`; only one star
  is ever in the Tab sequence (roving tabindex, §4).
- `aria-describedby` → hint, swapped to the error id when `error` is set; error carries
  `role="alert"`.
- Contrast: WCAG 2.2 AA in all 3 themes, gated by `check-theme-parity`; the filled-star role
  (`--ino-color-warning`) and empty-star role (`--ino-color-on-surface-muted`) are both
  non-text/icon roles (3:1 minimum), already covered by the token audit.

## 9. Mobile — Port both

Doc 26 §5 row disposition: "Port both". `mobile/flutter/lib/widgets/ino_rating.dart` and
`mobile/react-native/src/components/InoRating.tsx` reproduce the same variant/state surface
(configurable count, custom icon glyphs, cancelable, sm/md/lg, readonly, disabled, invalid) using
each platform's native tap/press handling — touch has no hover, so the hover-preview state is
web-only by platform constraint, same carve-out `ino-slider`'s mobile ports already document for
pointer-only states.

## 10. Testing and QA validation (§2 contract row 8)

`ino-rating.spec.ts` pins: radiogroup/radio ARIA surface, click-to-select and
cancelable click-to-clear, hover-preview filling without emitting `valueChange`, full keyboard
map (Arrow/Home/End/Space/Enter) with bound clamping and selection-follows-focus, disabled/readonly
input blocking, and single-emit-per-change `valueChange` semantics. The §2 point-8 QA sign-off
(QALead) validates the rendered docs page — 3 themes × dense/fluid, keyboard-only walkthrough —
per doc 26 §2.1.
