# `<ino-tabs>` / `<ino-tab-panel>` — Tabs

> Parity benchmark: PrimeNG 22.1.1 `Tabs` (`specs/primeng/llms-22.1.1.txt`, line 116).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/24-primeng-component-audit-ino-31.md` F-1 (T-26, committed in Wave 2,
> unbuilt until this issue). Recovered to full DS parity by INO-361.
> Decisions record: `web/src/app/components/tabs/SPEC.md`.

Container grouping content behind a tablist. `<ino-tabs>` is the container; `<ino-tab-panel>` is one
projected panel with its own `label`/`disabled`/`closable`/`invalid`/`loading` metadata.

```html
<ino-tabs [(activeIndex)]="tab" [scrollable]="true">
  <ino-tab-panel label="Details">…</ino-tab-panel>
  <ino-tab-panel label="History" [disabled]="true">…</ino-tab-panel>
  <ino-tab-panel label="Reports" [closable]="true" (tabClose)="onClose($event)">…</ino-tab-panel>
</ino-tabs>
```

---

## API

### `<ino-tabs>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `activeIndex` | `number \| undefined` | `undefined` | Two-way-bindable with `activeIndexChange`. Omit for uncontrolled mode (component owns selection, picks the first enabled panel) |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Tab height / padding-inline / font-size |
| `scrollable` | `boolean` | `false` | Horizontal overflow + ‹/› buttons when the strip is wider than its container. Horizontal-only — see SPEC.md §4 |
| `readonly` | `boolean` | `false` | Focusable-but-inert: arrow keys still move focus, but activation/close are refused |

`activeIndexChange: EventEmitter<number>`. `tabClose: EventEmitter<number>` — emits the closed
panel's index; the component never removes the panel itself (the consumer owns the projected list).

### `<ino-tab-panel>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered on the tab button |
| `disabled` | `boolean` | `false` | Skipped by click and keyboard nav |
| `closable` | `boolean` | `false` | Renders a per-tab ✕ (not a nested control — Delete/Backspace is the keyboard path) |
| `invalid` | `boolean` | `false` | Danger-text-safe label + a 6px dot, `aria-invalid` |
| `loading` | `boolean` | `false` | Spinner in the tab and the panel body, `aria-busy` |

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Resting tab text colour |
| Hover | `:hover` (enabled, non-readonly-locked tab) | Text promotes toward `on-surface` |
| Active/pressed | `:active` | `--ino-color-accent-active` text |
| Selected | `activeIndex` matches | `--ino-color-accent` indicator border + `on-surface` text |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / negative `--ino-focus-ring-offset` |
| Disabled | `<ino-tab-panel [disabled]>` | `--ino-color-on-surface-subtle`, native `disabled`, `aria-disabled` |
| Readonly | `<ino-tabs [readonly]>` | Non-active tabs dimmed on hover, `aria-disabled` on non-active tabs, still focusable |
| Invalid | `<ino-tab-panel [invalid]>` | Danger-text-safe label + dot, `aria-invalid` |
| Loading | `<ino-tab-panel [loading]>` | Spinner replaces the invalid dot; panel shows a centred spinner |

---

## Motion

Tab label colour on `--ino-motion-duration-fast`, active-indicator border-colour on
`--ino-motion-duration-base`, both `--ino-motion-easing-standard`. Panel enter animates opacity +
a small rise on `--ino-motion-duration-base` / `--ino-motion-easing-decelerate`; panel exit is
instant (the outgoing panel unmounts immediately — no stale content painted mid-transition). All
zeroed under `prefers-reduced-motion: reduce`; the scroll-button smooth-scroll additionally reads the
media query from JS since `ScrollToOptions.behavior` is script-driven.

---

## Accessibility contract

**Role / ARIA** — WAI-ARIA Tabs pattern: `role="tablist"` (+ `aria-orientation`), `role="tab"` +
`aria-selected` + `aria-controls` + `aria-busy`/`aria-invalid`/`aria-disabled` as applicable,
`role="tabpanel"` + `aria-labelledby` + `aria-busy`.

**Keyboard** — automatic activation: ArrowRight/Down → next enabled tab (RTL-aware in horizontal
orientation); ArrowLeft/Up → previous; Home → first; End → last; Enter/Space selects the focused tab;
Delete/Backspace closes a `closable` focused tab. Roving tabindex: only the active tab carries
`tabindex="0"`.

**Contrast** — active-tab text, the accent indicator border, and the invalid danger-text-safe role
are all already-audited roles.

**Target size** — tab buttons inherit the control-height scale; the close ✕'s hit box is floored at
`--ino-target-min` independent of the glyph's optical size.

**RTL** — logical properties only; arrow-key direction and `scrollBy()`'s sign both flip under
`dir="rtl"`; the ‹/› glyphs mirror via `scaleX(-1)`.

---

## Selection model

Index-based, controlled (`[activeIndex]`) or uncontrolled (omit it) — see SPEC.md §2 for why this
recovery kept index-based selection over the id-based model an earlier, since-closed branch had
implemented.

## Mobile parity

Both mobile ports ship (INO-334, re-cut as #74).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoTabs.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_tabs.dart`.

Both ports render the tab strip only — the parent supplies panel content (a `switch`/`IndexedStack`/
navigator), since web's content-projection `<ino-tab-panel>` child has no mobile equivalent worth
inventing. Props are index-based and controlled-only, matching web's selection model (SPEC.md §2).
**`scrollable`, `readonly`, `closable`, per-tab `invalid`/`loading` are web-only for now** — recorded
in SPEC.md §9 as a deliberate deferral, not a silent gap.

## Behavioral test

`ino-tabs.spec.ts` covers active-panel visibility, click selection, disabled-tab exclusion, arrow-key
navigation (including vertical orientation), roving tabindex, `aria-invalid`, `tabClose` emitting the
closed index without mutating the panel list, and `readonly` refusing activation while preserving
focus — see SPEC.md §11.
