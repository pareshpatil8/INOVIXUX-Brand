# `<ino-stepper>` / `<ino-step>` — Stepper

> Parity benchmark: PrimeNG 22.1.1 `Stepper` (`specs/primeng/llms-22.1.1.txt`, line 113).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/24-primeng-component-audit-ino-31.md` F-1 (T-27, committed in Wave 2,
> unbuilt until this issue). Recovered to full DS parity by INO-361.
> Decisions record: `web/src/app/components/stepper/SPEC.md`.

Wizard-like multi-step workflow container. Same container/leaf split and selection model as
`<ino-tabs>`/`<ino-tab-panel>`, plus a linear-mode reachability gate.

```html
<ino-stepper #stepper [(activeIndex)]="step">
  <ino-step label="Account" [completed]="accountValid">…</ino-step>
  <ino-step label="Payment" description="Card or bank transfer" [completed]="paymentValid">…</ino-step>
  <ino-step label="Review">…</ino-step>
</ino-stepper>
<button (click)="stepper.previous()">Back</button>
<button (click)="stepper.next()">Next</button>
```

---

## API

### `<ino-stepper>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `activeIndex` | `number \| undefined` | `undefined` | Two-way-bindable with `activeIndexChange`. Omit for uncontrolled mode |
| `linear` | `boolean` | `true` | Gates how far a caller can jump ahead — see [Linear mode](#linear-mode) |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Indicator diameter |
| `readonly` | `boolean` | `false` | Focusable-but-inert — recovered by INO-361 |

`activeIndexChange: EventEmitter<number>`. Public methods: `next()`, `previous()` — both go through
the same reachability gate a header click would (SPEC.md §2).

### `<ino-step>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered next to the indicator |
| `description` | `string` | `''` | Optional secondary line under the label — recovered by INO-361 |
| `disabled` | `boolean` | `false` | Permanently unreachable, regardless of `linear` |
| `invalid` | `boolean` | `false` | Danger-text-safe indicator/label, `aria-invalid` — recovered by INO-361 |
| `loading` | `boolean` | `false` | Spinner in the indicator, `aria-busy` — recovered by INO-361 |
| `completed` | `boolean` | `false` | **Consumer-owned** — set once this step's own validation passes. Drives the checkmark and, in `linear` mode, unlocks the next step. Never derived internally (SPEC.md §1) |

### Linear mode

In `linear="true"` (default), a step is reachable only once every step before it has `completed`
set — by the consumer, not by the stepper (SPEC.md §1). `linear="false"` makes every non-`disabled`
step always reachable. `disabled` is a separate, permanent lock that always wins over reachability in
either mode. A step locked by `linear` gating is focusable but `aria-disabled`, not natively
`[disabled]` — it stays in the roving-tabindex path (SPEC.md §2).

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Numbered indicator, resting text colour |
| Active | `activeIndex` matches | Indicator ring/text `--ino-color-accent` |
| Completed | `<ino-step [completed]>` | Indicator fills `--ino-color-accent` + checkmark glyph (can coincide with active — SPEC.md §3) |
| Hover | `:hover` (reachable, non-`readonly` step) | Text promotes toward `on-surface` |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Disabled | `<ino-step [disabled]>` | `--ino-color-on-surface-subtle`, native `disabled` |
| Locked (unreached, linear mode) | beyond the linear frontier | Dimmed, `aria-disabled`, still focusable |
| Readonly | `<ino-stepper [readonly]>` | Non-active steps dimmed, activation refused, still focusable |
| Invalid | `<ino-step [invalid]>` | Danger-text-safe indicator/label, `aria-invalid` |
| Loading | `<ino-step [loading]>` | Spinner in the indicator, `aria-busy` |

---

## Motion

Indicator fill/border/text-colour and header text-colour transition on
`--ino-motion-duration-fast`/`-base` with `--ino-motion-easing-standard`; panel enter animates on
`--ino-motion-duration-base`/`-decelerate`; loading spinner rotates on `--ino-motion-duration-slow`
linear. All zeroed under `prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role / ARIA** — reuses the audited WAI-ARIA Tabs-pattern roles (`role="tablist"`/`"tab"`/
`"tabpanel"`) rather than inventing a stepper-specific contract. `aria-disabled` covers both the
permanent `disabled` lock and the linear-mode "not yet reached" lock; a screen-reader-only suffix on
the header button disambiguates which, for a user who wants to know.

**Keyboard** — same roving-tabindex automatic-activation model as `<ino-tabs>`, constrained to the
reachable-steps list, with the same horizontal-RTL-aware / vertical-no-flip arrow key split.

**Contrast** — active/completed indicator fills and the connector line are all already-audited roles.

**Target size** — the clickable surface is the whole step button (indicator + label + gap), which
clears SC 2.5.8 even though the indicator glyph alone is smaller at `sm`.

**RTL** — logical properties only; connector and indicator positions mirror correctly under
`dir="rtl"`.

---

## Selection model

Index-based, controlled or uncontrolled — same decision and reasoning as `<ino-tabs>` (SPEC.md §2).

## Mobile parity

Both mobile ports ship (INO-334, re-cut as #75).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoStepper.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_stepper.dart`.

Both ports render the step rail only — the parent supplies panel content, since web's
content-projection `<ino-step>` child has no mobile equivalent worth inventing. Props are index-based
and controlled-only, matching web's selection model (SPEC.md §2). `completed` is consumer-supplied on
both ports, same as web's post-INO-361 model — the ports never needed to change behavior, only a
doc-comment correction (their old comment described web's pre-recovery internal derivation).
**`readonly`, per-step `description`, `invalid`, `loading` are web-only for now** — recorded in
SPEC.md §9 as a deliberate deferral, not a silent gap. No keyboard map or focus ring (no touch
equivalent), same omission `InoTabs`' ports make.

## Behavioral test

`ino-stepper.spec.ts` covers initial active-panel visibility, linear-mode blocking of unreached steps
(while keeping them focusable), `next()`/`previous()` behavior against a consumer-owned `completed`
flag, free navigation when `linear="false"`, `readonly` refusing activation, and vertical orientation
(including per-step descriptions and `ArrowDown` navigation) — see SPEC.md §11.
