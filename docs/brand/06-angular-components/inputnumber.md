# `<ino-inputnumber>` — InputNumber

> Parity benchmark: PrimeNG 22.1.1 `InputNumber` (`specs/primeng/llms-22.1.1.txt`,
> `https://primeng.dev/inputnumber`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
> here installs it.
>
> Decisions record: `web/src/app/components/inputnumber/SPEC.md`.
> Issue: INO-402 (INO-31 Phase B1, Form & input track).

A numeric input with spinner buttons, locale formatting, and specialized modes (decimal, currency,
percent). Promotes from `<ino-input type="number">` with currency/percent modes, prefix/suffix
slots, locale digit grouping (including Indic scripts), min/max constraints with visual at-min/at-max
states, and full APG spinbutton semantics.

---

## Variants

| Variant | Description | Surface |
|---|---|---|
| Outline (default) | all-round border, sunken background | `variant="outline"` |
| Filled | Material-style filled field, flat bottom corners | `variant="filled"` |
| Without buttons | plain numeric input, no spinner buttons | `showButtons={false}` |
| With prefix/suffix | static text before/after the input | `prefix="..."` `suffix="..."` |
| Currency mode | formatted with currency symbol per locale | `mode="currency" currency="USD"` |
| Percent mode | formatted as percentage | `mode="percent"` |
| Decimal mode | plain number with digit grouping | `mode="decimal"` (default) |

---

## Formatting modes

Three modes control how the value is **formatted for display** (not how it is stored):

| Mode | Format example (en-US) | `Intl.NumberFormat` style |
|---|---|---|
| `mode="decimal"` (default) | `1,234.56` | `{style: undefined, useGrouping: true}` |
| `mode="currency"` | `$1,234.56` | `{style: 'currency', currency: 'USD'}` |
| `mode="percent"` | `12.34%` | `{style: 'percent'}` |

The formatted string is displayed, but the **stored value is always a plain number**. The `value`
property and `valueChange` event carry numeric primitives only, never formatted strings.

Locale is set via `locale="hi-IN"` (defaults to `en-US`). Currency code is set via
`currency="INR"` (defaults to `USD`, only meaningful when `mode="currency"`).

---

## Keyboard contract (APG spinbutton pattern)

| Key | Behavior |
|---|---|
| Up arrow | Increment by `step` |
| Down arrow | Decrement by `step` |
| PageUp | Increment by `step * 10` |
| PageDown | Decrement by `step * 10` |
| Home | Jump to `min` (if set) |
| End | Jump to `max` (if set) |
| Tab | Move focus to next/previous control (native behavior) |

All keyboard events call `event.preventDefault()` to prevent native browser number-input behavior
(which varies by browser and can conflict with the custom spinbutton semantics).

---

## States

| State | Surface | Implementation |
|---|---|---|
| Default | outlined input + spinner buttons | `variant="outline"` (default) |
| Hover | border color changes to `--ino-color-on-surface-muted` | `:hover:not(:disabled):not(:read-only)` |
| Focus-visible | accent border + focus ring | `:focus-visible` |
| Active (pressed) | accent-active border | `:active:not(:disabled):not(:read-only)` |
| Disabled | 0.5 opacity, `not-allowed` cursor | `disabled={true}` |
| Readonly | raised background, `default` cursor, still focusable | `readonly={true}` |
| Invalid/error | danger border, error text below | `error="..."` |
| At-min | decrement button disabled, `.ino-inputnumber--at-min` host class | auto-applied when `value === min` |
| At-max | increment button disabled, `.ino-inputnumber--at-max` host class | auto-applied when `value === max` |

---

## Sizing

`size="sm" | "default" | "lg"` re-points three control-size aliases:
- `--ino-control-height`
- `--ino-control-padding-inline`
- `--ino-control-font-size`

Same pattern as `ino-input`. Density (dense/fluid) is controlled by `--ino-row-min-height` from
an ancestor scope; the component's `min-block-size` already floors to it.

---

## Accessibility contract

**Role / ARIA** — `role="spinbutton"` on the `<input>` element. `aria-valuenow`, `aria-valuemin`,
`aria-valuemax` are set and updated on every value change. `aria-invalid="true"` when `error` is
set; `aria-describedby` points to the error text `<p role="alert">` so screen readers announce it
on focus.

**Button labels** — increment/decrement buttons have `aria-label="Increment value"` and
`aria-label="Decrement value"` respectively, plus `aria-hidden="true"` on their icon SVGs.

**Label association** — `<ino-label for>` creates a real `<label>` pointing to the input's `id`.

**Disabled state** — native `disabled` attribute on the input and buttons; buttons also disabled
individually when at min/max bounds.

**Focus ring** — CSS `:focus-visible` outline on the input and buttons, using
`var(--ino-focus-ring)` and `var(--ino-focus-ring-offset)` tokens for WCAG contrast compliance.

**Keyboard** — Full APG spinbutton pattern: Up/Down arrows increment/decrement by `step`;
PageUp/PageDown by `step * 10`; Home/End jump to min/max (if set).

**Contrast and targets** — All interactive elements meet WCAG 2.2 AA contrast requirements across
all three themes (dark, light, high-contrast). Focus ring, invalid ring, and danger error text all
resolve through tokens audited by `check-theme-parity`.

**RTL** — logical properties only (`inline-size`, `inset-inline-end`, etc.); no
`left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Mobile parity

Both React Native and Flutter implementations are **in scope**.

- **React Native** — native `TextInput` with `keyboardType="numeric"`, custom increment/decrement
  buttons as touchable icons, locale formatting via `Intl` polyfill or `react-native-localize`.
  Mobile platforms default to `showButtons={false}` and may promote currency/percent pickers to
  native OS sheets where applicable.
- **Flutter** — `TextField` with `keyboardType: TextInputType.number`, custom buttons as
  `IconButton`, locale formatting via `NumberFormat` from `intl` package.

The web component defaults to `showButtons={true}`.

---

## Deliberate omissions

Recorded here rather than silently dropped:

- **Button layout variants** (horizontal, vertical-stacked-outside-input) — only vertical-stacked
  inside the input is built, as it is the most compact and mobile-friendly. Button layout variants
  add API surface with marginal UX benefit; the stacked-inside layout works across all sizes and
  densities.
- **Custom button templates** — our buttons are fixed SVG icons; no slot override. Custom button
  templates would require a template-outlet mechanism this repo doesn't yet have; defer to a future
  "advanced customization" wave if demand surfaces.
- **`onFocus` / `onBlur` formatting toggle** — PrimeNG switches between raw and formatted display
  on focus; we show formatted always in display mode. The focus/blur formatting toggle is a
  micro-optimization that adds implementation complexity (two separate render paths) without clear
  a11y or UX justification. Revisit if user testing shows confusion.
