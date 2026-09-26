# `<ino-stepper>` — Stepper

> Parity benchmark: PrimeNG 22.1.1 `Stepper` (`specs/primeng/llms-22.1.1.txt`, line 113).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Tier 1, Panel group (INO-136 / INO-31 T-27).
> Preview: [`previews/stepper.html`](previews/stepper.html).
> Decisions record: `web/src/app/components/stepper/SPEC.md`.

A wizard-style step navigator, reusing `<ino-tabs>`'s tablist/tab/tabpanel interaction model (there
is no ARIA "stepper" pattern to implement instead) and adding a numbered/checkmark indicator, a
connector line, `orientation`, and **linear gating** — the "validation gating between steps" the
KYB onboarding/verification flow needs. Two components, always used together — `<ino-stepper>` owns
the rail, keyboard model and gating; each projected `<ino-step>` owns one step's label, flags and
content.

```html
<ino-stepper [(activeId)]="step">
  <ino-step id="business" label="Business details" [completed]="businessForm.valid">…</ino-step>
  <ino-step id="documents" label="Documents" [completed]="docsUploaded()">…</ino-step>
  <ino-step id="review" label="Review" [loading]="submitting()">…</ino-step>
</ino-stepper>
```

---

## API — `InoStepperComponent` (`<ino-stepper>`)

| Input | Type | Default | Notes |
|---|---|---|---|
| `activeId` | `string \| undefined` | `undefined` | **Bind it → controlled**; omit it → uncontrolled (the component picks the first enabled step and owns selection). Two-way bindable as `[(activeId)]` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | The shared `InoControlSize` union; drives indicator diameter / padding / font-size / gap off the Wave 0 control-size scale |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Vertical swaps the arrow-key map to Up/Down and the connector to an upright line |
| `linear` | `boolean` | `true` | A step unlocks only once every step before it is `completed`. Set `false` for free navigation, matching `ino-tabs`'s default |
| `readonly` | `boolean` | `false` | Focusable but inert: arrows still move focus, activation is refused |

| Output | Payload | Fires when |
|---|---|---|
| `activeIdChange` | `string` (step id) | A step is activated — by click, arrow key, Home/End or Enter/Space, and only when `linear` gating allows it. Emitted in **both** modes |

## API — `InoStepComponent` (`<ino-step>`)

| Input | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | auto (`ino-step-N`) | The identity used by `activeId` and the generated `aria-controls`/`aria-labelledby` pair |
| `label` | `string` | `''` | The step's visible title and accessible name |
| `description` | `string` | `''` | Optional secondary line under the label (e.g. "Business details") |
| `disabled` | `boolean` | `false` | Skipped by arrow keys and by the uncontrolled initial pick; cannot be activated |
| `completed` | `boolean` | `false` | Renders the filled/checkmark indicator; drives the `linear` gate for every step after it |
| `invalid` | `boolean` | `false` | Danger-coloured indicator + label; sets `aria-invalid` |
| `loading` | `boolean` | `false` | Spinner in the indicator, `aria-busy` on the step and panel, centred spinner in the panel body |

Content is projected: everything inside `<ino-step>` is the panel body, rendered only while that
step is active. `<ino-stepper>` never validates form fields — `completed` is read-only input the
consumer's own form validation sets.

---

## Usage

**Uncontrolled, linear (default)** — a wizard where each step must be completed in order.

```html
<ino-stepper>
  <ino-step label="Business details" [completed]="step1.valid">…</ino-step>
  <ino-step label="Documents" [completed]="step2.valid">…</ino-step>
  <ino-step label="Review">…</ino-step>
</ino-stepper>
```

**Controlled, non-linear** — free navigation, e.g. an editable settings wizard.

```html
<ino-stepper [(activeId)]="section" [linear]="false">
  <ino-step id="profile" label="Profile">…</ino-step>
  <ino-step id="security" label="Security" [invalid]="security.invalid">…</ino-step>
  <ino-step id="billing" label="Billing" [loading]="billing.saving()">…</ino-step>
</ino-stepper>
```

**Vertical** — a side-rail wizard layout.

```html
<ino-stepper orientation="vertical" [(activeId)]="step">
  <ino-step label="Applicant" description="Who is applying" [completed]="applicant.valid">…</ino-step>
  <ino-step label="Screening" description="Risk & compliance checks" [loading]="screening.pending()">…</ino-step>
</ino-stepper>
```

**Readonly** — an audit view showing which step was reached without letting the viewer change it.

```html
<ino-stepper readonly [activeId]="record.stepAtSubmission">…</ino-stepper>
```

---

## States

All eight DoD states are real here — this is a control, not decoration.

| State | Treatment |
|---|---|
| Default | Outlined circle indicator, numbered, `--ino-color-on-surface-muted` label |
| Hover | Indicator/label promote to `--ino-color-accent`/`--ino-color-on-surface`; suppressed while locked, `readonly`, or disabled |
| Active/pressed | Indicator border → `--ino-color-accent-active` (the W0 pressed-fill role) |
| Focus-visible | `--ino-focus-ring` at its own (positive) offset — no scroll container to clip it |
| Disabled | Native `[disabled]` + `--ino-color-on-surface-subtle`; skipped by every movement key |
| Readonly | Focus model intact, activation refused, `aria-disabled` on non-active steps |
| Invalid | `--ino-color-danger-text-safe` indicator + label + `aria-invalid` |
| Loading | Spinner in the indicator + `aria-busy` on the step and panel; the label never leaves the DOM |

**Completed** (filled accent indicator + checkmark) is a separate axis from all eight — it is the
data the `linear` gate reads, not a DoD state.

---

## Size and density

`size` maps to the Wave 0 control-size aliases — `--ino-control-icon-size` (indicator diameter,
floored at `--ino-target-min`), `--ino-control-padding-inline-roomy`, `--ino-control-font-size`,
`--ino-control-gap`. Nothing is invented locally.

Density works with no component-level branch, same mechanism as `ino-tabs`: `[data-density="dense"]`
redefines those aliases directly. `--ino-row-min-height` is deliberately not read — a step rail is
not row-based.

---

## Motion

| Moving thing | Duration | Easing |
|---|---|---|
| Indicator border/background, label colour | `--ino-motion-duration-base` / `-fast` | `--ino-motion-easing-standard` |
| Connector fill on completion | `--ino-motion-duration-base` | `--ino-motion-easing-standard` |
| Step panel enter (fade + `--ino-space-1` rise) | `--ino-motion-duration-base` | `--ino-motion-easing-decelerate` |
| Indicator spinner | `--ino-motion-duration-slow` | `linear` |

Panel *exit* is instant on purpose — same reasoning as `ino-tab-panel`. `prefers-reduced-motion:
reduce` is a pure CSS branch here: there is no script-driven animation to catch separately.

---

## Accessibility contract

**Roles / ARIA**

| Element | Contract |
|---|---|
| Track | `role="tablist"`, `aria-orientation="horizontal"` or `"vertical"` |
| Step | `role="tab"`, `aria-controls`, `aria-selected`, roving `tabindex`, plus `aria-busy` / `aria-invalid` as applicable, and `aria-disabled` while linear-gated or `readonly` |
| Panel | `role="tabpanel"`, `aria-labelledby`, `aria-busy`, `hidden` when inactive, `tabindex="0"` |
| Connector | `aria-hidden="true"` — presentational only |

**Keyboard**

| Key | Action |
|---|---|
| `Tab` | Into the rail (landing on the current step), then out to the panel |
| `ArrowRight`/`ArrowLeft` (horizontal) or `ArrowDown`/`ArrowUp` (vertical) | Move focus to the next/previous enabled step, wrapping. Horizontal reverses under RTL |
| `Home` / `End` | First / last enabled step |
| `Enter` / `Space` | Activate the focused step — refused if locked, `readonly`, or already current |

**Why `role="tablist"` for a wizard** — the APG defines no stepper pattern; reusing `ino-tabs`'s
audited implementation is the smaller claim than inventing an untested one. Full reasoning:
`SPEC.md` §7.

**Contrast** — every colour is a semantic role audited across dark/light/high-contrast by
`node scripts/check-theme-parity.mjs`. Progress state (current/completed) pairs colour with shape
(outlined vs. filled vs. numbered), so it is never colour-only (SC 1.4.1).

**Target size (SC 2.5.8)** — the indicator hit box is
`max(var(--ino-control-icon-size), var(--ino-target-min))`, a 24px floor at every size.

**RTL** — logical properties only. Arrow-key direction flips only in horizontal orientation;
vertical orientation and the connector's own geometry need no explicit RTL handling.

---

## Deliberate omissions

Recorded rather than silently dropped (full reasoning in `SPEC.md` §4):

- **Separate `StepList` / `StepPanels` elements** (PrimeNG's compound form). Collapsed into
  `<ino-stepper>` for the same reason `ino-tabs` collapsed its equivalent split.
- **Per-step content interleaving.** All panels render through one `<ng-content>` outlet after the
  step rail, matching `ino-tabs` and the common KYB wizard layout (rail + single content pane).

---

## Mobile parity

All three tracks ship.

- **Capacitor** — not a separate port; the same Angular component and SCSS render in the WebView.
- **React Native** — `mobile/react-native/src/components/InoStepper.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_stepper.dart`.

Both ports are the **rail only** and **controlled only**: the parent owns the active id and
`completed` flags, and renders content with the platform's own idiom. The keyboard map, focus ring
and hover state are dropped — the same states `InoButton`/`InoTabs` drop on mobile. No new mobile
theme tokens were added. Full scope table: `SPEC.md` §9.
