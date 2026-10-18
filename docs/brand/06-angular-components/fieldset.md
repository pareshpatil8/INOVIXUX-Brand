# `<ino-fieldset>` — Fieldset

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-fieldset` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-439](/INO/issues/INO-439).
> Parity benchmark: PrimeNG 22.1.1 `Fieldset` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/fieldset/SPEC.md`.

Native `<fieldset>`/`<legend>` grouping wrapper for related form fields (an address block, a KYB
document-upload section), with an optional collapse/expand disclosure on the legend.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `legend` | `string` | `''` | The group's one label — native `<legend>`, so it is the accessible name for every descendant control for free |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding scale only — see [Size API](#size-api) |
| `collapsible` | `boolean` | `false` | Renders the legend as a disclosure `<button>` instead of plain text — see [Collapsible](#collapsible) |
| `collapsed` | `boolean` | `false` | Two-way bindable via `[(collapsed)]`; inert when `collapsible="false"` |
| `disabled` | `boolean` | `false` | Native `[disabled]`; cascades to every real descendant form control for free |
| `readonly` | `boolean` | `false` | Locks the collapse toggle only — see [Readonly](#readonly) |
| `loading` | `boolean` | `false` | Dims the content region and shows a centered spinner, `aria-busy` |
| `error` | `string` | `''` | Non-empty sets `aria-invalid` + renders the message below the content |

| Output | Payload | Fires |
|---|---|---|
| `collapsedChange` | `boolean` | On every user-driven toggle (only when `collapsible`) |

### Size API

`size` re-points `--ino-control-padding-inline-roomy` only — a fieldset has no single
line-height control of its own, so it does not read the full height/font/icon/gap set a
pressable control does. The bare alias is already re-declared under both `[data-density]`
blocks, so dense/fluid density composes for free. Full reasoning: `SPEC.md` §2.

### Collapsible

`collapsible="false"` (default) renders a plain-text `<legend>` with no interactive affordance —
most fieldsets are pure grouping. `collapsible="true"` renders the legend as a `<button>`
(WAI-ARIA APG disclosure pattern: `aria-expanded` + `aria-controls` pointing at the content
region), and `[hidden]` removes the content from the accessibility tree while collapsed.

### Readonly

`<fieldset>`'s implicit role is `group`, which does not support `aria-readonly` — adding it would
be invalid ARIA. `readonly` therefore only blocks the collapse toggle from firing (behavior-only,
no ARIA state); descendant fields are unaffected and own their own `readonly`. Full reasoning:
`SPEC.md` §3.

---

## Labels

`legend` is the one label this component owns. There is no separate `hint`/`required` input — a
fieldset groups fields that each carry their own label/hint/required marker; a second label layer
at the group level would duplicate that. `error` covers the one group-level message a caller
needs (e.g. "Complete both fields to continue"), the same shape `ino-radio-group`'s `error`
already uses.

---

## Accessibility contract

**Role / ARIA** — native `group` role (implicit, from `<fieldset>`+`<legend>`, not overridden).
`aria-busy` reflects `loading`. `aria-invalid`/`aria-describedby` reflect `error` (both global
ARIA properties, valid on any role). No `aria-readonly` — see [Readonly](#readonly).

**Toggle button** (only when `collapsible`) — native `button` role. `aria-expanded` reflects
`!collapsed`. `aria-controls` points at the content region's `id`. `aria-disabled` reflects
`readonly`.

**Keyboard** — Tab reaches the toggle button (when present) as a normal stop; Enter/Space
activate it (native `<button>` activation, no custom keydown handling). No arrow-key behavior —
this is a single disclosure control, not a same-role sibling group.

**Contrast and targets** — border, legend, and error text colours resolve through tokens audited
across all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`padding-block`/`padding-inline`, `margin-inline-start`,
`border-inline-start-color`); no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

**PrimeNG mapping.** `Fieldset`'s `legend`/`toggleable`/`collapsed`/`(collapsedChange)` API maps
1:1 onto this component's `legend`/`collapsible`/`collapsed`/`(collapsedChange)`.

**`empty` state not carried.** A fieldset's whole purpose is grouping caller-projected fields; an
empty fieldset has no useful collapsed/expanded affordance to demonstrate. Full reasoning:
`SPEC.md` §4.

**No native `disabled`/`readonly` cascade onto RN/Flutter children.** Unlike the web component
(which gets the descendant-`disabled` cascade for free from `<fieldset disabled>`), neither mobile
platform has an equivalent primitive — each mobile port only dims its own chrome; projected
children keep their own `disabled`/`readonly`. Full reasoning: `SPEC.md` §6.

---

## Mobile parity

Both ports ship (per the issue's "Port both (simple)" disposition).

- **React Native** — `mobile/react-native/src/components/InoFieldset.tsx`.
  `accessibilityRole="none"` wrapper (RN has no `group`/`fieldset` role); the collapsible toggle
  row carries `accessibilityRole="button"` + `accessibilityState={{ expanded, disabled: readonly
  }}`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_fieldset.dart`, `Semantics(container: true, label:
  legend)` wrapper; the collapsible toggle row carries `Semantics(button: true)`.

Both ports support `legend`, the `sm`/`md`/`lg` padding scale, `collapsible`/`collapsed`,
`loading`, and `error`. `readonly` is behavior-only on both (locks the toggle, no corresponding
accessibility state exists on either platform for a readonly group). Full reasoning: `SPEC.md`
§6.
