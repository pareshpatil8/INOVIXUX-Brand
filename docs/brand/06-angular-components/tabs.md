# `<ino-tabs>` / `<ino-tab>` — Tabs

> Parity benchmark: PrimeNG 22.1.1 `Tabs` (`specs/primeng/llms-22.1.1.txt`, line 116).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/24-primeng-component-audit-ino-31.md` F-1 (T-26, committed in Wave 2,
> unbuilt until this issue).
> Decisions record: `web/src/app/components/tabs/SPEC.md`.

Container grouping content behind a tablist. `<ino-tabs>` is the container; `<ino-tab>` is one
projected panel with its own `label`/`disabled` metadata.

```html
<ino-tabs [(activeIndex)]="tab">
  <ino-tab label="Details">…</ino-tab>
  <ino-tab label="History" [disabled]="true">…</ino-tab>
</ino-tabs>
```

---

## API

### `<ino-tabs>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `activeIndex` | `number` | `0` | Two-way-bindable with `activeIndexChange` |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Tab height / padding-inline / font-size |

`activeIndexChange: EventEmitter<number>`.

### `<ino-tab>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered on the tab button |
| `disabled` | `boolean` | `false` | Skipped by click and keyboard nav |

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Resting tab text colour |
| Hover | `:hover` (enabled tab) | Text darkens toward `on-surface` |
| Active/selected | `activeIndex` matches | `--ino-color-accent` indicator border + `on-surface` text |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Disabled | `<ino-tab [disabled]>` | `opacity: 0.5`, native `disabled`, `aria-disabled` |

---

## Motion

Tab text-colour and active-indicator border-colour transition on `--ino-motion-duration-fast` /
`--ino-motion-easing-standard`, zeroed under `prefers-reduced-motion: reduce`. Panels toggle via
native `[hidden]` — an instant show/hide with nothing to animate.

---

## Accessibility contract

**Role / ARIA** — WAI-ARIA Tabs pattern: `role="tablist"` (+ `aria-orientation`), `role="tab"` +
`aria-selected` + `aria-controls`, `role="tabpanel"` + `aria-labelledby`.

**Keyboard** — automatic activation: ArrowRight/Down → next enabled tab; ArrowLeft/Up → previous
enabled tab; Home → first enabled tab; End → last enabled tab. All four both move focus **and**
select. Roving tabindex: only the active tab carries `tabindex="0"`, every other tab is
`tabindex="-1"`.

**Contrast** — active-tab text and the accent indicator border are both already-audited roles.

**Target size** — tab buttons inherit the control-height scale, clearing the 24px SC 2.5.8 floor at
every size rung.

**RTL** — logical properties only (`border-inline-end`, `padding-inline`); the vertical variant's
indicator renders on the correct trailing edge under `dir="rtl"`.

---

## Deliberate omissions

- **Closable tabs.** PrimeNG's Tabs supports a per-tab close button. Not built here — it needs a
  removal-confirmation/undo contract that is a product decision, not a styling one. Tracked as a
  forward reference `(pending INO-nnn)`.

## Mobile parity

**Web-only for now** — no React Native or Flutter port exists for this component as of this issue.

## Behavioral test

`ino-tabs.spec.ts` covers active-panel visibility, click selection, disabled-tab exclusion, arrow-key
navigation skipping disabled tabs, and roving tabindex — see SPEC.md §9.
