# `<ino-slider>` — Slider

> Parity benchmark: PrimeNG 22.1.1 `Slider` (`specs/primeng/llms-22.1.1.txt`, route
> `https://primeng.dev/slider`) — a benchmark only, **not a runtime dependency**.
>
> Preview: [`previews/slider.html`](previews/slider.html).
> Decisions record: `web/src/app/components/slider/SPEC.md`.

Single-value or dual-thumb range slider. `range={true}` switches `value` from `number` to
`[number, number]` (`[lower, upper]`) — the same mode-by-boolean-flag shape `ino-autocomplete`'s
`multiple` flag uses for its own `value: string | string[]`. Follows this repo's
`@Input() value` / `@Output() valueChange` banana-in-a-box convention.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered via `<ino-label>`, pointing at the lower thumb's id |
| `value` | `number \| [number, number]` | `0` | `number` (single, default) or `[number, number]` (`range: true`). Banana-in-a-box with `valueChange` |
| `min` | `number` | `0` | Lower bound |
| `max` | `number` | `100` | Upper bound |
| `step` | `number` | `1` | Keyboard/drag snap increment; also the `showMarks` tick interval |
| `range` | `boolean` | `false` | `true` renders two independent thumbs; lower cannot cross upper and vice versa |
| `vertical` | `boolean` | `false` | Flips the track to a column; thumb travel/fill compute against the block axis |
| `showMarks` | `boolean` | `false` | Renders a tick at every `step` interval, capped at 100 ticks — see [Step marks](#step-marks) |
| `showTooltip` | `boolean` | `false` | A value bubble above the active (dragging/focused) thumb |
| `showMinMaxLabels` | `boolean` | `false` | `min`/`max` numbers at the track's two ends |
| `showValueLabel` | `boolean` | `false` | A text line below the track with the current value(s) |
| `trackSize` | `'sm' \| 'md'` | `'md'` | Local two-rung scale, **not** `InoControlSize` — see [Track sizing](#track-sizing) |
| `hint` | `string` | `''` | Hidden while `error` is set |
| `error` | `string` | `''` | Renders a `role="alert"` message under the track; no `aria-invalid` (not applicable to `role="slider"`) |
| `required` | `boolean` | `false` | Decorative `*` marker on the label |
| `disabled` | `boolean` | `false` | `0.5` opacity; both thumbs removed from focus order and pointer interaction |
| `readonly` | `boolean` | `false` | Thumbs stay focusable/visible; dragging and keyboard adjustment disabled |

`valueChange: EventEmitter<number | [number, number]>` fires on every drag move, click-to-jump,
and keyboard adjustment commit.

### Variants

| Axis | Values |
|---|---|
| Mode | Single thumb (default) or dual-thumb range (`range`) |
| Orientation | Horizontal (default) or vertical (`vertical`) |
| Marks | Off (default) or step-interval ticks (`showMarks`) |
| Tooltip | Off (default) or live value bubble while dragging/focused (`showTooltip`) |
| Labels | Any combination of `showMinMaxLabels` / `showValueLabel`, independently opt-in |
| Track size | `md` (default) or `sm` |

### Track sizing

`trackSize: 'sm' | 'md'` re-points the local `--ino-slider-thumb` custom property (thumb
diameter; track thickness is a `calc()` fraction of it, same precedent `<ino-toggle>`'s
thumb/track pair uses). This is a **local, two-rung union**, deliberately not the fleet-wide
`InoControlSize` (`sm | default | lg`): `InoControlSize` scales a control's *height* against a
text baseline, but a slider has no text baseline to align against — its varying dimension is
track *thickness*. The spec row (doc 26 §5) itself asks for exactly two rungs, confirming this is
a distinct, narrower dimension rather than a mis-fitted reuse of the three-rung scale. Full
reasoning: `SPEC.md` §7.

### Step marks

`showMarks={true}` renders a tick at every `step` interval from `min` to `max`, capped at 100
ticks regardless of the computed count — pairing `showMarks` with a very small `step` relative to
the range is a caller configuration problem, not a case this component tries to solve. Marks are
purely decorative (`pointer-events: none`) and do not snap the thumb themselves — snapping is
already `step`'s job. See `SPEC.md` §4.

### Pointer interaction

- **Dragging a thumb**: `pointerdown` on the thumb calls `setPointerCapture`, so
  `pointermove`/`pointerup` keep firing on that element even once the cursor leaves its bounding
  box — the standard drag-handle pattern. No document-level listener is registered.
- **Clicking the track**: `pointerdown` on the track (not a thumb) computes the pointer's value
  and jumps the *nearest* thumb to it (range mode picks whichever thumb's current value is
  closer) — matching native `<input type="range">` and PrimeNG `Slider` behavior.
- **Touch**: `touch-action: none` on the track prevents the browser's scroll gesture from
  competing with a drag.

See `SPEC.md` §2.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Violet thumb outline on a sunken track |
| Hover | `:hover` on a thumb | Thumb border darkens to `--ino-color-accent-active` |
| Focus-visible | `:focus-visible` on a thumb | Focus ring on the focused thumb |
| Active (pressed) | `:active` on a thumb | `grabbing` cursor, thumb border darkens |
| Disabled | `disabled` input | `0.5` opacity; no pointer/keyboard interaction |
| Readonly | `readonly` input | Interaction disabled; no dimming — value stays visible/focusable |
| Invalid | `error` input set | Danger border on the track |
| **Dragging** | `pointerdown` on a thumb through `pointerup`/`pointercancel` | Fill switches to `--ino-color-accent-active`, host class `.ino-slider--dragging` |
| **At-bounds** | A thumb's value equals `min`/`max` | That thumb's border darkens, host classes `.ino-slider--at-min` / `.ino-slider--at-max` |

Dragging and at-bounds are this row's two states beyond the §2 standard set (doc 26 §5). See
`SPEC.md` §8.

---

## Labels and fields

Three independent, opt-in label surfaces (all default off, per `SPEC.md` §6): `showValueLabel`
(current value(s) below the track), `showMinMaxLabels` (`min`/`max` at the track's two ends). The
value tooltip (`showTooltip`) is a separate, transient drag/focus affordance, not a static label —
a caller may use any combination of all three.

`<ino-label for>` points at the lower thumb's id (the primary/only thumb in single mode).
`hint`/`error` render as a paragraph under the track, `error` taking priority.

---

## Accessibility contract

**Role / ARIA** — `role="slider"` on **each thumb** (not the host element): a range slider is two
independent APG slider widgets sharing one visual track, per the ARIA Authoring Practices Guide.
`aria-valuenow` always; `aria-valuemin`/`aria-valuemax` are the *effective* bounds for that
thumb — the lower thumb's max is the upper thumb's current value (and vice versa) in range mode,
never the slider's global `min`/`max`, so a screen reader never announces a range the thumb can't
actually reach. `aria-orientation` is `"horizontal"` (default) or `"vertical"`. `aria-label` is
derived from `label`; range mode suffixes `"(minimum)"`/`"(maximum)"` so the two thumbs are
distinguishable without visual context. `aria-disabled`/`aria-readonly` are set when
`disabled`/`readonly` are true — `slider` is one of the ARIA roles that supports `aria-readonly`
(unlike, say, `button`). `aria-invalid` is not applicable to `role="slider"` per the ARIA spec; the
error text still renders as a `role="alert"` paragraph, matching every other form control's
error-surface convention.

**Keyboard** — APG slider pattern, per focused thumb:

| Key | Behavior |
|---|---|
| ArrowRight / ArrowUp | Increment by `step` |
| ArrowLeft / ArrowDown | Decrement by `step` |
| PageUp | Increment by `step * 10` |
| PageDown | Decrement by `step * 10` |
| Home | Jump to `min` |
| End | Jump to `max` |
| Tab | Move focus to the other thumb (range mode) or the next control |

All keys call `event.preventDefault()` so the page does not scroll while a thumb has focus.

**Contrast** — WCAG 2.2 AA, gated by `check-theme-parity`.

**RTL** — logical properties only (`inset-inline-*`, `padding-inline`); vertical orientation is
the one place this component isn't purely logical-property-driven (there is no directional
convention for "up is more" vs. "down is more" that RTL flips), so its geometry is measured from
the track's own bottom edge rather than mirrored — see `SPEC.md` §3.

Full contract: `SPEC.md` §9.

---

## Deliberate omissions and PrimeNG mapping

- **Animated transition on programmatic value changes.** Thumb position updates immediately; no
  eased transition when `value` is set from outside. Drag/keyboard interaction is already
  instant-feedback by design (dragging *is* the animation). Revisit if a docs demo shows the
  snap reading as jarring.
- **Custom (non-uniform) step arrays.** `step` is a single uniform number; PrimeNG's `Slider`
  doesn't support this either, noted for completeness.

PrimeNG `Slider` → `ino-slider`; single/range, horizontal/vertical, step, min/max are all covered.
Full table: `SPEC.md` §10.

---

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView.
- **React Native / Flutter** — shipped in this issue
  (`mobile/react-native/src/components/InoSlider.tsx`,
  `mobile/flutter/lib/widgets/ino_slider.dart`).
  - **React Native**: a from-scratch `PanResponder`-drawn track + thumb(s), computing value from
    the gesture's `pageX`/`pageY` relative to the track's measured layout (`onLayout` +
    `measureInWindow`) — the RN equivalent of this component's `getBoundingClientRect()` +
    `pointermove` pattern. RN has no native `role="slider"`; the ARIA-equivalent substitution is
    `accessibilityRole="adjustable"` with `accessibilityActions`/`onAccessibilityAction` for
    increment/decrement (VoiceOver/TalkBack swipe up/down) and `accessibilityValue={{min,
    max, now}}` for the numeric announcement — the same substitution `InoDatepicker`/`InoSelect`/
    `InoAutocomplete` document for their own overlay idioms.
  - **Flutter**: wraps Material's `Slider`/`RangeSlider`, themed via `SliderThemeData`
    (`activeTrackColor`, `inactiveTrackColor`, `thumbColor`, `overlayColor`) rather than a
    from-scratch custom-painted widget — Flutter's built-in slider already implements the
    drag/keyboard/semantics contract this spec asks for, so theming it is the correct-effort
    choice here (unlike RN, which has no built-in slider primitive to theme).
  - Both ports default `showMarks`/`showTooltip`/`showMinMaxLabels`/`showValueLabel` to the same
    `false` defaults as web — parity is in the *capability*, not a mobile-specific default.

Full notes: `SPEC.md` §11.
