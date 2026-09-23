# `<ino-checkbox>` / `<ino-checkbox-group>` — Checkbox

> Parity benchmark: PrimeNG 22.1.1 `Checkbox` (`specs/primeng/llms-22.1.1.txt`, line 42).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/checkbox.html`](previews/checkbox.html).
> Decisions record: `web/src/app/components/checkbox/SPEC.md`.

A native-input-backed checkbox (`<input type="checkbox">` restyled via `accent-color`, not a custom
box + SVG checkmark) with a tri-state indeterminate visual, a full eight-state contract, and a
`<ino-checkbox-group>` sibling for a shared-name multi-select set.

---

## `<ino-checkbox>` API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Visible label text, rendered in a real `<label for>` |
| `name` | `string` | `''` | Native `name` attribute; set automatically when used inside `<ino-checkbox-group>` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Box size + label font-size + gap from the Wave 0 control-size scale — see [Size API](#size-api) |
| `checked` | `boolean` | `false` | Two-way bindable via `[(checked)]` |
| `indeterminate` | `boolean` | `false` | Tri-state visual + `aria-checked="mixed"` — see [Indeterminate](#indeterminate) |
| `disabled` | `boolean` | `false` | Native `disabled`; row dims and the click target is inert |
| `readonly` | `boolean` | `false` | Value is locked but the control stays focusable and fully legible — see [Readonly](#readonly) |
| `loading` | `boolean` | `false` | `aria-busy` + disabled interaction + adjacent spinner; the box keeps its last committed value on screen |
| `error` | `string` | `''` | Non-empty sets `aria-invalid` + renders the message; also paints a ring on the box itself |

| Output | Payload | Fires |
|---|---|---|
| `checkedChange` | `boolean` | On every user-driven check/uncheck |
| `indeterminateChange` | `boolean` | Emits `false` when a user interaction resolves an indeterminate checkbox to a concrete value |

### Size API

Reads three of the six Wave 0 control-size aliases — `--ino-control-icon-size`,
`--ino-control-font-size`, `--ino-control-gap` — the same subset `ino-tag` reads, for the same
reason: the icon-size alias (16/20/24px) is the closer fit for a compact square box than
`--ino-control-height` (44/36/52px, sized for a full-height control like `ino-button`/`ino-input`).

The label row still reads `--ino-row-min-height` (falling back to `--ino-target-comfortable`) as its
`min-height`, independently of box size — so the tappable row stays on the row/control-height family
regardless of which box size is painted inside it. Full reasoning: `SPEC.md` §3.

### Indeterminate

`indeterminate` binds directly to the native `HTMLInputElement.indeterminate` DOM property.
Browsers already expose that as the accessibility tree's mixed checked state; `aria-checked="mixed"`
is also bound explicitly so the value is present in rendered markup, not just the live a11y tree.
Clicking (or pressing Space on) an indeterminate checkbox always resolves it to a concrete value —
native behavior — and `indeterminateChange` fires `false` at that point so a `[(indeterminate)]`
binding doesn't fight the click back to mixed. Full reasoning: `SPEC.md` §2.

### Readonly

Native `readonly` has no effect on checkboxes (it's a text-input-only HTML attribute), so this is
enforced by canceling the native `click` when `readonly` is true — the control stays focusable and
fully legible (unlike `disabled`, which dims it), only the interactive affordances withdraw. Full
reasoning: `SPEC.md` §4.

---

## `<ino-checkbox-group>` API

| Input | Type | Default | Notes |
|---|---|---|---|
| `legend` | `string` | `''` | Rendered in a `<legend>` inside the group's `<fieldset>` |
| `name` | `string` | auto-generated | Shared `name` passed to every `<ino-checkbox>` in the set |
| `options` | `{ label: string; value: string; disabled?: boolean }[]` | `[]` | One row per option |
| `value` | `string[]` | `[]` | Selected option values; two-way bindable via `[(value)]` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Passed to every item |
| `disabled` | `boolean` | `false` | Disables the whole group (native `fieldset:disabled` cascade + explicit pass-through) |
| `readonly` | `boolean` | `false` | Passed to every item |
| `error` | `string` | `''` | One shared validation message, wired via `aria-describedby` on the `<fieldset>` |

`valueChange: string[]` emits the full next selection on every toggle.

Composes `<ino-checkbox>` internally rather than re-implementing native inputs — every state/size
this document describes above applies per-item inside a group for free. Full reasoning: `SPEC.md`
§6.

---

## Motion

Hover/press/invalid-ring transitions use `--ino-motion-duration-fast` +
`--ino-motion-easing-standard` — collapsing to no animation under `prefers-reduced-motion: reduce`.
The loading spinner uses `--ino-motion-duration-slow` linear rotation, matching `ino-button`/
`ino-tag`'s spinner treatment, and is skipped entirely under reduced motion.

---

## Accessibility contract

**Role / ARIA** — native `checkbox` role (implicit). `aria-checked` reflects `checked` natively in
every case except the explicit `aria-checked="mixed"` binding while `indeterminate`. `aria-invalid`
+ `aria-describedby` wire in the error message. `aria-readonly` reflects `readonly` (a role
`checkbox` supports per the WAI-ARIA states-and-properties table). `aria-busy` reflects `loading`.

**Keyboard** — Tab moves focus between checkboxes (every checkbox in a set is independently
tab-reachable — unlike a radio group's roving tabindex). Space toggles the focused checkbox; the
same activation cancels when `readonly` is true.

**Contrast and targets** — the box itself is >= the WCAG 2.2 SC 2.5.8 24px floor at `default`/`lg`
(20px/24px); the effective click target is the full label row via `--ino-row-min-height`/
`--ino-target-comfortable`, always >= 32px even in dense mode. Focus ring, invalid ring and the
danger error text all resolve through tokens audited across all three themes by
`node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`inline-size`/`block-size`, `border-inline-start-color`); no
`left`/`right`/`top`/`bottom` anywhere in either component's stylesheet.

---

## Mobile parity

All three tracks ship (per the issue).

- **Capacitor** — not a separate port; the same Angular components/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoCheckbox.tsx` +
  `InoCheckboxGroup.tsx`. RN has no native checkbox primitive, so this is a from-scratch
  `Pressable`-drawn box; `accessibilityState.checked` carries `true | false | 'mixed'` directly.
- **Flutter** — `mobile/flutter/lib/widgets/ino_checkbox.dart` +
  `ino_checkbox_group.dart`, same from-scratch approach (not Material's built-in `Checkbox`, to
  keep full token control); `indeterminate` surfaces through `Semantics.mixed`.

Full reasoning: `SPEC.md` §9.
