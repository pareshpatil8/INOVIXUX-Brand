# `<ino-select-button>` — component spec

**Issue:** [INO-410](/INO/issues/INO-410) (INO-31 Phase B1, doc 26 §5 row `ino-select-button`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Two-component structure (parent + option)

`<ino-select-button>` owns the group container, ARIA role, and value state. Each option is
rendered as a composed `<ino-select-button-option>`. The parent passes `name`, `type` (radio vs
checkbox), `size`, `selected`, `disabled`, `readonly`, and `iconOnly` down to each option so
the option can be a pure presentational piece; value change events bubble back via `(selectedChange)`.

Splitting into two components avoids a single-component `*ngFor` that renders its own shadow DOM
per item with duplicated SCSS — the option shell is reusable if another component ever needs a
standalone toggle-button.

---

## 2. ARIA: radiogroup (single) vs group of toggles (multi)

**Single-select:** host element carries `role="radiogroup"`. Options render `<input type="radio">`.
Radio semantics give screen readers the correct "one-of-N selected" count without any custom
ARIA.

**Multi-select:** host carries `role="group"`. Options render `<input type="checkbox">` plus
`aria-pressed` (mirroring the WAI-ARIA button pattern for toggle buttons). The checkbox provides
the checked/unchecked state; `aria-pressed` provides the "toggle button" affordance for AT that
reads pressed state on interactive elements.

`aria-pressed` is omitted (`null`) in single-select mode — redundant with the radio semantics and
confusing to AT.

---

## 3. CSS selector strategy for input-inside-label

The native `<input>` is `position:absolute; opacity:0` — visually hidden but still the focus and
change target. It lives *inside* the `<label>`, so the sibling combinator (`~`) cannot reach the
label from the input. All interactive state styling (`:checked`, `:focus-visible`, `:active`,
`:disabled`) uses CSS `:has()` anchored on the label:

```scss
.ino-select-button-option__label:has(.ino-select-button-option__input:checked) { … }
```

`:has()` has universal support in the browsers INOVIXUX targets (Chromium 105+, Safari 15.4+,
Firefox 121+). No JavaScript or host-bound attribute needed.

---

## 4. First/last border-radius via `:host(:first-child)` / `:host(:last-child)`

The label element is always the sole top-level child inside `<ino-select-button-option>`'s
template, so `:first-child` / `:last-child` on the label itself would always match. The radius
and left-border for the segment joints are driven by the option host's position in the group
instead:

```scss
:host(:first-child) .label { border-left-width: 1px; border-start-start-radius: …; }
:host(:last-child)  .label { border-start-end-radius: …; }
```

---

## 5. Group label and ARIA labelling

`groupLabel` (string input) renders a visible `<span>` above the button group and sets a
generated `id` that the host's `aria-labelledby` attribute references automatically. If a caller
passes an explicit `ariaLabelledby`, that takes precedence. If only `ariaLabel` is provided (no
visible label), the host carries `aria-label` directly. This covers both labelling patterns the
spec allows without forcing callers to wire ids manually.

---

## 6. Equal-width distribution

`equalWidth` sets `flex: 1 1 0%` on each `<ino-select-button-option>` host via
`:host-context(.ino-select-button--equal-width)`. The default (`equalWidth=false`) leaves
options at `flex: 1 1 auto`, which respects natural content width.

---

## 7. Icon-only mode

`iconOnly` hides the text label and removes it from the a11y tree. The *caller* must supply a
meaningful `aria-label` on the outer `<ino-select-button>` (or per-option, by extending the API)
because the rendered label text is absent. The icon span retains `aria-hidden="true"` in icon-only
mode so AT doesn't read the icon ligature/code point.

---

## 8. Mobile ports

Both ports deliberately render as a horizontally-scrolling row of segmented buttons using the
platform's own touch-friendly paradigm rather than trying to replicate the pixel-exact web layout.

**Flutter** (`mobile/flutter/lib/widgets/ino_select_button.dart`): a `Row` of `InkWell`-wrapped
`Container` items that apply `InoTokens` radii and colors directly, using `setState` for local
selection state with an optional `onChanged` callback. The `radiogroup` / `group` ARIA distinction
has no Flutter equivalent; `Semantics(button: true, selected: …)` is used uniformly.

**React Native** (`mobile/react-native/src/components/InoSelectButton.tsx`): a horizontal
`ScrollView` of `Pressable` items reading `useTheme()` for tokens. The `accessibilityRole="button"`
+ `accessibilityState.selected` substitution mirrors the pattern established in `InoSelect`.

Both ports support single and multiple selection, sm/md/lg sizing, per-option disabled, groupLabel,
and equal-width mode. Icon-only is not ported (no standard icon system on mobile yet).
