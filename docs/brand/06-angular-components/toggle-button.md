# `<ino-toggle-button>` — Toggle Button

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
> `ino-toggle-button` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-412](/INO/issues/INO-412).
> Parity benchmark: PrimeNG 22.1.1 `ToggleButton` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Preview: [`previews/toggle-button.html`](previews/toggle-button.html).
> Decisions record: `web/src/app/components/toggle-button/SPEC.md`.

A single on/off button with two faces, WAI-ARIA "toggle button" pattern (`aria-pressed` on a
native `<button>`) — distinct from `<ino-toggle>`'s `role="switch"` pattern (`toggle.md`). A
switch communicates "on/off, takes effect immediately"; a toggle button communicates
"pressed/not pressed," the same semantics a bold/italic formatting button carries.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `onLabel` | `string` | `'Yes'` | Visible label rendered while `pressed` |
| `offLabel` | `string` | `'No'` | Visible label rendered while not `pressed` |
| `onIcon` | `string` | `''` | Optional glyph rendered (aria-hidden) ahead of `onLabel` |
| `offIcon` | `string` | `''` | Optional glyph rendered (aria-hidden) ahead of `offLabel` |
| `ariaLabel` | `string` | `''` | Accessible name override; only applied when both labels are empty (icon-only usage) — see [Labels](#labels) |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Full control-size scale (height/padding/font/icon/gap) — see [Size API](#size-api) |
| `pressed` | `boolean` | `false` | Two-way bindable via `[(pressed)]` |
| `disabled` | `boolean` | `false` | Native `[disabled]`; control dims to 50% opacity and leaves the tab order |
| `readonly` | `boolean` | `false` | Value is locked but the control stays focusable and fully legible — see [Readonly](#readonly) |
| `loading` | `boolean` | `false` | `aria-busy` + disabled interaction + adjacent spinner; the current face stays on screen |
| `error` | `string` | `''` | Non-empty sets `aria-invalid` + renders the message; also paints the invalid ring |

| Output | Payload | Fires |
|---|---|---|
| `pressedChange` | `boolean` | On every user-driven toggle |

### Size API

Reads the full five-alias `--ino-control-*` set (`-height`, `-padding-inline-roomy`,
`-font-size`, `-icon-size`, `-gap`) — the same set `ino-button` reads, because a toggle button is
a full-height pressable label, unlike `ino-toggle`'s compact track/thumb (which reads only the
icon-size trio). `size="default"` resolves to the identical 44px height every other full-control
component on the scale already uses. Full reasoning: `SPEC.md` §3.

### Two faces

Unpressed reuses the same shape `ino-button`'s `secondary` variant uses (bordered,
surface-raised fill, on-surface text); pressed reuses the same shape its `primary` variant uses
(filled with `--ino-gradient-accent`, on-accent text, flat-accent press). The component owns
rendering `onLabel`/`offLabel` (and `onIcon`/`offIcon` when provided) itself as `pressed` flips,
rather than taking projected content, so the two faces can never drift out of sync with the
`pressed` boolean. Full reasoning: `SPEC.md` §2, §4.

### Readonly

`<button>` has no native `readonly` attribute, so this is enforced in the component:
`pressedChange` simply doesn't fire while `readonly` is true. The control stays focusable and
fully legible (unlike `disabled`, which dims it); only the hover/active affordances withdraw.
Full reasoning: `SPEC.md` §5.

---

## Labels

`onLabel`/`offLabel` are visible text rendered inside the `<button>` itself — the button is
self-labelling from its own text content, same as `ino-toggle`. `ariaLabel` is the fallback
accessible name for an icon-only button (both labels set to `''`), only applied when no visible
label is present. There is no `required` or hint-text input (a toggle button is rarely a
"required field" in the form sense); `error` mirrors `ino-checkbox`'s contract — a non-empty
string sets `aria-invalid`, renders under the control via `aria-describedby` (`role="alert"`),
and paints the invalid ring.

---

## Accessibility contract

**Role / ARIA** — plain `<button>` (no role override — its implicit role is correct), with
`aria-pressed` reflecting state (WAI-ARIA toggle-button pattern). `aria-invalid` +
`aria-describedby` wire in the error message. `aria-readonly` reflects `readonly`. `aria-busy`
reflects `loading`.

**Keyboard** — Tab to focus, Space or Enter to toggle (native `<button>` activation).

**Contrast and targets** — `size="default"` resolves to 44px (`--ino-target-comfortable`), always
>= 32px even in dense mode via the control-height scale. Focus ring, invalid ring, and both face
colour pairs (secondary/primary, reused unmodified) resolve through tokens audited across all
three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`border-inline-start-color`); no `left`/`right`/`top`/`bottom`
anywhere in the stylesheet.

---

## Deliberate omissions

**PrimeNG mapping.** `ToggleButton`'s `onLabel`/`offLabel`/`onIcon`/`offIcon`/`[(ngModel)]` API
maps 1:1 onto this component's `onLabel`/`offLabel`/`onIcon`/`offIcon`/`[(pressed)]`.

**No `iconPos` input.** PrimeNG's `ToggleButton` exposes `iconPos` (`'left' | 'right'`) for where
the icon sits relative to the label. This component always renders the icon first (matching
`ino-button`'s fixed icon-then-label order) — not carried over, since nothing in doc 26 §5's row
for this component asks for a configurable icon position, and no first-party component on this
scale offers one.

**`readonly`/`loading`/`error` are web-only.** No other B1 mobile port (select-button, slider)
carries those three states across to Flutter/RN either, and the spec seed doesn't call for them
on mobile. Full reasoning: `SPEC.md` §7.

---

## Mobile parity

Both ports ship (per the issue's "Port both" disposition).

- **React Native** — `mobile/react-native/src/components/InoToggleButton.tsx`.
  `accessibilityRole="togglebutton"` + `accessibilityState={{ selected: pressed, disabled, busy:
  loading }}` carries the `aria-pressed`-equivalent contract — RN's `togglebutton` role is the
  direct equivalent (unlike `accessibilityState.checked`, which RN reserves for
  checkbox/switch/radio roles).
- **Flutter** — `mobile/flutter/lib/widgets/ino_toggle_button.dart`, `Semantics(button: true,
  toggled: pressed)`.

Both ports support `onLabel`/`offLabel`, optional `onIcon`/`offIcon`, sm/default/lg sizing, and
disabled/pressed state. `readonly`/`loading`/`error` are web-only for this issue. Full reasoning:
`SPEC.md` §7.
