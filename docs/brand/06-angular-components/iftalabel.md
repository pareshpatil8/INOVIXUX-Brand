# `<ino-ifta-label>` — IftaLabel

> Parity benchmark: PrimeNG 22.1.1 `IftaLabel` (`specs/primeng/llms-22.1.1.txt`, line 68,
> `https://primeng.dev/iftalabel`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
> here installs it.
>
> Family: completes the label-placement trio with [`<ino-label>`](label.md) (T-19, the base leaf)
> and [`<ino-float-label>`](floatlabel.md) (T-18, the focus/fill-driven floating wrapper).
> Preview: [`previews/iftalabel.html`](previews/iftalabel.html).
> Decisions record: `web/src/app/components/iftalabel/SPEC.md`.

Wraps a bare native form control and permanently docks a small label to its top-inside edge —
in-field, top-aligned (INO-142, INO-31 T-20). Unlike `<ino-float-label>`, there is no rest/floated
toggle: the label always renders in the docked position, matching the single style PrimeNG's own
`IftaLabel` route ships.

---

## Usage

```html
<ino-ifta-label for="username" label="Username">
  <input id="username" />
</ino-ifta-label>
```

The wrapped control is projected content — a bare `<input>`, `<textarea>`, or `<select>`, not
`<ino-input>`/`<ino-select>` (those already render their own fixed-position label). The label is
**not** projected — `label`/`for` are inputs, and `<ino-ifta-label>` composes `<ino-label>`
internally, the same shape `<ino-float-label>` uses.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `for` | `string` | `''` | The `id` of the projected control — forwarded to the internal `<ino-label for>` |
| `label` | `string` | `''` | Label text |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Must match the height the caller gives the wrapped control (`InoControlSize`) |
| `required` | `boolean` | `false` | Forwarded to the internal `<ino-label required>` |
| `disabled` | `boolean` | `false` | Forwarded to the internal `<ino-label disabled>` + dims the label via a host class |
| `invalid` | `boolean` | `false` | Forwarded to the internal `<ino-label invalid>` |
| `readonly` | `boolean` | `false` | Forwarded to the internal `<ino-label readonly>` |

### Variants

None — the PrimeNG `IftaLabel` route ships a single style (contrast `<ino-float-label>`'s
`over`/`in`/`on`). See [SPEC.md §3](../../../web/src/app/components/iftalabel/SPEC.md#3-variants-dod-row-6--none-built-none-in-the-benchmark).

### Why there is no "floated" state

The label is permanently docked from first render — `ngAfterContentInit` only reserves its space on
the projected control (`Renderer2`, unconditional); there is no `focus`/`blur`/`input` listening the
way `<ino-float-label>` needs, because there is no rest state to transition out of. Full reasoning in
[SPEC.md §1](../../../web/src/app/components/iftalabel/SPEC.md#1-why-this-needs-no-floated-state-contrast-ino-float-label).

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default / hover / active / focus-visible / loading | — | Owned by the wrapped control — it renders its own chrome |
| Disabled | `disabled` input | Internal `<ino-label>` dims + host class keeps the label in visual step |
| Readonly | `readonly` input | Forwarded to the internal `<ino-label readonly>` |
| Invalid | `invalid` input | Forwarded to the internal `<ino-label invalid>` |

See [SPEC.md §2](../../../web/src/app/components/iftalabel/SPEC.md#2-state-ownership-split-dod-row-5)
for the full ownership split.

---

## Motion

None by default — the label has no enter/exit transition to animate (there is no rest/floated state,
above). The label's own colour transitions on `disabled`/`invalid` toggling using
`--ino-motion-duration-fast` + `--ino-motion-easing-standard`, collapsing to an instant swap under
`prefers-reduced-motion: reduce`. See
[SPEC.md §4](../../../web/src/app/components/iftalabel/SPEC.md#4-motion-dod-row-7--no-enterexit-transition-deliberate-documented)
for why this is a deliberate, documented DoD row 7 scope, not a silently dropped one.

---

## Accessibility contract

**Role / ARIA** — the internal `<ino-label for>` gives the accessible-name link natively; no extra
ARIA needed on this wrapper.

**Keyboard** — none of its own. Focus moves to the wrapped control exactly as it would without this
wrapper; `<ino-ifta-label>` adds no tab stop.

**Target size** — not applicable; the label is `pointer-events: none` and draws no target of its
own (SC 2.5.8 targets the control it names, unaffected by this wrapper).

**Contrast** — inherits `--ino-color-label*` from `<ino-label>`, already audited AA 4.5:1 / AAA 7:1
by `check-theme-parity.mjs`'s W0-3 block.

**RTL** — logical properties only (`inset-inline-start`, `padding-block-start`, `padding-inline`);
verified with `dir="rtl"` in the preview.

---

## Relationship to `ino-input`/`ino-select`/`ino-float-label`

`ino-input` and `ino-select` already render their own fixed-position label — they are **not** meant
to be wrapped in `<ino-ifta-label>` as-is (doing so would render two labels), the same restriction
`<ino-float-label>`'s own docs page documents. `<ino-ifta-label>` and `<ino-float-label>` are
alternative wrappers for the same bare-control use case — pick `<ino-ifta-label>` for a permanently
docked label, `<ino-float-label>` for a label that rests as placeholder-like text until focus/fill.

---

## Mobile parity

All three tracks ship (Tier-1 form component, per `17-phase-2-implementation-program.md` §5, T-20:
`M = 3`):

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView ("Capacitor is not a port"). No touch-target check applies (the label draws no target).
- **React Native** — `mobile/react-native/src/components/InoIftaLabel.tsx`. A static port (no
  `Animated` — there is no floated transition to drive): the label renders permanently docked.
- **Flutter** — `mobile/flutter/lib/widgets/ino_ifta_label.dart`. Same static shape: a stateless
  widget with no animation.

Both native ports render their label text directly rather than delegating to
`InoLabel`/`ino_label.dart` — see `SPEC.md` §7 for why, and `check-theme-parity.mjs`'s `iftalabel`
registry entry for the declared colour-role divergence that follows from it.
