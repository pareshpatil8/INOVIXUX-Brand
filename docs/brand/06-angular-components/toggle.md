# `<ino-toggle>` — Toggle / Switch

> Parity benchmark: PrimeNG 22.1.1 `ToggleSwitch` (`specs/primeng/llms-22.1.1.txt`, line 124).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/toggle.html`](previews/toggle.html).
> Decisions record: `web/src/app/components/toggle/SPEC.md`.

A boolean switch, WAI-ARIA APG "switch" pattern (`role="switch"` on a native `<button>`), with an
on/off icon overlay riding inside the thumb, a full eight-state contract, an `error`/invalid state,
and the `size` API.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Visible label text; the button is self-labelling from its own text content |
| `ariaLabel` | `string` | `''` | Accessible name for a label-less/icon-adjacent toggle; ignored when `label` is set |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Thumb diameter + label font-size + gap from the Wave 0 control-size scale — see [Size API](#size-api) |
| `checked` | `boolean` | `false` | Two-way bindable via `[(checked)]` |
| `disabled` | `boolean` | `false` | Native `[disabled]`; control dims to 50% opacity and leaves the tab order |
| `readonly` | `boolean` | `false` | Value is locked but the control stays focusable and fully legible — see [Readonly](#readonly) |
| `loading` | `boolean` | `false` | `aria-busy` + disabled interaction + adjacent spinner; the track/thumb keep their last committed position |
| `error` | `string` | `''` | Non-empty sets `aria-invalid` + renders the message; also paints a ring on the track |

| Output | Payload | Fires |
|---|---|---|
| `checkedChange` | `boolean` | On every user-driven toggle |

### Size API

Reads three of the six Wave 0 control-size aliases — `--ino-control-icon-size`,
`--ino-control-font-size`, `--ino-control-gap` — the same subset `ino-checkbox` reads, for the same
reason: the icon-size alias (16/20/24px) is the closer fit for a compact control than
`--ino-control-height` (44/36/52px, sized for a full-height control like `ino-button`/`ino-input`).
Track width/height and thumb travel distance are pure `calc()` geometry off that one alias — every
size only changes the thumb diameter for the whole shape to follow. The control row still reads
`--ino-row-min-height` (falling back to `--ino-target-comfortable`) as its `min-height`,
independently of thumb size. Full reasoning: `SPEC.md` §6.

### Icon overlay

A glyph (`✓` checked / `✕` unchecked) renders inside the thumb, swapped by `checked` — riding with
the thumb rather than fixed under the track. Colours are existing guaranteed-AA pairs read in
reverse (unchecked: on-surface-muted fill / surface icon; checked: on-accent fill / accent icon) —
no new token. Full reasoning: `SPEC.md` §2.

### Readonly

`<button>` has no native `readonly` attribute, so this is enforced in the component: `checkedChange`
simply doesn't fire while `readonly` is true. The control stays focusable and fully legible (unlike
`disabled`, which dims it), only the interactive affordances withdraw. Full reasoning: `SPEC.md` §4.

---

## Motion

Track/thumb/icon transitions use `--ino-motion-duration-base` (fill, position) and
`--ino-motion-duration-fast` (hover filter), both with `--ino-motion-easing-standard` — collapsing
to no animation under `prefers-reduced-motion: reduce`. The loading spinner uses
`--ino-motion-duration-slow` linear rotation, matching `ino-checkbox`/`ino-button`/`ino-tag`'s
spinner treatment, skipped entirely under reduced motion. The thumb's checked/unchecked position
animates via `inset-inline-start` (logical), not `transform: translateX` — the pre-uplift
implementation used `translateX` and did not mirror correctly under `dir="rtl"`; this is now fixed.

---

## Accessibility contract

**Role / ARIA** — `role="switch"` on a native `<button>` (WAI-ARIA APG switch pattern), distinct
from a checkbox styled to look like a switch. `aria-checked` is always a real boolean — a switch has
no indeterminate/mixed state. `aria-invalid` + `aria-describedby` wire in the error message.
`aria-readonly` reflects `readonly` (valid on `switch` — its ARIA superclass role is `checkbox`,
which supports `aria-readonly`). `aria-busy` reflects `loading`.

**Keyboard** — Tab to focus, Space or Enter to toggle (native `<button>` activation).

**Contrast and targets** — the thumb itself is >= the WCAG 2.2 SC 2.5.8 24px floor at `default`/`lg`
(20px/24px); the effective click target is the full control row via `--ino-row-min-height`/
`--ino-target-comfortable`, always >= 32px even in dense mode. Focus ring, invalid ring, and both
icon-overlay colour pairs all resolve through tokens audited across all three themes by
`node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`inline-size`/`block-size`, `inset-block-start`/
`inset-inline-start`, `border-inline-start-color`); no `left`/`right`/`top`/`bottom`/`translateX`
anywhere in the stylesheet.

---

## Mobile parity

All three tracks ship (per the issue). Neither mobile port existed before this issue.

- **Capacitor** — not a separate port; the same Angular components/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoToggle.tsx`. RN has no native switch
  primitive this design system already wraps, so this is a from-scratch `Pressable`-drawn track +
  thumb; `accessibilityRole="switch"` + `accessibilityState={{ checked, disabled, busy }}` carry the
  ARIA-equivalent contract.
- **Flutter** — `mobile/flutter/lib/widgets/ino_toggle.dart`, same from-scratch approach (not
  Material's built-in `Switch`, to keep full token control); `Semantics(toggled: checked)` is
  Flutter's switch-specific semantics flag.

Full reasoning: `SPEC.md` §10.
