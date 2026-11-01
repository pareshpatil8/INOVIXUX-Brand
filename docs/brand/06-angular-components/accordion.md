# `<ino-accordion>` — Accordion

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-accordion` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-435](/INO/issues/INO-435).
> Parity benchmark: PrimeNG 22.1.1 `Accordion` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/accordion/SPEC.md`.

A container component with vertically stacked, collapsible content panels. Each panel header is a button following the WAI-ARIA APG accordion pattern with heading+button structure, Arrow key navigation, and roving tabindex.

---

## API

### `<ino-accordion>` (container)

| Input | Type | Default | Notes |
|---|---|---|---|
| `multiple` | `boolean` | `false` | When `false` (default), opening one tab closes all others (single-expand mode, radio-like mutual exclusion). When `true`, any number of tabs can be open simultaneously |
| `size` | `'compact' \| 'comfortable'` | `'comfortable'` | Re-points `--ino-control-padding-inline-roomy` for all tab headers/bodies — a two-value scale per the spec row (not the three-value sm/md/lg) |
| `iconPosition` | `'start' \| 'end'` | `'start'` | Chevron placement in tab headers. Start: before text (visual bullet). End: after text (disclosure hint) |
| `disabled` | `boolean` | `false` | Dims the whole accordion (`opacity: 0.5`) and native-disables all tab toggles |
| `loading` | `boolean` | `false` | Dims all panels (`opacity: 0.7`); host carries `aria-busy="true"` |

### `<ino-accordion-tab>` (individual panel)

| Input | Type | Default | Notes |
|---|---|---|---|
| `header` | `string` | `''` | The tab's one label. Rendered as the toggle button's label |
| `headingLevel` | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | `3` | The heading element wrapping the button (`<h1>`-`<h6>`). Controls document outline, not visual styling |
| `expanded` | `boolean` | `false` | Whether the panel is open. Supports two-way binding via `expandedChange` |
| `disabled` | `boolean` | `false` | Locks this tab's toggle only. Native `disabled`, cursor `not-allowed`, text → `--ino-color-on-surface-muted` |

| Output | Payload | Fires |
|---|---|---|
| `expandedChange` | `boolean` | When the toggle is activated (not emitted when disabled or the accordion itself is disabled) |

### Content slots

| Slot | Notes |
|---|---|
| default (accordion) | Place `<ino-accordion-tab>` elements here |
| default (tab) | The panel body — any content |

---

## Sizing

`size="compact" | "comfortable"` (default `"comfortable"`) re-points the shared
`--ino-control-padding-inline-roomy(-sm)` alias, read uniformly by all tab headers and bodies — a
two-value scale per the spec row (unlike the three-value sm/md/lg other components carry). Compact
maps to `--ino-control-padding-inline-roomy-sm`; comfortable reads the bare alias.

Density is a global `[data-density]` token axis, not a per-component `@Input()`. Because
tokens.css §10/§12 redefines `--ino-control-padding-inline-roomy` per `[data-density]`, dense/
fluid density composes with `size` for free — no branch in this component reads density directly.

---

## States

**Default** — Tab headers have `--ino-color-surface-raised` background, `--ino-color-border`
border. Collapsed panels hide their body via the `hidden` attribute.

**Hover** — Tab header background → `--ino-color-surface-hover`, text →
`--ino-color-accent`.

**Active (pressed)** — Tab header background → `--ino-color-surface-active`, text →
`--ino-color-accent-active`.

**Focus-visible** — `outline: var(--ino-focus-ring)` with
`outline-offset: var(--ino-focus-ring-offset)` on the header button (inset, `z-index: 1` to
layer over adjacent borders).

**Disabled (accordion-level)** — `[disabled]="true"` on the accordion dims the whole component to
`opacity: 0.5` and native-disables all tab toggles (leaves the tab order).

**Disabled (tab-level)** — `[disabled]="true"` on a tab locks only that tab's toggle. Native
`disabled`, cursor `not-allowed`, text → `--ino-color-on-surface-muted`. The spec row's
"disabled-panel" state.

**Loading** — `[loading]="true"` dims all panels to `opacity: 0.7`, host carries
`aria-busy="true"`.

**Expanded** — The spec row's additional state beyond the §2 standard set. `[expanded]="true"`
shows the panel body (removes `hidden`) and sets the button's `aria-expanded="true"`. Expanded tab
body background → `--ino-color-surface` (differentiate from collapsed state's
`--ino-color-surface-raised`).

---

## Accessibility contract

**Role / ARIA** — Each tab header is a `<button>` wrapped in a heading element (`<h1>`-`<h6>`,
configurable via `headingLevel`, default `<h3>`). The heading exists purely for document outline;
all visual styling is on the button. Button carries `aria-expanded` (true/false) +
`aria-controls` pointing at the panel region's id. Panel region has `role="region"` +
`aria-labelledby` pointing back at the button. Host carries `aria-disabled="true"` when
`disabled`, `aria-busy="true"` when `loading`.

**Keyboard** — Tab enters the accordion at the first tab header; once inside, roving tabindex
keeps only the focused header tabbable (`tabindex="0"`), all others are `tabindex="-1"`. Arrow
Down/Up move focus to the next/previous tab header (wrapping at ends); Home/End move focus to the
first/last tab header. Enter/Space toggle the focused tab's `expanded` state and emit
`expandedChange`, via native button activation.

**Contrast** — Border/background/focus-ring pairs resolve through tokens audited across all three
themes by `node scripts/check-theme-parity.mjs`.

**RTL** — Logical properties only (`padding-block`/`-inline`, `border-block-end`/`-start`,
`inset-inline-start`/`-end`). No `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

**State announcements** — `aria-expanded` (toggle button), `aria-disabled` (disabled host or tab),
`aria-busy` (loading).

---

## Deliberate omissions

**No readonly state.** The §2 standard state set includes readonly, but an accordion has no "lock
all toggles but stay legible" use case that `disabled` doesn't already cover; tabs are pure
disclosure, not form inputs. Not implemented; see `SPEC.md` §5.

**No invalid/error state.** An accordion is a structural grouping with no value of its own to fail
validation. Not implemented; see `SPEC.md` §5.

**No empty state.** Not named in the spec row; see `SPEC.md` §5.

---

## Mobile parity

Both ports ship (per the row's "Port both" disposition):

- **React Native** — `mobile/react-native/src/components/InoAccordion.tsx` +
  `InoAccordionTab.tsx`. Uses `Pressable` for the toggle with `accessibilityRole="button"`,
  `accessibilityState={{ expanded, disabled }}`. Omits roving tabindex/Arrow key navigation per
  mobile-first scope (see `SPEC.md` §10).
- **Flutter** — `mobile/flutter/lib/widgets/ino_accordion.dart`. Uses `GestureDetector` for the
  toggle with `Semantics(button: true, expanded: ...)`. Omits roving tabindex/Arrow key
  navigation per mobile-first scope (see `SPEC.md` §10).

Neither port carries keyboard navigation (roving tabindex, Arrow keys, Home/End) — mobile-first
scope per the spec row's "Port both" directive, same omission `<ino-panel>`'s RN/Flutter ports
already made for their disclosure toggles.
