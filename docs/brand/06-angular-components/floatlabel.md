# `<ino-float-label>` — FloatLabel

> Parity benchmark: PrimeNG 22.1.1 `FloatLabel` (`specs/primeng/llms-22.1.1.txt`, line 62,
> `https://primeng.dev/floatlabel`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
> here installs it.
>
> Gap analysis: `docs/brand/16-design-system-parity-vs-echeque-reference.md` corrected — label
> placement is a wrapper *component* concern (this issue), not a `labelMode` variant on 7
> individual controls, which is how doc 16 rev 2 had mis-logged it.
> Preview: [`previews/floatlabel.html`](previews/floatlabel.html).
> Decisions record: `web/src/app/components/floatlabel/SPEC.md`.

Wraps a bare native form control and floats a label above/inside/onto it, so no Tier-1 control
needs its own `labelMode` prop to get this behaviour (INO-141, INO-31 T-18). Three variants, ported
1:1 from the PrimeNG benchmark.

---

## Usage

```html
<ino-float-label for="username" label="Username" variant="over">
  <input id="username" />
</ino-float-label>
```

The wrapped control is projected content — a bare `<input>`, `<textarea>`, or `<select>`, not
`<ino-input>`/`<ino-select>` (those already render their own fixed-position label; see
[Relationship to `ino-input`/`ino-select`](#relationship-to-ino-inputino-select) below). The label
is **not** projected — `label`/`for` are inputs, and `<ino-float-label>` composes `<ino-label>`
internally. See [SPEC.md §1](../../../web/src/app/components/floatlabel/SPEC.md#1-why-this-is-a-stateful-wrapper-not-a-css-only-one-dod-row-1711)
for why that differs from the PrimeNG benchmark's two-children shape.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `for` | `string` | `''` | The `id` of the projected control — forwarded to the internal `<ino-label for>` |
| `label` | `string` | `''` | Label text |
| `variant` | `'over' \| 'in' \| 'on'` | `'over'` | See [Variants](#variants) |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Must match the height the caller gives the wrapped control (`InoControlSize`) |
| `required` | `boolean` | `false` | Forwarded to the internal `<ino-label required>` |
| `disabled` | `boolean` | `false` | Forwarded to the internal `<ino-label disabled>` + dims the label via a host class |
| `invalid` | `boolean` | `false` | Forwarded to the internal `<ino-label invalid>` |
| `readonly` | `boolean` | `false` | Forwarded to the internal `<ino-label readonly>` |

### Variants

| Variant | Behaviour |
|---|---|
| `over` (default) | Rest: label overlaps the control like a placeholder. Floated: label moves fully above the control. |
| `in` | Control permanently reserves top space; floated label docks inside the top of that space. |
| `on` | As `in`, plus a background cutout behind the floated label so it reads as sitting on the control's border. |

The `on` cutout assumes the wrapper sits on the app's base surface — override
`--ino-float-label-on-bg` on the element for a raised-surface context (a card, a modal). See
[SPEC.md §3](../../../web/src/app/components/floatlabel/SPEC.md#3-variants-built-dod-row-6).

### How "floated" is derived

No CSS `:focus`/`:not(:placeholder-shown)` trick — the component queries the projected control in
`ngAfterContentInit` and listens for `focus`/`blur`/`input`, deriving `floated = focused ||
value.length > 0`. A native `<select>` has no meaningful empty state, so its label is
unconditionally floated. Full rationale (including why this isn't the CSS-only shape the PrimeNG
benchmark uses) in [SPEC.md §1](../../../web/src/app/components/floatlabel/SPEC.md#1-why-this-is-a-stateful-wrapper-not-a-css-only-one-dod-row-1711).

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default / hover / active / focus-visible / loading | — | Owned by the wrapped control — it renders its own chrome |
| Disabled | `disabled` input | Internal `<ino-label>` dims + host class keeps the label in visual step |
| Readonly | `readonly` input | Forwarded to the internal `<ino-label readonly>` |
| Invalid | `invalid` input | Forwarded to the internal `<ino-label invalid>` |

See [SPEC.md §2](../../../web/src/app/components/floatlabel/SPEC.md#2-state-ownership-split-dod-row-5)
for the full ownership split.

---

## Motion

The label's position/size transition uses `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`, collapsing to no animation under `prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role / ARIA** — the internal `<ino-label for>` gives the accessible-name link natively; no extra
ARIA needed on this wrapper.

**Keyboard** — none of its own. Focus moves to the wrapped control exactly as it would without this
wrapper; `<ino-float-label>` adds no tab stop.

**Target size** — not applicable; the label is `pointer-events: none` and draws no target of its
own (SC 2.5.8 targets the control it names, unaffected by this wrapper).

**Contrast** — inherits `--ino-color-label*` from `<ino-label>`, already audited AA 4.5:1 / AAA 7:1
by `check-theme-parity.mjs`'s W0-3 block.

**RTL** — logical properties only (`inset-inline-start`, `padding-block-start`, `padding-inline`);
verified with `dir="rtl"` in the preview.

---

## Relationship to `ino-input`/`ino-select`

`ino-input` and `ino-select` already render their own fixed-position label above the control — they
are **not** meant to be wrapped in `<ino-float-label>` as-is (doing so would render two labels).
This component targets a **bare** native `<input>`/`<textarea>`/`<select>` that does not already
carry its own label markup — exactly PrimeNG's own split between `pInputText` (a directive, no
label) and `pFloatLabel` (the wrapper). Retrofitting `ino-input`/`ino-select` to optionally opt into
float-label placement is out of scope for this issue (merge hygiene — see
`web/src/app/components/floatlabel/SPEC.md`) and would be its own follow-up issue if a real caller
needs it.

---

## Mobile parity

All three tracks ship (Tier-1 form component, per `17-phase-2-implementation-program.md` §5, T-18: `M = 3`):

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView ("Capacitor is not a port"). No touch-target check applies (the label draws no target).
- **React Native** — `mobile/react-native/src/components/InoFloatLabel.tsx`. A real, stateful port
  (RN has no CSS pseudo-classes): the caller passes its field's `value`/`focused` state as props,
  and the component animates position/font-size off those two inputs.
- **Flutter** — `mobile/flutter/lib/widgets/ino_float_label.dart`. Same shape: the caller supplies
  its `FocusNode`/`TextEditingController`, and a `StatefulWidget` listens to both to drive the
  animation.

Both native ports render their label text directly rather than delegating to
`InoLabel`/`ino_label.dart` — see `SPEC.md` §6 for why, and `check-theme-parity.mjs`'s `floatlabel`
registry entry for the declared colour-role divergence that follows from it.
