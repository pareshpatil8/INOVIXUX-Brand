# `<ino-toggle-button>` — component spec

**Issue:** [INO-412](/INO/issues/INO-412) (INO-31 Phase B1, doc 26 §5 row `ino-toggle-button`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be
written down rather than silently made.

---

## 1. `aria-pressed` toggle button, not `role="switch"`

`<ino-toggle>` (`web/src/app/components/toggle/`) already owns the WAI-ARIA APG **switch**
pattern. This component is the APG **toggle button** pattern instead — a native `<button>` with
`aria-pressed` reflecting state, no `role` override (a plain button's implicit role is correct).
The two components are deliberately not unified: a switch communicates "on/off, takes effect
immediately" (settings); a toggle button communicates "pressed/not pressed" (the same semantics a
bold/italic formatting button carries, or PrimeNG's `ToggleButton`). Doc 26 §5's row for this
component names the a11y contract as exactly `aria-pressed`, confirming the split.

---

## 2. Two faces as `onLabel`/`offLabel` (+ optional `onIcon`/`offIcon`), not projected content

The component owns rendering its own visible label text, swapping `onLabel` (default `'Yes'`) /
`offLabel` (default `'No'`) as `pressed` flips, mirroring PrimeNG `ToggleButton`'s API shape.
`onIcon`/`offIcon` are optional string inputs (glyph/ligature, same convention `ino-toggle`'s icon
overlay uses) rendered `aria-hidden` ahead of the label.

Owning the label internally — rather than taking two `<ng-content>` slots toggled by `*ngIf` —
guarantees the two faces can never drift out of sync with the `pressed` boolean the way a
consumer-authored conditional slot could (e.g. a caller forgetting to gate one of two projected
`<span>`s on the right condition).

---

## 3. Sizing reads the full button alias set, not the compact track/thumb trio

`<ino-toggle>` reads only the `--ino-control-icon-size-*` / `-font-size-*` / `-gap-*` trio because
a track/thumb is a compact inline shape. This component is a full pressable label — same shape
class as `ino-button` — so it reads the full five-alias set `ino-button` reads:
`--ino-control-height-*`, `-padding-inline-roomy-*`, `-font-size-*`, `-icon-size-*`, `-gap-*`.
`size="default"` resolves to the same 44px height every existing full-control component already
uses, so this is a pixel-for-pixel no-op with everything else on the scale.

---

## 4. Two faces reuse `ino-button`'s primary/secondary shapes

Unpressed = the same shape `ino-button`'s `secondary` variant uses (bordered, surface-raised
fill, on-surface text). Pressed = the same shape its `primary` variant uses (filled with
`--ino-gradient-accent`, on-accent text, flat-accent press). Reusing two already-audited,
already-contrast-checked pairs — rather than inventing a third visual language for this one
component — is the entire point of framing this as "one button, two faces" rather than two
different components needing their own token pairs.

---

## 5. Readonly, loading, invalid — same contracts as `ino-toggle`/`ino-checkbox`

- **Readonly**: `<button>` has no native `readonly` attribute, so it is enforced in the component
  — `onClick()` returns early while `readonly` is true. The control stays focusable and fully
  legible (unlike `disabled`, which dims it); only the hover/active affordances withdraw. The
  state is exposed as `aria-disabled`, not `aria-readonly`: `aria-readonly` is only a supported
  attribute on `checkbox`/`combobox`/`textbox`/`listbox`/`grid`/`gridcell`/`slider`/
  `spinbutton`/`radiogroup`-family roles and is dropped on a plain `button`, which would leave a
  screen-reader user with no signal at all that the press is being silently ignored.
  `aria-disabled` is supported on `button`, keeps the control focusable and discoverable (unlike
  `[disabled]`, which removes it from the tab order), and is the correct semantics for "locked
  value, still inspectable" as opposed to `disabled`'s "not interactive at all." (INO-412 CTO
  review.)
- **Loading**: `aria-busy` + natively `[disabled]` (so loading is keyboard-safe, not just
  visually inert) + an adjacent spinner; the label/icon stay on screen rather than disappearing.
- **Invalid**: a non-empty `error` string sets `aria-invalid` + `aria-describedby`, renders the
  message (`role="alert"`), and paints `--ino-invalid-ring` — the same channel
  `ino-checkbox`/`ino-toggle` use, audited per theme by `check-theme-parity.mjs`.

---

## 6. `ariaLabel` only applies when there is no visible label

Same contract `ino-toggle`'s `ariaLabel` uses: `[attr.aria-label]` is only written when
`currentLabel` is empty (i.e. the caller set both `onLabel` and `offLabel` to `''` for an
icon-only button). When a visible label is present the button is self-labelling from its own text
content, and a duplicate `aria-label` would only risk drifting from it.

---

## 7. Mobile ports

Both ports render a single pressable control with two faces, re-using each platform's existing
`InoButton`/`InoToggle` token-reading conventions rather than inventing new ones.

**Flutter** (`mobile/flutter/lib/widgets/ino_toggle_button.dart`): a `GestureDetector` +
`AnimatedContainer`, same construction `ino_button.dart` uses, swapping fill/border/text color
between the secondary-shape (unpressed) and primary-shape (pressed) pairs on `pressed`.
`Semantics(button: true, toggled: pressed)` — the direct equivalent of `aria-pressed`
(`Semantics.toggled` is Flutter's generic pressed/selected flag, used here as `ino_toggle.dart`
uses it for switch state).

**React Native** (`mobile/react-native/src/components/InoToggleButton.tsx`): a `Pressable`
reading `useTheme()`, mirroring `InoButton.tsx`'s fill/text/border-color-by-state functions.
`accessibilityRole="togglebutton"` + `accessibilityState={{ selected: pressed, disabled, busy:
loading }}` — RN's `togglebutton` role is the direct `aria-pressed` equivalent (unlike
`accessibilityState.checked`, which RN reserves for checkbox/switch/radio roles).

Both ports support `onLabel`/`offLabel`, optional `onIcon`/`offIcon`, sm/default/lg sizing,
disabled, and pressed/unpressed state. `readonly`/`loading`/`error` are web-only for this issue —
no other B1 mobile port (select-button, slider) carries those three across either, and nothing in
doc 26 §5's row for this component calls for them on mobile.
