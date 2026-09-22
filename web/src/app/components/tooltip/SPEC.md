# `<ino-tooltip>` / `[inoTooltip]` — Tooltip — INO-31 T-22 / INO-149 component spec

Parity benchmark: PrimeNG 22.1.1 `Tooltip` (`specs/primeng/llms-22.1.1.txt` line 126, route
`https://primeng.dev/tooltip`) — "Tooltip directive provides advisory information for a
component." One line is the digest's entire entry; PrimeNG is a benchmark, **not a runtime
dependency** — nothing in this directory imports it.

Two files, one contract: `[inoTooltip]` (`ino-tooltip.directive.ts`) is the public API a caller
attaches to any element; `<ino-tooltip>` (`ino-tooltip.component.ts`) is the floating panel it
creates and drives, never placed directly by a caller. `overlay-position.ts`'s
`computeOverlayPlacement` is imported as-is from `<ino-confirm-popup>` — the exact second consumer
that file's own doc comment anticipated, needing no change to the signature.

---

## 1. Definition-of-Done disposition (plan rev 9 §2, all eleven rows)

| # | Row | Disposition |
|---|---|---|
| 1 | Zero hardcoded values | **Satisfied.** Every colour/space/radius/duration/shadow/font-size resolves through a token. `[style.top.px]`/`[style.left.px]` are JS-computed layout geometry, not design values — same exemption as `<ino-confirm-popup>`'s SPEC.md §2. `node scripts/check-ds-adherence.mjs`: zero violations. |
| 2 | Three web themes render correctly | **Satisfied.** `--ino-color-surface-raised`, `--ino-color-border`, `--ino-color-on-surface`, `--ino-elevation-neutral-2` (tokens.css §2 names this exact token "menu item, tooltip") all resolve per theme; `node scripts/check-theme-parity.mjs` passes. |
| 3 | Size API | **Satisfied,** but scoped to typography/padding rather than control height: a tooltip bubble has no control-height axis to fill (it isn't a row or a pressable), so `size` drives `--ino-control-font-size-*`/`--ino-control-padding-inline-*` off the Wave 0 scale instead — same aliases `<ino-tag>` uses for its own non-height-bound size axis. |
| 4 | Density | **Deliberate omission**, same reasoning as `<ino-confirm-popup>`'s SPEC §1 row 4 — a floating annotation has no ambient row to fill; density still reaches the panel via the size API's padding aliases. |
| 5 | Eight states | **Mostly N/A** — a tooltip is not an editable control. `default` (hidden) and the shown state (driven by hover/focus, not a hand-rolled `:hover`/`:focus-visible` on the panel itself, which is never focusable) are the only two that apply; `disabled` suppresses showing entirely (`inoTooltipDisabled`). `active/pressed`, `readonly`, `invalid`, `loading/busy` are N/A — there is nothing to press, no value to hold, and no async operation this component performs. |
| 6 | Variants | See §3. |
| 7 | Motion | **Satisfied.** `--ino-motion-duration-fast` / `-easing-decelerate` scale-in on show, gated by `@media (prefers-reduced-motion: no-preference)` — same weight class as `<ino-confirm-popup>`'s, since both share `--ino-elevation-neutral-2`/`-3`'s "menu/dropdown/popover/tooltip" speed. No exit animation: the panel is removed by `open` flipping to `false` (Angular's `*ngIf` tears it down immediately), matching a tooltip's instant-dismiss expectation rather than a modal's ceremony. |
| 8 | Accessibility | See §4. |
| 9 | Mobile parity | **Explicit web-only decision** — see §5. |
| 10 | Docs artifact | **Satisfied.** `docs/brand/06-angular-components/tooltip.md` + `docs/brand/06-angular-components/previews/tooltip.html` (`<!-- @dsCard group="Overlay" -->`). |
| 11 | Merge hygiene | **Satisfied.** Touches only `web/src/app/components/tooltip/**`, its own docs + preview files, and one appended line in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY`. `web/src/tokens.css` untouched — every token this component reads already exists. |

---

## 2. Why a directive that creates a component, not one component the caller places

PrimeNG's own Tooltip is directive-first (`pTooltip`, digest line 126) precisely because a tooltip
annotates an *existing* element rather than occupying its own place in a layout — unlike
`<ino-confirm-popup>`, which the caller explicitly places and toggles via `[(open)]`/`toggle()`.
`[inoTooltip]` follows that shape: attach it to any element, and it owns creating exactly one
`<ino-tooltip>` panel (via `ViewContainerRef.createComponent`), driving its `open`/`text`/
`position`/`size`/geometry inputs, and destroying it with the directive. `<ino-tooltip>`'s host
uses `display: contents` so the dynamically inserted custom element never affects the trigger's own
box layout — only the panel's own `position: fixed` box paints, positioned by
`computeOverlayPlacement` exactly like `<ino-confirm-popup>`'s panel.

---

## 3. Variants (DoD row 6)

| Variant axis | Shipped | Notes |
|---|---|---|
| `inoTooltipPosition: 'top' \| 'bottom' \| 'left' \| 'right'` | ✅ | Named exactly in the issue. Same flip-once-then-clamp placement algorithm as `<ino-confirm-popup>` (`computeOverlayPlacement`), including PrimeNG's own four-cardinal-direction scope — see `overlay-position.ts`'s doc comment for why a full auto-placement engine is out of scope for either consumer. |
| `inoTooltipSize: 'sm' \| 'default' \| 'lg'` | ✅ | Wave 0 control-size scale, applied to typography/padding per §1 row 3. |
| `inoTooltipShowDelay` / `inoTooltipHideDelay` (`number`, ms) | ✅ | The "delay in/out" the issue names explicitly. Defaults `300`/`100` — show delay avoids flickering a hint on every incidental pointer pass-through (PrimeNG's own default is also non-zero); hide delay is deliberately short but non-zero, giving the pointer time to reach the panel itself for the "hoverable" WCAG 1.4.13 leg (§4) without feeling sticky. |
| `inoTooltipDisabled` | ✅ | Suppresses showing entirely; also force-hides an already-open tooltip if flipped true while shown. |
| Click/tap trigger, `tooltipEvent` axis (PrimeNG has one) | ❌ deliberate omission | The issue names "focus and hover triggers," not a configurable set — see directive's own doc comment §"Triggers" for why both are always wired rather than made a choice. |
| Rich/HTML content (`ng-content`) | ❌ deliberate omission | Plain `text` string only — see `<ino-tooltip>`'s own doc comment and §4 below for the WCAG 1.4.13 rationale. |
| Manual pixel offset (PrimeNG's `positionLeft`/`positionTop`) | ❌ deliberate omission | `computeOverlayPlacement`'s fixed 8px gap already matches `<ino-confirm-popup>`'s; no caller in this codebase needs a per-instance override, and adding one before a second real need would be speculative API. |

---

## 4. Accessibility contract (DoD row 8)

**Role.** `role="tooltip"` on the panel, per WAI-ARIA APG — deliberately not `alertdialog`
(`<ino-confirm-popup>`'s role): a tooltip is passive advisory text, never a keyboard-interactive
surface, and is never itself focusable or added to the tab order.

**`aria-describedby`, not `aria-labelledby`.** The directive sets `aria-describedby` on the
*trigger* element (not the panel) pointing at the panel's id, only while the panel is open —
`aria-describedby` is the correct relation for supplementary description, matching every APG
tooltip example. It is added on show and removed on hide rather than left permanently wired to a
never-rendered id, since the panel itself is created and destroyed with `*ngIf`, not merely
hidden.

**WCAG 2.2 SC 1.4.13 (Content on Hover or Focus) — all three legs satisfied:**
- **Dismissible** — `Escape` closes the tooltip (`onDocumentKeydown`, capture-phase, matching
  `<ino-confirm-popup>`'s pattern) without moving focus away from the trigger or requiring the
  pointer to move. The DoD's "escape-to-dismiss contract" is this leg.
- **Hoverable** — `<ino-tooltip>`'s own `panelEnter`/`panelLeave` outputs keep the tooltip open
  while the pointer is over the panel itself, not just the trigger; `hide()` only actually runs
  once none of trigger-hover, trigger-focus, or panel-hover is true.
- **Persistent** — no auto-timeout. The tooltip stays open until one of the above dismissal paths
  fires, or the directive/trigger is destroyed.

**"Must not be the sole carrier of information" (issue text, echoing SC 1.4.13's broader intent
in this repo's own words).** This is a **content-authoring rule, not something code can enforce**
— same category as "write real alt text," which this codebase also cannot lint. Documented here
and in `docs/brand/06-angular-components/tooltip.md` for callers: a tooltip may *add* detail (a
keyboard shortcut, a truncated value's full text) but must never be the only place a required
fact is stated — the `text` input being a plain string (not `ng-content`) is a deliberate nudge
toward short, supplementary hints rather than load-bearing content, per §3.

**Keyboard, contrast, target size.** No new keyboard map beyond `Escape` — the panel itself takes
no tab stops. Text contrast and the panel's border both resolve through the same
`--ino-color-on-surface`/`--ino-color-surface-raised`/`--ino-color-border` triple every other
surface in this repo uses, already audited for WCAG 2.2 AA text and non-text contrast (SC 1.4.11)
including the high-contrast theme. No new interactive target is introduced (the trigger's own
target size is the trigger's own component's concern, unchanged by attaching this directive).

**RTL.** Every static declaration in the stylesheet uses logical properties; `top`/`left` are
JS-computed physical coordinates for the same RTL-correctness reason as `<ino-confirm-popup>`'s
SPEC.md §2, not re-derived here.

---

## 5. Mobile: web-only, and why (DoD row 9)

**Web-only by explicit decision**, per the issue text and plan rev 9 §5's desktop-idiom porting
rule: hover and keyboard focus are desktop pointer/keyboard idioms with no touch equivalent — a
touchscreen has no hover state, and "long-press to reveal a hint" is a materially different
interaction (with its own dismissal, timing, and accidental-trigger concerns) rather than a port
of this component. The mobile counterpart, if one is built, is a different component and gets its
own issue in a later wave, exactly as the issue text states.

---

## 6. Merge hygiene (DoD row 11)

Touches only `web/src/app/components/tooltip/**`, this directory's own docs
(`docs/brand/06-angular-components/tooltip.md`) and preview
(`docs/brand/06-angular-components/previews/tooltip.html`), and one appended entry in
`scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` (alphabetically inserted between `tag` and
`virtual-scroller`). `web/src/tokens.css` is untouched — no new token was needed.

---

## 7. Verification

| Gate | Result |
|---|---|
| `npx ng build` | passes |
| `node scripts/check-theme-parity.mjs` | PASS |
| `node scripts/check-ds-adherence.mjs --json` | zero violations |
