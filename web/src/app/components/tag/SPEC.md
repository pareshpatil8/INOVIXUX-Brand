# `<ino-tag>` — component spec

**Issue:** INO-143 (INO-31 T-12, Tier 1 / Misc group)
**Parity benchmark:** PrimeNG 22.1.1 `Tag` — `specs/primeng/llms-22.1.1.txt` line 117, route
`https://primeng.dev/tag`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Extracted from:** the RAG chip/dot logic previously fused into `ino-metric-panel` (half of
register item M-14 — the other half stays in `ino-metric-panel` as the live-metric summary card).
**Depended on:** W0-6 (INO-128, `info` severity tier) and INO-113 (data-viz token layer) —
both merged (`done`) before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Non-interactive: 4 of 8 states carried, 4 deliberately N/A (DoD row 5)

`<ino-tag>` is a presentational label, matching the PrimeNG `Tag` benchmark exactly: no `onClick`,
no built-in dismiss. (A removable, interactive chip is PrimeNG's separate `Chip` component — not
in this issue's scope, and not yet on the register.)

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Severity-resolved fill (§2 below) |
| Disabled | ✅ | `aria-disabled` + `opacity: 0.5` — e.g. a risk flag superseded by a re-run, kept visible but de-emphasised |
| Loading/busy | ✅ | `aria-busy` + spinner swapped in for the icon slot; label text never leaves the DOM |
| Invalid | N/A — not carried | "Invalid" is a form-control state (a field failed its own validation). A read-only risk label has no validity of its own to fail; forcing this input onto the component would invite a caller to (mis)use it as a fake form control |
| Hover | N/A — not carried | Nothing to reveal on hover: there is no secondary affordance, no truncated content, no drill-down. Same reasoning `ino-metric-panel`'s row list already documented for its `.chip` |
| Active/pressed | N/A — not carried | Follows from the above — there is nothing to press |
| Focus-visible | N/A — not carried | The host is a `<span>`, never in the tab order (no `tabindex`); a component that cannot receive focus does not draw a focus ring. If a future caller needs a *clickable* tag, that is `Chip`, a different component with its own DoD |
| Readonly | N/A — not carried | "Readonly" distinguishes a control that *could* accept input from one that currently doesn't. A tag never accepts input, so the distinction doesn't apply — same reasoning as `readonly` in `ino-metric-panel`'s comment header |

---

## 2. Severity → token mapping (DoD row 1, "zero hardcoded values")

`tokens.css` is frozen after Wave 0. No new `--ino-color-risk-info-*` token was added; instead:

| `severity` | Fill / on-fill / dot tokens |
|---|---|
| `high` | `--ino-color-risk-high-{fill,on-fill,dot}` (tokens.css §3, reused from `ino-metric-panel`) |
| `medium` | `--ino-color-risk-medium-{fill,on-fill,dot}` |
| `low` | `--ino-color-risk-low-{fill,on-fill,dot}` |
| `info` | `--ino-color-info` / `--ino-color-on-info` (W0-6/INO-128, reused from `ino-alert`); the dot uses the same pair since no separate `-dot` role exists for `info` and the base info hex already clears the non-text 3:1 floor it is used at (see `docs/brand/09-design-system-standards.md` §5 contrast table) |

All four resolve in every one of the three web themes automatically — `check-theme-parity.mjs`
already audits every `--ino-color-risk-*` and `--ino-color-info`/`-on-info` role it touches across
dark/light/high-contrast; nothing new needed auditing.

---

## 3. Size API: control-size scale minus `--ino-control-height` (DoD row 3)

`size="sm" | "default" | "lg"` reads the Wave 0 control-size scale's font-size, padding-inline and
gap aliases (`--ino-control-font-size`, `--ino-control-padding-inline`, `--ino-control-gap`).

**Deliberate exception:** the component does **not** set `min-block-size: var(--ino-control-height)`
on itself. `--ino-control-height-default` is 44px (fluid) / 32px (dense) — sized for a *control*
(button, input, select). A RAG risk chip is inline text, routinely a dozen to a page in one table
column; forcing every tag to a 44px box would break inline flow inside `ino-metric-panel` rows,
table cells and headers alike, and does not match the PrimeNG benchmark (`Tag` is a compact label,
not a control-height element).

It still reads `--ino-row-min-height` as an opt-in `min-block-size` floor (falling back to `auto`)
so a tag sitting *inside* a density-scoped row (DoD row 4) does not shrink below that row's own
32px/44px floor — the same fallback idiom `ino-metric-panel`'s row `<li>` already uses.

---

## 4. Variants built (DoD row 6)

| Named in the issue | Shipped | Surface |
|---|---|---|
| Severities (`info`/`low`/`medium`/`high`) | ✅ | `severity` @Input, closed union |
| Rounded variant | ✅ | `rounded` @Input — `--ino-radius-sm` (default) vs `--ino-radius-pill` |
| Icon slot | ✅ | `<ng-content select="[icon]">`, swapped for the loading spinner when `loading` |
| Dot form | ✅ | `dot` @Input — renders the `ino-metric-panel` row-dot shape; label moves to a screen-reader-only node so the accessible name survives (§5) |

No deliberate omissions beyond the interactive-state set already covered in §1.

---

## 5. ARIA contract (DoD row 8)

No explicit ARIA `role`. A `<span>` with text content is read by assistive technology as part of
normal document/table-cell reading order with no extra ceremony — adding `role="status"` here would
turn every tag in a 50-row risk table into its own polite live region, which is a worse experience
(silently-repeated announcements on any re-render) than the plain reading-order default.

`aria-busy="true"` while `loading`; `aria-disabled="true"` while `disabled` (not the native
`disabled` attribute — a `<span>` has none, and removing the element from the tree would drop its
accessible name, the same rationale `ino-button`'s `loading` state documents).

**Dot form.** `dot` visually replaces the label with a 6px indicator (`aria-hidden`) but keeps the
severity label in the DOM via a visually-hidden node (`.ino-tag__label--sr-only`, the same sr-only
clip pattern as `ino-alert__sr-status`) — so "High risk" is still the accessible name even though
nothing readable is painted.

**Contrast and targets.** All four fill/on-fill pairs are the same tokens `ino-metric-panel`
already used pre-extraction (AA-verified in every theme by `check-theme-parity.mjs`); target-size
criteria (SC 2.5.8) do not apply, because the component is never in the tab order (§1).

---

## 6. RTL (DoD row 8)

Logical properties only: `inline-size`/`block-size`, `padding-inline`/`padding-block`,
`border-inline-start-color` (spinner), `min-block-size`. No `left`/`right`/`top`/`bottom` anywhere in
the stylesheet.

---

## 7. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue.

- **Capacitor**: not a separate port — the same Angular component and CSS render inside the
  Capacitor WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port"). Verified at the
  44px comfortable target via `--ino-target-comfortable`-driven ancestor contexts; the tag itself is
  inline (§3) and inherits whatever row/control height its container sets.
- **React Native**: `mobile/react-native/src/components/InoTag.tsx`. The mobile RN/Flutter palettes
  (`mobile/react-native/src/theme/tokens.ts`, `mobile/flutter/lib/theme/tokens.dart`) have no
  `risk*` fields — only `success`/`warning`/`danger`/`info` (`check-theme-parity.mjs`'s `fields`
  list, derived from the Flutter `InoPalette` class, is the source of truth for which roles are
  ported). Rather than adding four new mobile-only fields — a token-registry change outside this
  issue's merge-hygiene rule (DoD row 11) — severity maps onto the existing ported roles:
  `high → danger`, `medium → warning`, `low → success`, `info → info`. This is the same RAG-onto-
  alert-palette mapping `ino-alert`'s four-state union already uses on web for its own `status`
  input; recorded here as a deliberate, reviewable choice, not a silent one.
- **Flutter**: `mobile/flutter/lib/widgets/ino_tag.dart`, same mapping.

---

## 8. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `virtual-scroller/SPEC.md` §6, re-verified for this issue: DoD row 11 describes "one
appended line in the `check-theme-parity.mjs` component registry", but **no such registry exists in
the file** (confirmed by reading it in full — it is a token-contract audit script: CSS mirror
byte-parity, colour roles across 3 themes × 2 mobile ports, space/radius/target/duration scales,
control-size scale, data-viz tokens). Neither `ino-alert`/`ino-toast-container` (W0-6) nor
`ino-virtual-scroller` (T-3) — the two most recent full-DoD components — added one. Inventing one
here, unilaterally, would put a new shared structure in the one file every remaining component
branch also touches, which is exactly the merge-conflict surface row 11 exists to prevent.

- **Nothing appended.** `node scripts/check-theme-parity.mjs` passes unchanged.
- Component-level token adherence is covered by `check-ds-adherence.mjs`'s directory-scope walk
  instead (no per-component registration needed there either).

---

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |
