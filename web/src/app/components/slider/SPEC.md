# `<ino-slider>` — component spec

**Issue:** INO-408 (INO-31 Phase B1, Form & input track)
**Parity benchmark:** PrimeNG 22.1.1 `Slider` — `specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/slider`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
(`ino-slider`)
**Parent issue:** INO-31 Brand Architecture / Identity Creation

This file records the decisions the §2 Component Publish Contract requires to be written down.

---

## 1. Single value vs. range — one component, one boolean flag

`range={true}` switches the component from a single draggable thumb to two. This mirrors
`ino-autocomplete`'s `multiple` flag switching `value` from `string` to `string[]` — same
mode-by-boolean shape, not two separate components:

```html
<ino-slider label="Volume" [(value)]="volume" [min]="0" [max]="100" />

<ino-slider label="Price range" range [(value)]="priceRange" [min]="0" [max]="1000" />
```

`value` is `number` in single mode, `[number, number]` (`[lower, upper]`) in range mode. The
lower thumb is clamped to never exceed the upper thumb and vice versa — thumbs cannot cross.

---

## 2. Pointer interaction: capture on the thumb, click-to-jump on the track

- **Dragging a thumb**: `pointerdown` on the thumb calls `setPointerCapture`, so `pointermove`/
  `pointerup` keep firing on that element even once the cursor leaves its bounding box — the
  standard drag-handle pattern. No document-level listener is registered.
- **Clicking the track**: `pointerdown` on the track (not a thumb) computes the pointer's value
  and jumps the *nearest* thumb to it (range mode picks whichever thumb's current value is
  closer) — matching native `<input type="range">` and PrimeNG `Slider` behavior.
- **Touch**: `touch-action: none` on the track prevents the browser's scroll gesture from
  competing with a drag.

---

## 3. Orientation: horizontal (default) and vertical

`vertical={true}` flips the track to a fixed block-size column; thumb travel and fill are
computed against the block axis instead of the inline axis. Vertical orientation does not need
an RTL mirror (there is no directional convention for "up is more" vs. "down is more" that RTL
locales flip), so the vertical geometry math is the one place in this component that isn't
purely logical-property-driven — it still uses `inset-block-*`, just measured from the track's
own bottom edge rather than mirrored per writing direction.

---

## 4. Step marks

`showMarks={true}` renders a tick at every `step` interval from `min` to `max`. This is capped at
100 ticks regardless of the computed count — pairing `showMarks` with a very small `step` relative
to the range (e.g. `step="0.01"` over a `0-100` range) would render thousands of tick nodes, which
is a caller configuration problem, not a case this component tries to solve. Use a coarser `step`
value for the marks use case, or leave `showMarks` off for fine-grained continuous sliders.

Marks are purely decorative (`pointer-events: none`); they do not snap the thumb by themselves —
snapping is already `step`'s job.

---

## 5. Value tooltip

`showTooltip={true}` shows a small bubble above the active thumb (beside it in vertical mode)
while that thumb is being dragged or holds keyboard focus. It disappears when neither condition
holds. Only one tooltip is visible at a time even in range mode, tracking whichever thumb is
"active" (`activeThumb`).

---

## 6. Value label and min/max labels

Three independent, opt-in label surfaces (all default off):

- `showValueLabel={true}` — a text line below the track showing the current value (`"42"` in
  single mode, `"20 – 80"` in range mode).
- `showMinMaxLabels={true}` — `min`/`max` numbers rendered at the track's two ends.

These are separate from the value tooltip (§5): the tooltip is a transient drag/focus affordance,
these labels are always-visible static text — a caller may use either, both, or neither.

---

## 7. Track sizing (§2 contract row 3) — a two-rung scale, not `InoControlSize`

`trackSize: 'sm' | 'md'` (default `'md'`), re-pointing the local `--ino-slider-thumb` custom
property (thumb diameter; track thickness is a `calc()` fraction of it, same precedent
`<ino-toggle>` uses for its thumb/track pair).

This is a **local, two-rung union**, deliberately not the fleet-wide `InoControlSize`
(`sm | default | lg`, `web/src/app/components/control-size.ts`). `InoControlSize` scales a
control's *height* against a text baseline; a slider has no text baseline to align against — its
varying dimension is track *thickness*. The spec row (doc 26 §5) itself asks for exactly two
rungs ("track sm/md"), confirming this is a distinct, narrower dimension rather than a
mis-fitted reuse of the three-rung scale.

---

## 8. States built (§2 contract row 2, plus the row's extra states)

| State | Surface | Implementation |
|---|---|---|
| Default | violet thumb outline on a sunken track | base styles |
| Hover | thumb border darkens to `--ino-color-accent-active` | `.ino-slider__thumb:hover` |
| Focus-visible | focus ring on the focused thumb | `.ino-slider__thumb:focus-visible` |
| Active (pressed) | `grabbing` cursor, thumb border darkens | `.ino-slider__thumb:active` |
| Disabled | 0.5 opacity, no pointer/keyboard interaction | `disabled={true}` |
| Readonly | interaction disabled, no dimming (value still visible/focusable) | `readonly={true}` |
| Invalid/error | danger border on the track | `error="..."` |
| **Dragging** (row-specific) | fill switches to `--ino-color-accent-active` | host class `.ino-slider--dragging`, set on `pointerdown`/cleared on `pointerup`/`pointercancel` |
| **At-bounds** (row-specific) | the bounded thumb's border darkens | host classes `.ino-slider--at-min` / `.ino-slider--at-max`, auto-applied when a thumb's value equals `min`/`max` |

---

## 9. Accessibility contract (WCAG 2.2 AA)

- **Role**: `role="slider"` on **each thumb** (not the host element) — a range slider is two
  independent APG slider widgets sharing one visual track, per the ARIA Authoring Practices Guide.
- **ARIA value attributes**: `aria-valuenow` always; `aria-valuemin`/`aria-valuemax` are the
  *effective* bounds for that thumb — the lower thumb's max is the upper thumb's current value
  (and vice versa) in range mode, not the slider's global `min`/`max`, so a screen reader never
  announces a range the thumb can't actually reach.
- **`aria-orientation`**: `"horizontal"` (default) or `"vertical"`.
- **`aria-label`**: derived from `label`; range mode suffixes `"(minimum)"`/`"(maximum)"` so the
  two thumbs are distinguishable without visual context.
- **`aria-disabled`/`aria-readonly`**: set when `disabled`/`readonly` are true — `slider` is one
  of the ARIA roles that supports `aria-readonly` (unlike, say, `button`).
- **Label association**: `<ino-label for>` points at the lower thumb's id (the primary/only thumb
  in single mode).
- **Error announcement**: `aria-invalid` is not applicable to `role="slider"` per the ARIA spec
  (no native form-validity mapping); the error text still renders as a `<p role="alert">` below
  the track, matching every other form control's error-surface convention.

## Keyboard contract (APG slider pattern), per focused thumb

| Key | Behavior |
|---|---|
| ArrowRight / ArrowUp | Increment by `step` |
| ArrowLeft / ArrowDown | Decrement by `step` |
| PageUp | Increment by `step * 10` |
| PageDown | Decrement by `step * 10` |
| Home | Jump to `min` |
| End | Jump to `max` |
| Tab | Move focus to the other thumb (range mode) or the next control |

All keys call `event.preventDefault()` to stop the page from scrolling on Arrow/Page/Home/End
while a thumb has focus.

---

## 10. Deliberate omissions and PrimeNG mapping

**PrimeNG `Slider` features not implemented:**
- **`animate` transition on programmatic value changes** — thumb position updates immediately;
  no eased transition when `value` is set from outside. Revisit if a docs demo shows the snap
  reading as jarring.
- **Custom step arrays (non-uniform steps)** — `step` is a single uniform number; PrimeNG doesn't
  support this either, noted for completeness.

**PrimeNG row mapping:**
- PrimeNG `Slider` → `ino-slider` (this component)
- Features: single/range, horizontal/vertical, step, min/max — all covered.

**Why these were omitted:**
- An eased transition adds a motion-token decision (duration/easing for a value-driven, not
  interaction-driven, change) that the spec row doesn't ask for; drag/keyboard interaction is
  already instant-feedback by design (dragging *is* the animation).

---

## 11. Notes for mobile platform implementation

- **React Native**: `PanResponder` on each thumb view computes value from the gesture's
  `moveX`/`moveY` relative to the track's measured layout (`onLayout` + `measureInWindow`), the
  RN equivalent of this component's `getBoundingClientRect()` + `pointermove` pattern. RN has no
  native `role="slider"`; use `accessibilityRole="adjustable"` with
  `accessibilityActions`/`onAccessibilityAction` for increment/decrement (VoiceOver/TalkBack swipe
  up/down), and `accessibilityValue={{min, max, now}}` for the numeric announcement — the same
  ARIA-to-RN substitution `InoDatepicker`/`InoSelect`/`InoAutocomplete` already document for their
  own overlay idioms.
- **Flutter**: `Slider`/`RangeSlider` from the Material library, themed via `SliderThemeData` to
  match tokens (`activeTrackColor`, `inactiveTrackColor`, `thumbColor`, `overlayColor`) rather than
  a from-scratch custom-painted widget — Flutter's built-in slider already implements the
  drag/keyboard/semantics contract this spec asks for, so theming it is the correct-effort choice
  here (unlike RN, which has no built-in slider primitive to theme).
- Both ports default `showMarks`/`showTooltip`/`showMinMaxLabels`/`showValueLabel` to the same
  `false` defaults as web — parity is in the *capability*, not a mobile-specific default.

---

## 12. Testing and QA validation (§2 contract row 8)

The QA validation checklist for this component includes:
- [ ] Single mode: drag, click-to-jump, and all six keyboard keys move the thumb correctly.
- [ ] Range mode: both thumbs drag independently; lower thumb cannot cross the upper thumb and
      vice versa; click-to-jump picks the nearer thumb.
- [ ] Vertical orientation renders and drags correctly (bottom = min, top = max).
- [ ] `showMarks` renders ticks at the correct step interval; capped at 100 ticks.
- [ ] `showTooltip` appears only on the active (dragging/focused) thumb and shows the live value.
- [ ] `showMinMaxLabels` / `showValueLabel` render correctly in both single and range mode.
- [ ] All states (hover, focus-visible, active, disabled, readonly, invalid, dragging, at-min,
      at-max) render in all 3 themes × dense/fluid.
- [ ] Screen reader announces `role=slider`, `aria-valuenow/min/max`, `aria-orientation`, label.
- [ ] WCAG 2.2 AA contrast verified (already gated by `check-theme-parity`).
- [ ] Mobile ports (RN + Flutter) match web feature parity (single/range, vertical, marks,
      tooltip, keyboard-equivalent accessibility actions).

QA sign-off required before docs page ships to Pages (D-gate 2, doc 26 §7) — tracked as the
blocking subtask [INO-409](/INO/issues/INO-409) on this issue.
