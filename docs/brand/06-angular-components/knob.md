# `<ino-knob>` — Knob

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5 row
> `ino-knob`. Board approval `f55baa72` on [INO-377](/INO/issues/INO-377). Issue:
> [INO-469](/INO/issues/INO-469).
> Parity benchmark: PrimeNG 22.1.1 `Knob` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/knob/SPEC.md`.

A circular dial input: a single SVG with a 270° range arc (conventional bottom gap), a value arc,
an indicator dot at the value angle, and a centre value label. Drag anywhere on the dial (the
pointer's angle around the centre maps to a value) or adjust with the full APG slider keyboard
map. Web-only (mobile prefers native pickers); no mobile port.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered via `<ino-label>`, pointing at the dial's focusable handle |
| `ariaLabel` | `string` | `''` | Accessible name when no visible `label` is wanted; `label` wins when both are set |
| `value` | `number` | `0` | Banana-in-a-box with `valueChange`; clamped to `[min, max]` for display and ARIA |
| `min` | `number` | `0` | Lower bound |
| `max` | `number` | `100` | Upper bound |
| `step` | `number` | `1` | Keyboard/drag snap increment |
| `valueTemplate` | `string` | `'{value}'` | Format string for the centre label **and** `aria-valuetext`; `{value}` is replaced with the current value (e.g. `'{value}%'` → "75%") |
| `showValue` | `boolean` | `true` | `false` hides the centre label; `aria-valuetext` still announces the formatted value |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Dial diameter — local three-rung scale, **not** `InoControlSize`; see [Dial sizing](#dial-sizing) |
| `hint` | `string` | `''` | Hidden while `error` is set; wired via `aria-describedby` |
| `error` | `string` | `''` | Renders a `role="alert"` message under the dial and a danger-stroked range arc; no `aria-invalid` (not applicable to `role="slider"`) |
| `required` | `boolean` | `false` | Decorative `*` marker on the label |
| `disabled` | `boolean` | `false` | `0.5` opacity; pointer and keyboard input blocked, `aria-disabled` set |
| `readonly` | `boolean` | `false` | Dial stays focusable and fully legible (no opacity drop — the value is meaningful output); input blocked, `aria-readonly` set |

`valueChange: EventEmitter<number>` fires once per committed change — every drag move that lands
on a new stepped value, click-to-set, and each keyboard adjustment. A move that clamps back to
the current value does not re-emit.

### Variants

| Axis | Values |
|---|---|
| Value display | Centre label on (default) or off (`showValue={false}`) |
| Value format | Raw number (default) or any `valueTemplate` string (`'{value}%'`, `'{value} dB'`, …) |
| Dial size | `sm` / `md` (default) / `lg` |
| Interactivity | Editable (default), `readonly`, `disabled` |

### Structure (anatomy)

One `<svg viewBox="0 0 100 100">`:

| Part | Element | Notes |
|---|---|---|
| Range arc | `path.ino-knob__range` | Full 270° sweep, surface-sunken stroke; danger stroke when `error` is set |
| Value arc | `path.ino-knob__value` | `min` → current value, accent stroke; accent-active while hovered/dragging |
| Handle | `g.ino-knob__handle` | The focusable `role="slider"` element (one tab stop) |
| Indicator | `circle.ino-knob__indicator` | Dot at the value's angle on the arc |
| Value label | `text.ino-knob__text` | Centre, `valueTemplate`-formatted, `aria-hidden` (duplicates `aria-valuetext`) |

All geometry is in the SVG's 100-unit space; the rendered diameter comes from the host's
`--ino-knob-dial` custom property alone, so every part scales proportionally across the three
size rungs.

### Dial sizing

`size: 'sm' | 'md' | 'lg'` re-points `--ino-knob-dial` to `--ino-space-9/10/11` (56/80/96px) —
the frozen Wave 0 space scale, since tokens.css mints no new tokens after Wave 0. This is a
**local three-rung union**, deliberately not `InoControlSize`: the varying dimension is a dial
*diameter*, not a control height against a text baseline — the same reasoning as
`InoSliderTrackSize` (see that component's doc). Density: the knob is not a text-entry control
and has no dense-register height row; it renders identically in dense and fluid.

### Pointer interaction

`pointerdown` anywhere on the dial captures the pointer (`setPointerCapture`, the same
drag-handle pattern as `ino-slider`) and commits immediately (click-to-set); every `pointermove`
maps the pointer's angle around the dial centre to a value. Angles inside the 90° bottom gap
snap to the nearer bound, split at the gap's midpoint — a drag approaching `max` can never wrap
across the gap to `min`. `pointerup`/`pointercancel` release the capture and end the `dragging`
state.

---

## States

| State | Surface |
|---|---|
| default | Surface-sunken range arc, accent value arc, on-accent indicator with accent stroke |
| hover | Value arc → accent-active |
| focus-visible | Standard `--ino-focus-ring` outline around the dial + thickened indicator stroke (see Accessibility contract) |
| active / dragging | `.ino-knob--dragging` — value arc and indicator stroke → accent-active |
| at-bounds | `.ino-knob--at-min` / `.ino-knob--at-max` — indicator stroke → accent-active |
| disabled | `0.5` opacity, input blocked, `aria-disabled` |
| readonly | Input blocked, muted centre label, no opacity drop, `aria-readonly` |
| invalid | `error` set — range arc stroked in the danger role (3:1 non-text boundary, `ino-slider` precedent) + `role="alert"` error text |

All states demonstrated in the live demo in all 3 themes.

---

## Labels and fields

`label` renders through `<ino-label>` (required marker, disabled/invalid/readonly styling) and
points at the dial's handle. `hint`/`error` render under the dial and are wired to the handle via
`aria-describedby` (error wins; hint hides while `error` is set). For label-less compact usage
(dashboards, toolbars) set `ariaLabel` — the spec row's Labels cell names both the value label
and `aria-label`. The centre value label is the component's own "value label"; it formats through
`valueTemplate` and truncates nothing (it scales with the dial in SVG unit space).

---

## Accessibility contract

**Role / ARIA** — `role="slider"` + `tabindex="0"` on the SVG handle group — one tab stop per
knob. `aria-valuemin`/`aria-valuemax`/`aria-valuenow` always; `aria-valuetext` carries the
`valueTemplate`-formatted value, so a knob showing "75%" announces "75%", never the bare "75"
(this is why the spec row names `aria-valuetext` explicitly). `aria-label` comes from `label`,
falling back to `ariaLabel`, then `'Value'`. `aria-disabled`/`aria-readonly` are set when
`disabled`/`readonly` are true — `slider` supports `aria-readonly`. `aria-invalid` is not
applicable to `role="slider"`; the error text renders as a `role="alert"` paragraph, matching
every other form control. The centre `<text>` label is `aria-hidden` (it duplicates
`aria-valuetext` verbatim). `hint`/`error` are referenced via `aria-describedby`.

**Keyboard** — APG slider pattern:

| Key | Behavior |
|---|---|
| ArrowRight / ArrowUp | Increment by `step` |
| ArrowLeft / ArrowDown | Decrement by `step` |
| PageUp | Increment by `step * 10` |
| PageDown | Decrement by `step * 10` |
| Home | Jump to `min` |
| End | Jump to `max` |
| Tab | Move focus to the next control |

All keys call `event.preventDefault()` so the page does not scroll while the dial has focus.
Values clamp at the bounds (the at-bounds state styles exactly this).

**Focus behavior** — the handle's `:focus-visible` draws the standard `--ino-focus-ring` around
the whole dial (so keyboard focus is visible at every dial size) plus a thickened indicator
stroke; the high-contrast theme's 3px ring override flows through the token. Pointer clicks do
not show the ring (`:focus-visible`, not `:focus`).

**SR announcements** — on every value change the screen reader re-announces `aria-valuetext`
(the formatted value). Setting `error` injects a `role="alert"` message announced immediately.

**Contrast** — WCAG 2.2 AA in all 3 themes, gated by `check-theme-parity`.

**RTL** — logical properties only in CSS. The dial's geometry is deliberately *not* mirrored in
RTL: like `ino-slider`'s vertical mode, there is no directional convention that flips "clockwise
is more" — a volume knob turns clockwise to increase in every locale. Keyboard semantics
(ArrowRight = increment) follow the APG slider pattern unmirrored, matching the unmirrored
visual.

Full contract: `SPEC.md` §5.

---

## Deliberate omissions

- **No vertical/orientation variant** — a dial has no orientation; the spec row doesn't ask for
  one.
- **No range (two-handle) mode** — the row is single-value; `ino-slider` owns range selection.
- **No tick marks** — the continuous arc plus the formatted centre label covers the row; marks
  on a 270° arc degrade into visual noise at the `sm` rung.
- **No eased animation on programmatic value changes** — the arc and indicator update
  immediately, same decision as `ino-slider`; dragging is already instant-feedback by design.
- **No form `ControlValueAccessor`** — matches every other INO-31 control to date
  (`value`/`valueChange` two-way binding only); CVA adoption is a fleet-wide decision.

**PrimeNG mapping:** PrimeNG `Knob` → `ino-knob`; min/max/step, `valueTemplate`, readonly,
disabled and size are all covered (PrimeNG's single numeric `size` px input becomes the
three-rung `sm/md/lg` scale; its `valueColor`/`rangeColor` inputs are deliberately absent —
colors come from theme tokens, never per-instance inputs). Full table: `SPEC.md` §7.

---

## Mobile parity

- **Disposition: web-only** (doc 26 §5 row: "Web-only — mobile prefers native pickers"). No
  React Native or Flutter port is built, deliberately — §2 point 7 applies only to "port" rows.
- **Capacitor** — the same Angular component/CSS render in the Capacitor WebView unchanged; a
  knob inside the hybrid app works, it's simply not the recommended mobile idiom.
- **Native alternatives** — on mobile, use the platform's native value-adjustment controls
  instead: RN `Slider` (`@react-native-community/slider`) / Flutter `Slider`/`CupertinoSlider`,
  or a stepper (`InoInputNumber`'s mobile ports) for discrete values. A rotary drag gesture is
  hostile on touch (occlusion, no hover affordance, imprecise small-radius arcs), which is why
  the row's disposition is native-pickers rather than port.
