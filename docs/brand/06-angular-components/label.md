# `<ino-label>` — Label

> Parity benchmark: PrimeNG 22.1.1 `Label` (`specs/primeng/llms-22.1.1.txt`, line 81).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/16-design-system-parity-vs-echeque-reference.md` §9 (register item N-4).
> Preview: [`previews/label.html`](previews/label.html).
> Decisions record: `web/src/app/components/label/SPEC.md`.

The reusable form-label leaf (INO-140, INO-31 T-19): a real `<label for>`, three size tiers bound
to the Wave 0 form-label token set (INO-125/W0-3), a decorative required marker, and readonly/
invalid/disabled colour states. Presentational and non-interactive by design — see
[SPEC.md §1](../../../web/src/app/components/label/SPEC.md#1-non-interactive-4-of-8-states-carried-4-deliberately-na-dod-row-5)
for why hover/active/focus-visible/loading are not part of its state set.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `for` | `string` | `''` | Native `for`/`id` association — the accessible-name link to the control this label names |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Maps 1:1 onto `InoControlSize` and the `label-lg`/`label`/`label-sm` type tiers — see [Size API](#size-api) |
| `required` | `boolean` | `false` | Decorative `*` marker (`aria-hidden`) — see [Accessibility contract](#accessibility-contract) |
| `disabled` | `boolean` | `false` | `--ino-color-label-disabled` |
| `invalid` | `boolean` | `false` | `--ino-color-label-invalid` |
| `readonly` | `boolean` | `false` | `--ino-color-label-muted` — "labels on a readonly field" per `form-label-tokens.md` §4 |

Label text is projected content: `<ino-label for="email" required>Email</ino-label>`.

### Size API

Reads the **label** type role fields (`--ino-type-label-{lg,,sm}-{size,line,weight,tracking}`,
tokens.css §4b) — not the `--ino-control-*` control-size aliases. The three tiers map 1:1 onto
`InoControlSize`, so a form control's own `size` input passes straight through to the `<ino-label>`
it renders next to, with no translation table needed (`form-label-tokens.md` §2). Density
(`[data-density="dense"|"fluid"]`) falls out for free: `--ino-type-label-*` is itself re-declared
per density ancestor.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Size-tiered type, `--ino-color-label` |
| Disabled | `disabled` input | `--ino-color-label-disabled` |
| Readonly | `readonly` input | `--ino-color-label-muted` |
| Invalid | `invalid` input | `--ino-color-label-invalid` |
| Hover / Active / Focus-visible / Loading | — | N/A — a `<label for>` is never itself focused or busy; the control it names owns those states. See SPEC.md §1 |

---

## Motion

The colour transition on state changes uses `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`, collapsing to no animation under `prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role / ARIA** — a real `<label for>` gives the accessible-name link natively; no extra ARIA
needed. The `required` marker is `aria-hidden="true"` and decorative only — colour alone never
carries meaning (WCAG 1.4.1), so the control this label names must independently expose
`aria-required="true"` and/or the word "required" in its own accessible name.

**Keyboard** — none. The label is never in the tab order; clicking/tapping it moves focus to (or
toggles) the control named by `for`, which is native `<label>` behaviour, not something this
component implements.

**Contrast** — `label`/`label-muted`/`label-invalid`/`required-marker` are audited AA 4.5:1 (AAA
7:1 in high-contrast) by `check-theme-parity.mjs`'s W0-3 block; `label-disabled` is exempt (WCAG
1.4.3 disabled-content carve-out).

**Target size** — not applicable; the label is inline text, not a control (SC 2.5.8 targets the
control it names).

**RTL** — logical properties only (`gap`, no `margin-left`/`-right`).

---

## Deliberate omissions

- **Not retrofit onto `ino-input`/`ino-select`.** Those components keep their existing inline
  `<label for>` markup; this issue does not touch either file (merge hygiene). See
  [SPEC.md §4](../../../web/src/app/components/label/SPEC.md#4-not-retrofit-onto-ino-inputino-select-dod-row-11-merge-hygiene).

## Mobile parity

All three tracks ship (Tier-1 form component, per `17-phase-2-implementation-program.md` §5):

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView ("Capacitor is not a port"). No touch-target check applies (the label is inline text).
- **React Native** — `mobile/react-native/src/components/InoLabel.tsx`, using the fluid-density
  `type.label`/`type.labelSm`/`type.labelLg` scale (`theme/tokens.ts`).
- **Flutter** — `mobile/flutter/lib/widgets/ino_label.dart`, hand-composing the same fluid-tier
  values RN's type scale exports (`tokens.dart` has no form-label type scale of its own yet — see
  SPEC.md §6).

Both native ports carry `size`/`required`/`disabled`/`invalid`/`readOnly` using the same colour
aliases (`onSurface`/`onSurfaceMuted`/`onSurfaceSubtle`/`dangerTextSafe`) the web component's
`--ino-color-label*` roles resolve to.
