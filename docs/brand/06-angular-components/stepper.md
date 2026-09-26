# `<ino-stepper>` / `<ino-step>` — Stepper

> Parity benchmark: PrimeNG 22.1.1 `Stepper` (`specs/primeng/llms-22.1.1.txt`, line 113).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/24-primeng-component-audit-ino-31.md` F-1 (T-27, committed in Wave 2,
> unbuilt until this issue).
> Decisions record: `web/src/app/components/stepper/SPEC.md`.

Wizard-like multi-step workflow container. Same container/leaf split as `<ino-tabs>`/`<ino-tab>`,
plus a linear-mode reachability gate.

```html
<ino-stepper #stepper [(activeIndex)]="step">
  <ino-step label="Account">…</ino-step>
  <ino-step label="Payment">…</ino-step>
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
| `activeIndex` | `number` | `0` | Two-way-bindable with `activeIndexChange` |
| `linear` | `boolean` | `true` | Gates how far a caller can jump ahead — see [Linear mode](#linear-mode) |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Index-badge diameter |

`activeIndexChange: EventEmitter<number>`. Public methods: `next()`, `previous()`.

### `<ino-step>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered next to the index badge |
| `disabled` | `boolean` | `false` | Permanently unreachable, regardless of `linear` |

### Linear mode

In `linear="true"` (default), a step is reachable only once the flow has advanced *to* it at least
once (tracked internally as `furthestIndex`). Going back with `previous()` never re-locks progress
already made. `linear="false"` makes every non-`disabled` step always reachable. `disabled` is a
separate, permanent lock that always wins over reachability in either mode.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Numbered badge, resting text colour |
| Active | `activeIndex` matches | Badge fills `--ino-color-accent`, text `on-surface` |
| Completed | step index `<` furthest reached | Badge fills `--ino-color-accent-secondary` + checkmark glyph |
| Hover | `:hover` (reachable step) | Text darkens toward `on-surface` |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Disabled / unreached | `<ino-step [disabled]>` or beyond the linear frontier | `opacity: 0.5`, native `disabled`, `aria-disabled` |

---

## Motion

Index-badge fill/border/text-colour and header text-colour transition on
`--ino-motion-duration-fast` / `--ino-motion-easing-standard`, zeroed under
`prefers-reduced-motion: reduce`. No animated panel enter/exit — panels toggle via native
`[hidden]`.

---

## Accessibility contract

**Role / ARIA** — reuses the audited WAI-ARIA Tabs-pattern roles (`role="tablist"`/`"tab"`/
`"tabpanel"`) rather than inventing a stepper-specific contract, since a linear stepper's header
strip is structurally the same widget with an added reachability gate. `aria-disabled` covers both
the permanent `disabled` lock and the linear-mode "not yet reached" lock.

**Keyboard** — same roving-tabindex automatic-activation model as `<ino-tabs>`, constrained to the
reachable-steps list.

**Contrast** — active/completed badge fills (with `on-accent` text) and the connector line are all
already-audited roles.

**Target size** — the clickable surface is the whole step button (badge + label + padding), which
clears SC 2.5.8 even though the badge glyph alone is smaller at `sm`.

**RTL** — logical properties only (`margin-inline`, `inline-size`/`block-size`); the connector and
badge positions mirror correctly under `dir="rtl"`.

---

## Deliberate omissions

None.

## Mobile parity

**Web-only for now** — no React Native or Flutter port exists for this component as of this issue.

## Behavioral test

`ino-stepper.spec.ts` covers initial active-panel visibility, linear-mode blocking of unreached
steps, `next()`/`previous()` unlock/completed-marking behavior, and free navigation when
`linear="false"` — see SPEC.md §9.
