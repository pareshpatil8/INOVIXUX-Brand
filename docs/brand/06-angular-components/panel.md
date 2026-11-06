# `<ino-panel>` — Panel

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-panel` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-437](/INO/issues/INO-437).
> Parity benchmark: PrimeNG 22.1.1 `Panel` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/panel/SPEC.md`.

A plain titled container (`role="region"` landmark) with an optional collapse/expand disclosure
on the header and a footer actions slot. Implements the WAI-ARIA APG disclosure pattern when
`collapsible`: a `<button>` across the header bar with `aria-expanded`/`aria-controls`.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `header` | `string` | `''` | The panel's one label. Rendered as plain text, or as the disclosure button's label when `collapsible` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Re-points `--ino-control-padding-inline-roomy` for the header/body/footer bars uniformly — one sizing axis (doc 26 §5: "padding scales"), not `<ino-card>`'s separate `padding`/`size` knobs |
| `collapsible` | `boolean` | `false` | Adds a disclosure toggle across the header bar. Most panels are static grouping with no toggle at all |
| `collapsed` | `boolean` | `false` | Inert unless `collapsible`. Supports two-way binding via `collapsedChange` |
| `disabled` | `boolean` | `false` | Dims the whole panel (`opacity: 0.5`) and native-disables the toggle |
| `readonly` | `boolean` | `false` | Locks the collapse toggle only (behavior-only, no ARIA attribute); content stays fully interactive |
| `loading` | `boolean` | `false` | Dims the body and shows a centered spinner; host carries `aria-busy="true"` |

| Output | Payload | Fires |
|---|---|---|
| `collapsedChange` | `boolean` | When the disclosure toggle is activated (not emitted when `disabled`/`readonly`) |

### Content slots

| Slot | Notes |
|---|---|
| default | The body — any content |
| `[ino-panel-footer]` | Optional actions bar, same idiom as `[ino-card-footer]`. Collapses to nothing (`display: none`) when empty |

---

## Sizing

`size="sm" | "md" | "lg"` (default `"md"`) re-points the shared
`--ino-control-padding-inline-roomy(-sm|-lg)` alias, read uniformly by the header bar, the body,
and the footer bar — one sizing axis, per the spec row's "padding scales" (unlike `<ino-card>`'s
two independent `padding`/`size` knobs; see `SPEC.md` §1). There is no separate control-height/
font/icon/gap set to size, since a panel has no single line-height control of its own.

Density is a global `[data-density]` token axis, not a per-component `@Input()`. Because
tokens.css §10/§12 redefines `--ino-control-padding-inline-roomy` per `[data-density]`, dense/
fluid density composes with `size` for free — no branch in this component reads density directly.

---

## States

**Default** — Plain `role="region"` shell: `--ino-color-surface-raised` background,
`--ino-color-border` border.

**Hover** — `collapsible` only. Toggle text color to `--ino-color-accent`.

**Active (pressed)** — `collapsible` only. Toggle text color to `--ino-color-accent-active`.

**Focus-visible** — `collapsible` only. Toggle receives `outline: var(--ino-focus-ring)` with
`outline-offset: var(--ino-focus-ring-offset)`.

**Disabled** — `[disabled]="true"` dims the whole panel to `opacity: 0.5`, the header text follows
`--ino-color-on-surface-muted`, and the toggle is native-`disabled` (leaves the tab order).

**Loading** — `[loading]="true"` dims the body to `opacity: 0.5` and shows a centered spinner;
header/footer stay fully visible, host carries `aria-busy="true"`.

**Collapsed** — The spec row's additional state beyond the §2 standard set. `[collapsed]="true"`
(with `collapsible`) hides the body via the `hidden` attribute and sets the toggle's
`aria-expanded="false"`.

**Readonly** — `[readonly]="true"` locks the collapse toggle (`aria-disabled="true"` on the
button, click is a no-op) without native-disabling it or dimming anything — see `SPEC.md` §2.

---

## Accessibility contract

**Role / ARIA** — `role="region"` on the host, labelled via `aria-labelledby` pointing at the
visible header element (the toggle button when `collapsible`, a plain `<span id>` otherwise) —
see `SPEC.md` §3. `aria-disabled="true"` reflects `disabled`; `aria-busy="true"` reflects
`loading`. The toggle carries `aria-expanded`/`aria-controls` pointing at the body region's id.

**Keyboard** — When `collapsible`, the header is a real `<button>`: Tab reaches it (readonly
instances stay reachable too — only `disabled` removes the tab stop); Enter/Space toggle
`collapsed` and emit `collapsedChange`, via native button activation. When not `collapsible`, the
header has no tab stop at all.

**Contrast** — Border/background/focus-ring pairs resolve through tokens audited across all three
themes by `node scripts/check-theme-parity.mjs`.

**RTL** — Logical properties only (`padding-block`/`-inline`, `border-block-end`/`-start`,
`text-align: start`). No `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

**State announcements** — `aria-expanded` (collapsible toggle), `aria-disabled` (disabled host,
readonly toggle), `aria-busy` (loading).

---

## Deliberate omissions

**No invalid/error state.** The §2 standard state set includes invalid/error, but a panel is a
generic titled container with no bound value to validate — same reasoning `<ino-card>` records for
the same state. Not implemented; see `SPEC.md` §2.

**No empty state.** Not named in the spec row; same omission `<ino-card>` makes.

**No `[ino-panel-header]` content slot.** The spec row's "Labels: header" names a single title
string, the same shape `<ino-fieldset>`'s `legend` already uses — a richer, freeform header slot
was not asked for and would duplicate `<ino-card>`'s `[ino-card-header]`, a different, more general
container with no single documented label field. See `SPEC.md` §4.

---

## Mobile parity

Both ports ship (per the row's "Port both (simple)" disposition):

- **React Native** — `mobile/react-native/src/components/InoPanel.tsx`. Combines `<ino-fieldset>`
  RN port's collapsible-toggle logic (`Pressable` + `accessibilityState={{ expanded, disabled:
  readonly }}`) with `<ino-card>` RN port's explicit `footer?: ReactNode` prop (no content
  projection in RN).
- **Flutter** — `mobile/flutter/lib/widgets/ino_panel.dart`. Same combination: `InoFieldset`'s
  `GestureDetector` + `Semantics(button: true, expanded: ...)` toggle, `InoCard`'s explicit
  `footer` `Widget?` parameter.

Neither port carries an animated loading spinner (static ring only), same scope call `<ino-card>`/
`<ino-fieldset>`'s own RN/Flutter ports already made.
