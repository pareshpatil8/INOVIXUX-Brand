# `<ino-radio>` / `<ino-radio-group>` — Radio

> Parity benchmark: PrimeNG 22.1.1 `RadioButton` (`specs/primeng/llms-22.1.1.txt`, line 38).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/radio-group.html`](previews/radio-group.html).
> Decisions record: `web/src/app/components/radio-group/SPEC.md`.

A native-input-backed radio (`<input type="radio">` restyled via `accent-color`, not a custom dot +
`<svg>`) usable standalone (PrimeNG's `RadioButton` shape) or composed N-at-a-time by
`<ino-radio-group>`'s `<fieldset>`/`<legend>` wrapper, with a full eight-state contract and a shared
`size` API across both forms.

---

## `<ino-radio>` API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Visible label text |
| `name` | `string` | auto-generated | Native `name` attribute — set explicitly (matching across instances) to join several standalone radios into one native group; auto-generated per instance otherwise so a lone radio never accidentally joins another's group |
| `value` | `string` | `''` | The value this radio represents |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Dot size + label font-size + gap from the Wave 0 control-size scale — see [Size API](#size-api) |
| `checked` | `boolean` | `false` | Caller-managed, like `<ino-checkbox>` — two-way bindable via `[(checked)]` |
| `disabled` | `boolean` | `false` | Native `disabled`; row dims and the click target is inert |
| `readonly` | `boolean` | `false` | Value is locked but the control stays focusable and fully legible — see [Readonly](#readonly) |
| `loading` | `boolean` | `false` | `aria-busy` + disabled interaction + adjacent spinner |
| `invalid` | `boolean` | `false` | Paints an invalid ring + `aria-invalid`; message ownership stays with `<ino-radio-group>`'s `error` — see [Invalid](#invalid) |

| Output | Payload | Fires |
|---|---|---|
| `checkedChange` | `boolean` | On user selection (always `true` — a native radio can't be unchecked by clicking the checked one) |

### Size API

Reads three of the six Wave 0 control-size aliases — `--ino-control-icon-size`,
`--ino-control-font-size`, `--ino-control-gap` — the same subset `<ino-checkbox>`/`<ino-tag>` read,
for the same reason: the icon-size alias is the closer fit for a compact circular control than
`--ino-control-height` (sized for a full-height control like `ino-button`/`ino-input`). The label
row still reads `--ino-row-min-height` (falling back to `--ino-target-comfortable`) independently of
dot size. Full reasoning: `SPEC.md` §6.

### Readonly

Native `readonly` has no effect on radios (a text-input-only HTML attribute), so this is enforced by
canceling the native `click` when `readonly` is true — the control stays focusable and fully legible
(unlike `disabled`, which dims it). Full reasoning: `SPEC.md` §3.

### Invalid

`invalid` is a boolean, not an `error` string like `<ino-checkbox>` — a radio's natural unit of
validity is the group ("Choose a plan"), which `<ino-radio-group>` already owns via its own `error`.
Full reasoning: `SPEC.md` §4.

---

## `<ino-radio-group>` API

| Input | Type | Default | Notes |
|---|---|---|---|
| `legend` | `string` | `''` | Rendered in a `<legend>` inside the group's `<fieldset>` |
| `name` | `string` | auto-generated | Shared `name` passed to every `<ino-radio>` in the set |
| `options` | `{ label: string; value: string; disabled?: boolean }[]` | `[]` | One row per option |
| `value` | `string` | `''` | Selected option's value; two-way bindable via `[(value)]` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Passed to every item — see [Size API](#size-api) |
| `disabled` | `boolean` | `false` | Disables the whole group (native `fieldset:disabled` cascade + explicit pass-through) |
| `readonly` | `boolean` | `false` | Passed to every item |
| `error` | `string` | `''` | One shared validation message, wired via `aria-describedby` on the `<fieldset>` |

`valueChange: string` emits the newly selected option's value.

Composes `<ino-radio>` internally (INO-159 uplift) rather than re-implementing native inputs inline
— every state/size `<ino-radio>` carries above applies per-item inside a group for free. Full
reasoning: `SPEC.md` §5.

---

## Roving tabindex

Both forms get correct keyboard behavior for free from the browser, not from any custom JavaScript
in this component: every native `<input type="radio">` sharing one `name` attribute is a single tab
stop with Arrow Up/Down/Left/Right cycling selection between them, in every evergreen browser.
`<ino-radio-group>` passes one shared `name` to its rows (unchanged from before this uplift); a
standalone `<ino-radio>` gets its own auto-generated `name` so it never accidentally joins another
radio's group, unless a caller explicitly matches `name` across several standalone instances to
build their own set. Full reasoning: `SPEC.md` §1.

---

## Motion

Hover/press/invalid-ring transitions use `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`, collapsing to no animation under `prefers-reduced-motion: reduce`.
The loading spinner uses `--ino-motion-duration-slow` linear rotation, matching
`ino-button`/`ino-checkbox`/`ino-tag`'s spinner treatment, and is skipped entirely under reduced
motion.

---

## Accessibility contract

**Role / ARIA** — native `radio` role (implicit) on `<ino-radio>`; native `group` role (implicit,
from `<fieldset>` + `<legend>`) on `<ino-radio-group>`. `aria-invalid` reflects `invalid`.
`aria-readonly` is intentionally **not** bound on `<ino-radio>` — unlike `checkbox`, the `radio` role
does not support `aria-readonly` in the WAI-ARIA states-and-properties table; the readonly behavior
still applies, enforced purely in script. `aria-busy` reflects `loading`. `aria-describedby` on the
group's `<fieldset>` wires in the shared error message.

**Keyboard** — Tab moves focus onto the group once (landing on the checked radio, or the first if
none checked); Arrow Up/Down/Left/Right cycle and immediately select among same-`name` radios
(native). No custom keydown handling in either form.

**Contrast and targets** — the dot is >= the WCAG 2.2 SC 2.5.8 24px floor at `default`/`lg`
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
- **React Native** — `mobile/react-native/src/components/InoRadio.tsx` + `InoRadioGroup.tsx`. RN has
  no native radio primitive, so this is a from-scratch `Pressable`-drawn dot; `accessibilityState`
  carries a plain boolean `checked` (no `'mixed'` state, unlike checkbox).
- **Flutter** — `mobile/flutter/lib/widgets/ino_radio.dart` + `ino_radio_group.dart`, same
  from-scratch approach (not Material's built-in `Radio`, to keep full token control).

Full reasoning: `SPEC.md` §8.
