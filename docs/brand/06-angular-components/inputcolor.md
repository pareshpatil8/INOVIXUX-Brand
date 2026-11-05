# `<ino-inputcolor>` — Input Color

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5 row
> `ino-inputcolor`. Board approval `f55baa72` on [INO-377](/INO/issues/INO-377). Issue:
> [INO-499](/INO/issues/INO-499).
> Decisions record: `web/src/app/components/inputcolor/SPEC.md`.

A styled native `<input type="color">` swatch, a typeable hex-text twin, and optional preset
swatches. Colour selection is delegated entirely to the browser/OS picker the native control
already opens — this component builds the text alternative, the presets, and the field chrome
around it, not a custom colour-picker panel (that's `<ino-colorpicker>`). Web-only; no mobile
port.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered via `<ino-label>`, pointing at the hex field |
| `ariaLabel` | `string` | `''` | Accessible name for the swatch when no visible `label` is wanted; `label` wins when both are set |
| `value` | `string \| null` | `null` | Banana-in-a-box with `valueChange`; a `#rgb`/`#rrggbb` hex string, or `null` for "nothing picked yet" |
| `presets` | `string[]` | `[]` | `#rgb`/`#rrggbb` swatches rendered below the control; a non-hex entry is a caller error and is silently ignored on click (no default array — see [Presets](#presets)) |
| `size` | `InoControlSize` (`'sm' \| 'default' \| 'lg'`) | `'default'` | Spec row names it `sm/md/lg`; `default` is the frozen scale's middle rung |
| `hint` | `string` | `''` | Hidden while `error` or the transient invalid-hex message is showing; wired via `aria-describedby` |
| `error` | `string` | `''` | Renders a `role="alert"` message and a danger field border; independent of the transient invalid-hex state (see [States](#states)) |
| `required` | `boolean` | `false` | Decorative `*` marker on the label |
| `disabled` | `boolean` | `false` | `0.5` opacity; native `disabled` set on both the swatch and the hex field |
| `readonly` | `boolean` | `false` | Blocks the native picker (via `click` interception — native `readonly` has no effect on `input[type=color]`) and the hex field (via its own native `readonly`) |

`valueChange: EventEmitter<string | null>` fires once per committed colour — picking from the
native dialog, blurring the hex field with a valid typed hex, or clicking a valid hex preset.

### Variants

| Axis | Values |
|---|---|
| Value | Unset (`null`, swatch shows the native default) or any committed `#rgb`/`#rrggbb` hex |
| Presets | None (default) or any caller-supplied hex list |
| Size | `sm` / `default` / `lg` |
| Interactivity | Editable (default), `readonly`, `disabled` |

### Structure (anatomy)

| Part | Element | Notes |
|---|---|---|
| Swatch | `input[type=color].ino-inputcolor__swatch` | The native picker trigger; styled only via `::-webkit-color-swatch`/`::-moz-color-swatch` (border/radius, never fill) |
| Hex field | `input[type=text].ino-inputcolor__hex-input` | The documented text alternative; label's `for` target |
| Presets | `button.ino-inputcolor__preset` × N | Only rendered when `presets` is non-empty |

### Presets

No default array — a brand preset palette is a caller/theming decision, not one this component
bakes in (and baking one in would be a hardcoded raw-colour literal in the component's own
source). A preset that isn't valid `#rgb`/`#rrggbb` hex is ignored on click rather than degraded:
unlike `<ino-colorpicker>`'s HSB model, there is no fallback surface here that can display an
arbitrary CSS colour string the native swatch can't accept. Full reasoning: `SPEC.md` §3.

---

## States

| State | Surface |
|---|---|
| default | Surface-sunken hex field, bordered swatch at the native/committed colour |
| hover | Preset buttons: border → accent-adjacent |
| focus-visible | Standard `--ino-focus-ring` outline on whichever control (swatch/hex/preset) has focus |
| active | Native picker dialog open (OS chrome — not styled by this component) |
| disabled | `0.5` opacity; both controls natively `disabled` |
| readonly | Native swatch picker blocked via `click` interception; hex field natively `readonly` |
| invalid | `error` set — danger field border + `role="alert"` error text |
| invalid-hex | Hex field holds unparseable text after blur — danger field border + its own `role="alert"` message, independent of `error` (see `SPEC.md` §5) |

All states except `active` (OS dialog chrome) are demonstrated in the live demo in all 3 themes.

---

## Sizing

`size: InoControlSize = 'default'` re-points `--ino-control-height`/`--ino-control-padding-inline`/
`--ino-control-font-size` to the `sm`/`lg` rungs (tokens.css §12) — the same mechanism every
other text-entry INO-31 component (`ino-inputmask`, `ino-inputnumber`) uses. The native swatch is
a square matching `--ino-control-height` at every rung, so the swatch + hex-field row reads as
one unit regardless of size. Density (dense/fluid) flows through `--ino-row-min-height`
automatically, no component-specific wiring needed.

---

## Labels and fields

`label` renders through `<ino-label>` (required marker, disabled/invalid/readonly styling) and
points at the hex field — the one control that is directly typeable. `hint`/`error` render under
the control row, wired to both the swatch and the hex field via `aria-describedby` (error wins;
hint hides while `error` or `invalid-hex` is showing). For label-less compact usage, set
`ariaLabel` — it feeds the swatch's accessible name alongside the current hex value.

---

## Accessibility contract

**Role / ARIA** — the swatch is a native `input[type=color]` (implicit role, OS-owned picker
dialog); `aria-label` is built from `label`/`ariaLabel` plus the current hex (e.g. "Brand colour,
#7c5cfc") or "no colour selected", so a screen reader announces identity and state without
needing the hex field focused first. The hex field carries `aria-invalid` (true when
`invalid-hex` or `error`) and shares the same `aria-describedby` target as the swatch.

**Keyboard** — Tab moves focus between the swatch and the hex field in document order; Enter/
Space on the focused swatch opens the native OS picker (standard native-control behavior, not
custom-bound). The hex field is a plain text input — full native text-editing keyboard support,
no custom key handling.

**Focus behavior** — `:focus-visible` on either control draws the standard `--ino-focus-ring`
outline.

**SR announcements** — the hex field's `aria-invalid`/adjoining `role="alert"` message announce
the moment a blur commits or rejects typed text; the native OS picker dialog's own announcements
are outside this component's control.

**Contrast** — WCAG 2.2 AA in all 3 themes for every static (non-data) colour, gated by
`check-theme-parity`. The dynamic swatch/preset fills are, by construction, whatever colour the
caller/user picked — not a themed-role contrast question this component can audit.

**RTL** — logical properties only in CSS (`inline-size`/`block-size`/`inset-inline-*`); no
physical `left`/`right`/`width`/`height` anywhere in the stylesheet.

Full contract: `SPEC.md` §8.

---

## Deliberate omissions

- **No alpha channel** — `input[type=color]` has none; `<ino-colorpicker>` is the component for
  alpha-capable picking.
- **No inline/popover structural variant** — there is no custom overlay here; the browser's own
  dialog is the only "panel".
- **No HSB/RGB model or drag interaction** — delegated to the native control by design (the spec
  row's own wording: "styled **native** color input").
- **No form `ControlValueAccessor`** — matches every other INO-31 control to date
  (`value`/`valueChange` two-way binding only); CVA adoption is a fleet-wide decision, not a
  per-component one.

**PrimeNG mapping:** PrimeNG has no direct `InputColor` equivalent — its `ColorPicker` component
maps to `<ino-colorpicker>` instead. This component has no PrimeNG precedent; it is a from-scratch
wrapper around the native `<input type="color">` element.

---

## Mobile parity

- **Disposition: web-only** (doc 26 §5 row: "Web-only"). No React Native or Flutter port is
  built, deliberately — §2 point 7 applies only to rows whose disposition is "port".
- **Capacitor** — the same Angular component/CSS render in the Capacitor WebView unchanged,
  including the native OS colour-picker sheet the mobile WebView's own `input[type=color]`
  support opens.
- **Native alternatives** — neither React Native nor Flutter has a direct analogue of
  `input[type=color]`; a mobile form that needs colour entry should reach for a platform colour
  picker library, or the custom HSB approach `<ino-colorpicker>`'s web implementation takes
  (currently web-only itself — see that component's own mobile disposition) if parity is
  required.
