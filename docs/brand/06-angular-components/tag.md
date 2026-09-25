# `<ino-tag>` — Tag

> Parity benchmark: PrimeNG 22.1.1 `Tag` (`specs/primeng/llms-22.1.1.txt`, line 117).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Extracted from the RAG chip/dot logic previously fused into `ino-metric-panel` — half of
> register item **M-14**.
> Preview: [`previews/tag.html`](previews/tag.html).
> Decisions record: `web/src/app/components/tag/SPEC.md`.

The shared RAG-risk-flag chip: a closed 4-tier severity union (`info` / `low` / `medium` / `high`),
a pill (`rounded`) shape option, a projectable icon slot, and a bare status-dot form. Presentational
and non-interactive, matching the PrimeNG `Tag` benchmark — a removable/clickable chip is PrimeNG's
separate `Chip` component and out of this issue's scope.

---

## Severity tiers

| `severity` | Fill / on-fill / dot tokens | Use it for |
|---|---|---|
| `info` | `--ino-color-info` / `--ino-color-on-info` | A neutral fact, not a risk level — "Draft", "Pending upload" |
| `low` | `--ino-color-risk-low-{fill,on-fill,dot}` | Green tier of the RAG matrix |
| `medium` | `--ino-color-risk-medium-{fill,on-fill,dot}` | Amber tier |
| `high` | `--ino-color-risk-high-{fill,on-fill,dot}` | Red tier |

`info` reuses the W0-6 (INO-128) alert/toast token pair rather than a new `risk-info-*` token —
`tokens.css` is frozen after Wave 0, and every value this component needs already exists. `low` /
`medium` / `high` reuse exactly the tokens `ino-metric-panel` used before this extraction, so every
existing risk chip in the app is byte-identical, just reachable from a reusable component now.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `severity` | `'info' \| 'low' \| 'medium' \| 'high'` | `'info'` | Closed union — drives fill/on-fill/dot |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Font-size / padding-inline / gap from the Wave 0 control-size scale — see [Size API](#size-api) |
| `value` | `string` | `''` | Label text; falls back to a severity-derived default ("Low risk", "Medium risk", "High risk", "Info") when empty |
| `rounded` | `boolean` | `false` | `--ino-radius-sm` (default) vs `--ino-radius-pill` |
| `dot` | `boolean` | `false` | Renders the bare status-dot form; `value` becomes the screen-reader-only accessible name |
| `disabled` | `boolean` | `false` | `aria-disabled` + dimmed opacity |
| `loading` | `boolean` | `false` | `aria-busy`; the icon slot is replaced by a spinner |

Icon is projected: `<ino-tag icon><svg icon>…</svg></ino-tag>` — content matching `[icon]` renders
in the icon slot, hidden automatically while `loading` or `dot`.

### Size API

Reads three of the six Wave 0 control-size aliases — `--ino-control-font-size`,
`--ino-control-padding-inline`, `--ino-control-gap` — but **deliberately does not** set
`min-block-size: var(--ino-control-height)`. A control-height floor (44px fluid / 32px dense) is
sized for interactive controls; forcing it onto an inline risk label would break table-cell and
in-sentence flow and does not match the PrimeNG benchmark's compact chip. Full reasoning:
`SPEC.md` §3.

It does read `--ino-row-min-height` as an opt-in floor (`min-block-size`, `auto` outside a
density-scoped ancestor) so a tag inside a dense table row matches that row's own height, the same
fallback idiom `ino-metric-panel`'s `<li>` already used.

---

## Variants

| Named in the issue | Shipped | Surface |
|---|---|---|
| Severities (incl. `info`) | ✅ | `severity` input |
| Rounded variant | ✅ | `rounded` input |
| Icon slot | ✅ | `[icon]` content projection |
| Dot form | ✅ | `dot` input |

---

## Motion

The fill/opacity transition on state changes (disabled toggling, severity changing) uses
`--ino-motion-duration-fast` + `--ino-motion-easing-standard` — the same "quick, no drama" pairing
`ino-button` uses for its non-primary state changes, since a tag re-coloring is a status update, not
an entrance. The loading spinner uses `--ino-motion-duration-slow` linear rotation, matching
`ino-button`'s spinner. Both branches collapse to no animation under
`prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role / ARIA** — no explicit role. A `<span>`'s text content is read in normal document/table-cell
order; adding `role="status"` to every tag in a dense risk table would turn each one into its own
live region, announcing on every re-render — worse than the plain default. `aria-busy` reflects
`loading`; `aria-disabled` reflects `disabled` (not the native `disabled` attribute — a `<span>` has
none, and removing the node would drop the accessible name).

**Dot form** — the label moves to a visually-hidden node (same sr-only clip pattern as
`ino-alert__sr-status`), so "High risk" remains the accessible name even though only a 6px dot is
painted.

**Keyboard** — none. The component is never in the tab order; it has nothing to activate. See
`SPEC.md` §1 for why hover/active/focus-visible/readonly are not part of this component's state set.

**Contrast** — all four fill/on-fill pairs are the AA-verified pairs `ino-metric-panel` already used
(risk tiers) plus the W0-6 `info` pair, audited across all three themes by
`node scripts/check-theme-parity.mjs`. Target-size criteria (SC 2.5.8) do not apply — the component
is never focusable/clickable.

**RTL** — logical properties only (`inline-size`/`block-size`, `padding-inline`/`padding-block`,
`border-inline-start-color`); no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6, full detail in `SPEC.md` §1):

- **Hover / active / focus-visible / readonly states.** Not carried — the component is a static,
  non-interactive label (matching the PrimeNG `Tag` benchmark, not `Chip`). A future clickable/
  removable tag is a different component with its own DoD.
- **Invalid state.** Not carried — "invalid" is a form-control validity state; a read-only risk
  label has no validity of its own to fail.
- **`--ino-control-height` as `min-block-size`.** See [Size API](#size-api) above.

## Mobile parity

All three tracks ship (per the issue).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoTag.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_tag.dart`.

Neither mobile palette has `risk*` fields (only `success`/`warning`/`danger`/`info` are ported —
see `check-theme-parity.mjs`'s `fields` list), so severity maps onto the existing ported roles:
`high → danger`, `medium → warning`, `low → success`, `info → info` — the same mapping `ino-alert`'s
web `status` union already makes conceptually. Full reasoning: `SPEC.md` §7.
