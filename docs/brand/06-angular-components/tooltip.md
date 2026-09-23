# `<ino-tooltip>` / `[inoTooltip]` — Tooltip

> Parity benchmark: PrimeNG 22.1.1 `Tooltip` (`specs/primeng/llms-22.1.1.txt`, line 126).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/tooltip.html`](previews/tooltip.html).
> Full Definition-of-Done disposition: `web/src/app/components/tooltip/SPEC.md`.

Advisory hint anchored to a trigger element on hover or focus (INO-31 T-22 / INO-149). Directive
API, not a placed component — attach `[inoTooltip]` to whatever element needs the hint, and it
creates and manages the floating panel (`<ino-tooltip>`, never placed directly by a caller) for
you. Reuses `computeOverlayPlacement` from the shared `overlay-position.ts` (`../overlay/`,
INO-271), the same placement core `<ino-confirm-popup>` and `<ino-popover>` use.

```html
<button inoTooltip="Delete this item" inoTooltipPosition="top">Delete</button>
```

There is no barrel file; import by path: `./components/tooltip/ino-tooltip.directive`.

**A tooltip must never be the only place a required fact is stated** — WCAG 1.4.13 in this
codebase's own words. Use it to *add* detail (a shortcut, a truncated value's full text), never to
carry information nothing else on the page conveys.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `inoTooltip` | `string` | `''` | The hint text. Empty string suppresses the tooltip entirely. |
| `inoTooltipPosition` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Preferred side; flips once to the opposite side if it doesn't fit the viewport, then clamps |
| `inoTooltipSize` | `'sm' \| 'default' \| 'lg'` | `'default'` | Drives the panel's typography/padding off the Wave 0 control-size scale |
| `inoTooltipShowDelay` | `number` (ms) | `300` | Delay before showing, on hover or focus |
| `inoTooltipHideDelay` | `number` (ms) | `100` | Grace period before hiding — long enough for the pointer to reach the panel itself |
| `inoTooltipDisabled` | `boolean` | `false` | Suppresses showing; force-hides an already-open tooltip if flipped true |

No outputs — the directive owns its own panel's lifecycle; there is nothing for a caller to react
to.

---

## Positioning

Same `computeOverlayPlacement(anchorRect, panelSize, preferred, viewport, gap)` helper
`<ino-confirm-popup>` uses — one opposite-side flip, then a viewport clamp; see that component's
docs for the full description and SPEC.md §2 for why the computed position is applied via physical
`top`/`left` rather than logical `inset-inline-start`/`inset-block-start` (the RTL-*correct* choice
for a `getBoundingClientRect()`-derived coordinate).

---

## Variants

| Axis | Values |
|---|---|
| `inoTooltipPosition` | `top` / `bottom` / `left` / `right` — matches PrimeNG Tooltip's four cardinal directions |
| `inoTooltipSize` | `sm` / `default` / `lg` |

---

## States

Not an editable control, so most of the eight-state grid is N/A. Only two apply: hidden (default)
and shown (hover or focus, per the trigger set below). `inoTooltipDisabled` suppresses showing
entirely. See SPEC.md §1 row 5 for the full disposition.

---

## Triggers: hover and focus, always both

No `tooltipEvent`-style axis to pick one — the issue names "focus and hover triggers" as a pair,
and both are wired unconditionally on the host element (`mouseenter`/`mouseleave`,
`focusin`/`focusout`). There is no click/tap trigger.

---

## Motion

`--ino-motion-duration-fast` + `-easing-decelerate` opacity/scale fade in, same weight class as
`<ino-confirm-popup>`'s. No exit animation — `*ngIf` tears the panel down immediately when `open`
flips to `false`, matching a tooltip's instant-dismiss expectation. Collapses to none under
`prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role.** `role="tooltip"` on the panel (not `alertdialog`) — passive advisory text, never
focusable, never in the tab order.

**`aria-describedby`, not `aria-labelledby`,** set on the *trigger* while the panel is open,
pointing at the panel's id — the correct ARIA relation for supplementary description.

**WCAG 2.2 SC 1.4.13, all three legs:**
- **Dismissible** — `Escape` closes it without moving focus or the pointer. This is the "escape-to-
  dismiss contract" the issue names.
- **Hoverable** — the panel's own pointer-enter/leave keep it open while the pointer is over the
  panel itself, not just the trigger.
- **Persistent** — no auto-timeout; stays open until dismissed, hover/focus truly leaves both
  surfaces, or the trigger is destroyed.

**Contrast, RTL.** Text and border both resolve through `--ino-color-on-surface` /
`--ino-color-surface-raised` / `--ino-color-border`, the same triple every other surface in this
repo uses (WCAG 2.2 AA text and non-text contrast, including the high-contrast theme). Every static
declaration in the stylesheet uses logical properties.

---

## Deliberate omissions

- **Click/tap trigger, or a configurable trigger-event axis** — the issue specifies hover + focus
  as a pair, not a choice; see the directive's own doc comment.
- **Rich/HTML content (`ng-content`)** — plain `text` string only, a deliberate nudge toward short
  supplementary hints rather than load-bearing content (WCAG 1.4.13, above).
- **Manual pixel offset (`positionLeft`/`positionTop` in PrimeNG)** — no caller needs a per-instance
  override yet; the fixed 8px gap matches `<ino-confirm-popup>`'s.
- **Full auto-placement (flip-to-any-side, cross-axis `start`/`end` variants)** — same deliberate
  stopping point as `<ino-confirm-popup>`; a general-purpose placement engine is Popover's (T-23)
  problem, not this issue's.

## Mobile parity

**Web-only**, by explicit decision — hover and keyboard focus have no touch equivalent; a
long-press hint is a materially different interaction, not a port. Full detail:
`web/src/app/components/tooltip/SPEC.md` §5.
