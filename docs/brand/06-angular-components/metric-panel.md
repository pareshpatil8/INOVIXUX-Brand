# `<ino-metric-panel>` — Metric panel

> Marketing-only component — no PrimeNG counterpart, so there is no parity benchmark line.
> One of the 5 components doc 26 §4 A4 flagged with "no docs at all" (INO-374, doc 26 §6 C5).
> No static preview and no `SPEC.md` exist for this component; both predate this doc.

Raised-surface live-data card: a labeled headline metric with a count-up entrance animation, an
optional delta caption, and an optional list of RAG-status rows (e.g. per-risk-tier counts). Used
for dashboard metrics and risk-flag summaries — the one marketing-family component that reads as
"live data", hence the raised surface (`--ino-color-surface-raised`), unlike `ino-feature-grid`'s
flat surface (see that doc's Variants section for the distinction).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Panel headline label |
| `value` | `number` | `0` | The headline metric; animates from `0` to this value via `inoCountUp` on mount |
| `delta` | `string` | `''` | Caption under the header (e.g. "+18 this week"); `*ngIf`-gated, omitted when empty |
| `rows` | `InoMetricPanelRow[]` | `[]` | `{ label: string; value: string; status: 'high' \| 'medium' \| 'low' }[]`; list is `*ngIf="rows.length"`-gated |

`InoRiskStatus` (`'high' | 'medium' | 'low'`) is a closed union — `status` is never a raw color
`@Input`. Resolving `status` to a token pair (`--ino-color-risk-{status}-fill` / `-on-fill`) happens
entirely in this component's SCSS, so callers cannot pass an arbitrary color and every risk row
stays on the WCAG-audited token pairs (see the component's own class-level doc comment).

---

## Variants / Structure

One structural form: `<section>` → header (`label` + optional `delta`) → count-up `value` → optional
`rows` list, each row rendering a status dot, a label and a status-colored chip. There is no
alternate layout — a metric panel without rows is the same shell with the list omitted, not a
separate "compact" variant.

---

## States

Presentational and read-only from the caller's perspective (no internal editable state); the only
component-level animation is the `value` count-up on mount.

- **With rows** — `rows.length > 0` renders the RAG-status list under the headline metric.
- **Value only** — `rows: []` (the default) renders no list at all; `delta` is independently
  optional, so a panel can show a bare `label` + `value` with neither delta nor rows.
- **Row status** — each row's `status` is one of the three closed union members (`high` / `medium` /
  `low`); there is no "unset"/default status — every row must declare one.

---

## Labels and fields

`label` is a plain visible caption above the headline value (`<p class="ino-metric-panel__label">`)
— not a `<label for>` association, since the panel has no input control to name. There is no
`required`/hint/error/float-label concept here; the closest analogue is each `rows[].label`, which
names a risk-status row next to its own `chip` value. Long `label`/row-label text wraps normally
within the card's fixed padding rather than truncating.

---

## Accessibility contract

**Role / ARIA** — no explicit role; `<section>`'s implicit generic-section role is unchanged. The
count-up animation is purely visual (no `aria-live` region) — the final `value` is present in the
DOM text content immediately, so a screen reader reading the panel on its own schedule always gets
the settled number, not an in-progress one.

**Status dot** — each row's leading dot (`<span class="dot" aria-hidden="true">`) is decorative;
the status is conveyed to assistive tech via the row's text content and the `[data-status]`
attribute is presentation-only, not exposed as ARIA. Status is never color-only: the chip also
carries the row's `value` text.

**Keyboard** — none owned by this component. No row is focusable or activatable; a caller needing a
clickable risk row composes its own interactive wrapper.

**Contrast** — the three RAG fill/on-fill token pairs are the same AA-verified pairs `ino-tag`
extracted and reuses, audited across all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — logical properties throughout (`padding-inline`/`padding-block`, flex gap); no
`left`/`right`/`top`/`bottom` in the stylesheet.

---

## Deliberate omissions

- **Interactivity / drill-down.** Not carried — rows are static display data; a clickable
  drill-down into a risk row is caller-composed, not a component input/output.
- **Trend chart / sparkline.** Not carried — `delta` is caption text only, no inline chart
  rendering; a caller wanting a chart composes one alongside this component.
- **Readonly / invalid states.** Not carried — the panel has no editable value of its own to lock or
  fail validation; `value` is a display number, not a form control value.

## Notes / mobile disposition

Web-only. This is a marketing/dashboard-preview component, not part of the mobile app shell — no
React Native or Flutter port exists or is planned; nothing in doc 26's component backlog (§5) calls
for one.
