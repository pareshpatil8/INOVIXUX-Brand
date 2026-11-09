# `<ino-fieldset>` — component spec

**Issue:** [INO-439](/INO/issues/INO-439) (INO-31 B2)
**Parity benchmark:** PrimeNG 22.1.1 `Fieldset` — group/legend wrapper with a `toggleable` input.
PrimeNG is a benchmark, **not a runtime dependency**; nothing here installs it.
**Spec seed:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 row —
"legend + optional toggle", states "(plus the §2 standard set): collapsed", sizing "padding
scales", labels "legend", a11y "native `fieldset/legend`", mobile "Port both (simple)".

This file records the decisions the §2 Component Publish Contract requires to be written down
rather than silently made.

---

## 1. `collapsible` is opt-in, not the component's default shape (DoD row 1)

The spec row's variant is "legend + optional toggle" — most fieldsets (an address block, a KYB
document-upload section) are pure grouping with zero disclosure behavior. `collapsible` (default
`false`) gates whether the legend renders as a `<button>` (WAI-ARIA APG disclosure pattern:
`aria-expanded` + `aria-controls` pointing at the content region's `id`) or as plain text. When
`false`, `collapsed` is inert — there is no affordance to act on it.

## 2. Sizing is a padding scale only, not the full control-size set (DoD row 3)

`size: 'sm' | 'md' | 'lg'` (default `'md'`) re-points `--ino-control-padding-inline-roomy` only —
the doc 26 row literally says "padding scales," not the full height/font/icon/gap set
`ino-button`/`ino-input` read, because a fieldset has no single line-height control of its own.
The bare alias is already re-declared under both `[data-density]` blocks (tokens.css §10/§12),
so dense/fluid density composes for free with zero branching in this component — same recipe
`ino-card`'s header/footer bars use. Naming (`'sm'|'md'|'lg'`, not `InoControlSize`'s
`'sm'|'default'|'lg'`) deliberately matches `ino-card`'s own `padding` input, the closest existing
precedent for a container-level padding scale distinct from a control-height scale.

## 3. `readonly`: behavior-only, no ARIA state (DoD row 5)

`<fieldset>`'s implicit role is `group` (not `radiogroup` — this component does not override the
role, unlike `<ino-radio-group>`, which explicitly sets `role="radiogroup"` to carry its own
`aria-readonly`). `group` does not support `aria-readonly` in the WAI-ARIA states-and-properties
table, so adding the attribute here would be invalid ARIA. `readonly` therefore only blocks
`onToggle()` from flipping `collapsed` (the one interactive affordance this component owns) and
sets `aria-disabled="true"` on the toggle button (a global ARIA property, valid on `button`) —
the same "content stays legible and focusable, only the interactive affordance withdraws" trade
`<ino-radio>`'s readonly and `<ino-toggle-button>`'s readonly both use. `readonly` does **not**
cascade to projected descendant controls — unlike native `disabled`, there is no native readonly
cascade for `<fieldset>`, and each projected field owns its own `readonly` input.

## 4. Eight states: six carried, two deliberately N/A (DoD row 2)

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | `--ino-color-border` / `--ino-color-surface-raised` |
| Hover | ✅ (toggle only) | `color: var(--ino-color-accent)` on `.ino-fieldset__toggle` — never on the fieldset itself, which has no interactive surface when `collapsible="false"` |
| Active/pressed | ✅ (toggle only) | `--ino-color-accent-active` |
| Focus-visible | ✅ (toggle only) | `--ino-focus-ring`/`-offset`, same as every other interactive component |
| Disabled | ✅ | Native `[disabled]` on the `<fieldset>` cascades to every real descendant form control for free; this component only dims its own chrome (border opacity, legend colour) on top of that |
| Readonly | ✅ **(new)** | See §3 — toggle-only, no ARIA attribute |
| Invalid | ✅ **(new)** | `error: string` (same shape as `<ino-radio-group>`'s `error`) paints the border danger and wires `aria-invalid`/`aria-describedby` — both global ARIA properties, valid on `group` |
| Loading | ✅ **(new)** | Dims `.ino-fieldset__content` + centered spinner + `aria-busy`, matching `<ino-card>`'s "keep content mounted" treatment — for an async-populated section (e.g. a KYB document list still fetching) |
| Empty | ❌ N/A | A fieldset's whole purpose is grouping caller-projected fields; an empty fieldset has no useful collapsed/expanded affordance to demonstrate, and hiding on `:empty` (like `ino-card`'s header/footer) would hide the one thing a caller is debugging if they render one with no children by mistake |
| **Collapsed** | ✅ **(new, this issue's spec row)** | `[hidden]` on the content region when `collapsible && collapsed` — removed from the accessibility tree, not just visually hidden, matching a native `<details>` collapse |

## 5. ARIA contract (DoD row 5/8)

**`<ino-fieldset>`** — native `group` role (implicit, from `<fieldset>`+`<legend>`), unchanged/
not overridden. `aria-busy` reflects `loading`. `aria-invalid`/`aria-describedby` reflect `error`
(both global properties, valid on any role). No `aria-readonly` — see §3.

**Toggle button** (only rendered when `collapsible`) — native `button` role (implicit).
`aria-expanded` reflects `!collapsed`. `aria-controls` points at the content region's `id`.
`aria-disabled` reflects `readonly` (§3). No custom keydown handling — Enter/Space on a native
`<button>` already dispatch `click`.

**Keyboard** — Tab reaches the toggle button (when present) as a normal tab stop; Enter/Space
activate it (native). No roving tabindex or arrow-key behavior — this is a single disclosure
control, not a group of same-role siblings like `<ino-radio-group>`.

**RTL** — logical properties only (`padding-block`/`padding-inline`, `margin-inline-start`,
`border-inline-start-color`); no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

## 6. Mobile parity (DoD row 7 — spec row says "Port both (simple)")

- **React Native** — `mobile/react-native/src/components/InoFieldset.tsx`. No native fieldset
  primitive; a `View` wrapping a `Pressable` "legend" row (when `collapsible`) + a conditionally
  rendered content `View`, mirroring the web disclosure pattern 1:1
  (`accessibilityRole="button"`, `accessibilityState={{ expanded, disabled: readonly }}` on the
  legend row).
- **Flutter** — `mobile/flutter/lib/widgets/ino_fieldset.dart`. A `Container` + `GestureDetector`
  legend row + conditionally rendered content `Column`, same shape; `Semantics(expanded: ...)` for
  the collapsible case.
- Capacitor is not a separate port (plan rev 9 §5) — the same Angular component renders inside the
  Capacitor WebView.

## 7. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `tag/SPEC.md` §8 and `radio-group/SPEC.md` §9: DoD row 11 describes "one appended
line in the `check-theme-parity.mjs` component registry," but no such registry exists in the file.
Nothing appended; `node scripts/check-theme-parity.mjs` passes unchanged.

## 8. Verification run for this issue

| Check | Result |
|---|---|
| `ng test --include ino-fieldset.spec.ts` | ✅ 7/7 pass |
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |

**jsdom caveat (not a component defect):** jsdom does not implement the HTML "fieldset disabled"
descendant-cascade algorithm — verified directly (`new JSDOM('<fieldset disabled><input></fieldset>')`
leaves `input.disabled === false`). The disabled test above therefore only asserts the fieldset's
own attribute; the real cascade onto projected descendant controls is native, spec-correct
behavior in every evergreen browser and needs no code here.
