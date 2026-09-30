# `<ino-inputnumber>` — component spec

**Issue:** INO-402 (INO-31 Phase B1, Form & input track)
**Parity benchmark:** PrimeNG 22.1.1 `InputNumber` — `specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/inputnumber`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row 2
**Parent issue:** INO-31 Brand Architecture / Identity Creation

This file records the decisions the §2 Component Publish Contract requires to be written down.

---

## 1. Promotes from `<ino-input type="number">` partial

`<ino-input type="number">` exists in the shipped catalog as a basic numeric input — plain native
`<input type="number">` with the standard label/hint/error contract. `ino-inputnumber` **promotes**
this partial by adding:

- **Spinner buttons** (increment/decrement) — hideable via `showButtons={false}`
- **Currency/percent/decimal modes** with locale-aware formatting
- **Prefix/suffix** slots for units, currency symbols, or static text
- **Locale digit grouping** including Indic scripts (e.g., `12,34,567` for `hi-IN`)
- **Min/max constraints** with visual at-min/at-max states
- **Full APG spinbutton semantics**: `role=spinbutton`, `aria-valuemin/max/now`, keyboard contract

The plain `type="number"` path remains available on `ino-input` for cases that don't need spinner
buttons or formatting (e.g., an ID field, a simple integer). `ino-inputnumber` is the sanctioned
component when any of the above features are needed.

---

## 2. Spinner buttons are stacked vertically at the trailing edge

Increment (+) and decrement (−) buttons render inside the input field at the trailing edge
(`inset-inline-end`, RTL-safe), stacked vertically with increment on top. This is the PrimeNG
pattern and matches user expectations from Windows/macOS native number spinners.

Alternative layouts considered and rejected:
- **Side-by-side horizontal buttons** — would consume too much width on `size="sm"`.
- **Leading-edge placement** — violates RTL conventions and form-field scan order.

The buttons are **off by default** on mobile ports (RN/Flutter) unless explicitly enabled —
mobile platforms favor native picker sheets for numeric entry. The web component defaults to
`showButtons={true}`.

---

## 3. Formatting modes: decimal, currency, percent

Three modes control how the value is **formatted for display** (not how it is stored):

| Mode | Format example (en-US) | `Intl.NumberFormat` style |
|---|---|---|
| `mode="decimal"` (default) | `1,234.56` | `{style: undefined, useGrouping: true}` |
| `mode="currency"` | `$1,234.56` | `{style: 'currency', currency: 'USD'}` |
| `mode="percent"` | `12.34%` | `{style: 'percent'}` |

The formatted string is displayed as a static overlay or in the input's display value (depending
on whether the field is focused), but the **stored value is always a plain number**. The `value`
property and `valueChange` event carry numeric primitives only, never formatted strings.

Locale is set via `locale="hi-IN"` (defaults to `en-US`). Currency code is set via
`currency="INR"` (defaults to `USD`, only meaningful when `mode="currency"`).

---

## 4. Prefix and suffix are static text slots, not input affordances

`prefix` and `suffix` are plain string inputs that render as static text outside the control's
border (before/after the input field). They are **not interactive** — clicking them does not focus
the input, and they do not participate in the control's tab order.

```html
<ino-inputnumber label="Price" prefix="₹" suffix="per kg" [(value)]="price" />
```

This is distinct from `ino-input-group`'s prefix/suffix **addon** slots, which can contain
interactive buttons or dropdowns. `ino-inputnumber`'s prefix/suffix are purely informational.

When `mode="currency"`, the currency symbol is already part of the formatted value (e.g.,
`$1,234.56`), so setting `prefix="$"` in addition would duplicate it. Use `prefix` only when you
want a different symbol or unit than the locale/currency default provides.

---

## 5. Min/max constraints clamp the value and disable buttons at bounds

`min` and `max` set hard boundaries:
- Any typed value outside the range is **clamped** on blur or on keyboard increment/decrement.
- The decrement button is **disabled** when `value === min`.
- The increment button is **disabled** when `value === max`.
- Visual state classes `.ino-inputnumber--at-min` / `.ino-inputnumber--at-max` are applied to the
  host element so styles can reflect the boundary state.

APG spinbutton pattern specifies that `aria-valuemin/max` must be set when min/max are defined,
and that keyboard navigation (Home/End) should jump to min/max respectively. Both are implemented.

---

## 6. Step controls increment/decrement granularity

`step` defaults to `1`. Up/Down arrow keys increment/decrement by `step`. PageUp/PageDown
increment/decrement by `step * 10`.

For fractional steps (e.g., `step="0.01"` for currency), `minFractionDigits` and
`maxFractionDigits` control how many decimal places are shown in the formatted display. These are
passed directly to `Intl.NumberFormat`.

---

## 7. Locale digit grouping including Indic scripts

`useGrouping={true}` (default) enables thousands separators. The grouping pattern is
locale-specific:

| Locale | Value `1234567.89` formatted |
|---|---|
| `en-US` | `1,234,567.89` |
| `hi-IN` | `12,34,567.89` (Indic grouping: first 3, then every 2) |
| `de-DE` | `1.234.567,89` (period separator, comma decimal) |

This is implemented via `Intl.NumberFormat` with the `useGrouping` option, so all ECMA-402 locales
are supported out of the box with no custom parsing logic.

---

## 8. Keyboard contract (APG spinbutton pattern)

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

## 9. Accessibility contract (WCAG 2.2 AA)

- **Role**: `role="spinbutton"` on the `<input>` element.
- **ARIA value attributes**: `aria-valuenow`, `aria-valuemin`, `aria-valuemax` are set and updated
  on every value change.
- **Label association**: `<ino-label for>` creates a real `<label>` pointing to the input's `id`.
- **Error announcement**: `aria-invalid="true"` when `error` is set; `aria-describedby` points to
  the error text `<p role="alert">` so screen readers announce it on focus.
- **Button labels**: increment/decrement buttons have `aria-label="Increment value"` and
  `aria-label="Decrement value"` respectively, plus `aria-hidden="true"` on their icon SVGs.
- **Disabled state**: native `disabled` attribute on the input and buttons; buttons also disabled
  individually when at min/max bounds.
- **Focus ring**: CSS `:focus-visible` outline on the input and buttons, using
  `var(--ino-focus-ring)` and `var(--ino-focus-ring-offset)` tokens for WCAG contrast compliance.

---

## 10. States built (§2 contract row 2)

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

## 11. Sizing (§2 contract row 3)

`size="sm" | "default" | "lg"` re-points three control-size aliases:
- `--ino-control-height`
- `--ino-control-padding-inline`
- `--ino-control-font-size`

Same pattern as `ino-input`. Density (dense/fluid) is controlled by `--ino-row-min-height` from
an ancestor scope; the component's `min-block-size` already floors to it.

---

## 12. Variants built (§2 contract row 1)

| Variant | Description | Surface |
|---|---|---|
| Outline (default) | all-round border, sunken background | `variant="outline"` |
| Filled | Material-style filled field, flat bottom corners, base rule | `variant="filled"` |
| Without buttons | plain numeric input, no spinner buttons | `showButtons={false}` |
| With prefix/suffix | static text before/after the input | `prefix="..."` `suffix="..."` |
| Currency mode | formatted with currency symbol per locale | `mode="currency" currency="USD"` |
| Percent mode | formatted as percentage | `mode="percent"` |
| Decimal mode | plain number with digit grouping | `mode="decimal"` (default) |

---

## 13. Mobile ports (RN + Flutter)

Both React Native and Flutter implementations are **in scope** (spec seed: "port both").
- RN: native `TextInput` with `keyboardType="numeric"`, custom increment/decrement buttons as
  touchable icons, locale formatting via `Intl` polyfill or `react-native-localize`.
- Flutter: `TextField` with `keyboardType: TextInputType.number`, custom buttons as `IconButton`,
  locale formatting via `NumberFormat` from `intl` package.

Mobile platforms default to `showButtons={false}` and may promote the currency/percent pickers to
native OS sheets where applicable. The web component defaults to `showButtons={true}`.

---

## 14. Deliberate omissions and PrimeNG mapping

**PrimeNG `InputNumber` features not implemented:**
- **Button layout variants** (horizontal, vertical-stacked-outside-input) — only vertical-stacked
  inside the input is built, as it is the most compact and mobile-friendly.
- **Custom button templates** — our buttons are fixed SVG icons; no slot override.
- **`onFocus` / `onBlur` formatting toggle** — PrimeNG switches between raw and formatted display
  on focus; we show formatted always in display mode. Revisit if user testing shows confusion.

**PrimeNG row mapping:**
- PrimeNG `InputNumber` → `ino-inputnumber` (this component)
- Features: spinner buttons, currency/percent modes, min/max, locale grouping, prefix/suffix

**Why these were omitted:**
- Button layout variants add API surface with marginal UX benefit; the stacked-inside layout works
  across all sizes and densities.
- Custom button templates would require a template-outlet mechanism this repo doesn't yet have;
  defer to a future "advanced customization" wave if demand surfaces.
- The focus/blur formatting toggle is a micro-optimization that adds implementation complexity
  (two separate render paths) without clear a11y or UX justification.

---

## 15. Notes for mobile platform implementation

- **iOS numeric keyboard** does not show a minus sign by default; use `UIKeyboardTypeNumbersAndPunctuation`
  or a custom accessory view with +/− buttons when `min` allows negative values.
- **Android numeric keyboard** varies by OEM; test on Samsung, Pixel, and MIUI to ensure the
  decimal separator matches the locale.
- **Flutter `TextInputType.numberWithOptions`** supports signed/decimal flags; set
  `signed: true` when `min` is negative, `decimal: true` when `step` or `maxFractionDigits` is fractional.
- **Indic digit grouping** is correctly handled by `Intl.NumberFormat` on web and Flutter's `intl`
  package; RN may require `react-native-localize` + manual grouping logic if `Intl` polyfill coverage
  is incomplete on older Android devices.

---

## 16. Testing and QA validation (§2 contract row 8)

The QA validation checklist for this component includes:
- [ ] All three modes (decimal, currency, percent) render correctly in all 3 themes (dark, light,
      high-contrast).
- [ ] Keyboard navigation (Up/Down/PageUp/PageDown/Home/End) works as specified.
- [ ] Spinner buttons increment/decrement by `step`; PageUp/PageDown by `step * 10`.
- [ ] Min/max clamping works; buttons disabled at bounds.
- [ ] Locale digit grouping correct for `en-US`, `hi-IN`, `de-DE`.
- [ ] Prefix/suffix render outside the input border, non-interactive.
- [ ] All states (hover, focus, active, disabled, readonly, invalid, at-min, at-max) render in all
      3 themes × dense/fluid.
- [ ] Screen reader announces `role=spinbutton`, `aria-valuenow/min/max`, label, error.
- [ ] WCAG 2.2 AA contrast verified (already gated by `check-theme-parity`).
- [ ] Mobile ports (RN + Flutter) match web feature parity (keyboard type, formatting, buttons if
      `showButtons={true}`).

QA sign-off required before docs page ships to Pages (D-gate 2, doc 26 §7).
