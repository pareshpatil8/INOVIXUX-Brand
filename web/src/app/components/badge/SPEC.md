# `<ino-badge>` — component spec

**Issue:** [INO-460](/INO/issues/INO-460) (INO-31 Phase B4, doc 26 §5 row `ino-badge`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Three variants with distinct semantics: `dot`, `count`, `status`

Per doc 26 §5 "dot/count/status" — three usage patterns with different accessibility contracts:

- **`dot`** — simple presence indicator (8/10px circle). Purely decorative by default
  (`aria-hidden="true"`), becomes informative only when `ariaLabel` is provided (e.g. "Online
  status"). No visible text.
  
- **`count`** — numeric badge (16/20px pill) with 99+ overflow for values ≥ 100. Always informative
  (`role="status"`) — requires `ariaLabel` for screen reader context (e.g. "3 new notifications").
  The visible number is `aria-hidden` to avoid double-announcement; the `ariaLabel` on the host is
  the authoritative accessible text.
  
- **`status`** — labeled indicator (20/24px rounded rect) with visible text and severity colors
  (info/success/warning/danger). The label is already accessible visible text, so no extra
  `role`/`aria-label` is needed — this variant is the accessible-by-default shape.

No fourth variant for "text-only badge" — `status` already covers labeled indicators, and a badge
without a distinguishing visual shape is just a `<span>` with styling.

---

## 2. Positioned vs standalone modes: detected via parent context, not an explicit prop

Per doc 26 §5 "positioned-on-child or standalone" — the component supports both usage modes:

- **Standalone:** use as a regular inline element (e.g. in a toolbar, after a label)
- **Positioned:** wrap a child element (e.g. button, icon, avatar) in a positioned container
  (`position: relative`), badge will anchor to the top-end corner via `position: absolute`

The mode is detected via `:host-context([style*="position: relative"])` rather than an explicit
`positioned` @Input. This matches the PrimeNG benchmark and avoids requiring callers to
redundantly declare the positioning mode when they've already set up the positioned parent. The
`:host-context()` selector listens for inline `style` positioning, `position`-bearing classes, or
any ancestor with explicit positioning.

The positioned anchor point is `inset-block-start: 0; inset-inline-end: 0; transform: translate(50%, -50%)`
— top-end corner, with the badge centered on that corner (50% of its own width/height extends
beyond the parent boundary). Logical properties ensure RTL flip for free.

---

## 3. 99+ overflow for count variant: hard-coded threshold at 100

Per doc 26 §5 "max+ overflow (99+)" — when `variant="count"` and `value >= 100`, the displayed
text is "99+" rather than the raw number. The threshold is 100 (not configurable) — the universal
convention for notification badges (Gmail, Slack, GitHub).

The real `value` is always preserved in the `ariaLabel` for screen readers (e.g. `ariaLabel="142
new messages"` displays as "99+" but announces "142 new messages"). No truncation in the accessible
text.

---

## 4. Size scale is `sm`/`md` only — aligned with dense/fluid density modes

Per doc 26 §5 "sm/md" — unlike `ino-avatar`'s five-step scale (xs/sm/md/lg/xl), badge uses only two
sizes matching the dense/fluid density modes:

- `sm` (dense): dot 8px, count 16px h, status 20px h — for compact tables, toolbars
- `md` (fluid): dot 10px, count 20px h, status 24px h — for primary UI surfaces

No `lg` size — a badge is an accent indicator, not a standalone content block. Sizing up further
would make it compete with the element it's annotating.

---

## 5. A11y contract varies by variant: decorative dot, informative count/status

- **Dot without `ariaLabel`:** decorative, `aria-hidden="true"`, no `role`. Pure visual indicator.
  
- **Dot with `ariaLabel`:** informative, `role="status"`, `aria-label` set. Announces the label
  (e.g. "Online") to screen readers.
  
- **Count:** always informative, `role="status"`, requires `ariaLabel` (the component auto-fills
  `ariaLabel` from `value` if not provided, but callers should supply context like "3 new
  messages"). The visible count is `aria-hidden` to avoid double-announcement. The `role="status"`
  makes it a live region — dynamic count updates are announced automatically without caller
  intervention.
  
- **Status:** the visible `label` is already accessible text, so no `role` or `aria-label` is
  added. Standard flow content semantics.

The "live-region guidance for dynamic counts" (doc 26 §5) is fulfilled by `role="status"` — it's
already a polite live region, so incrementing `value` will announce the new count. Callers don't
need to manage a separate `aria-live` region.

---

## 6. No invalid/error state (B4 deliberate omission)

The §2 standard state set includes invalid/error, but a badge has no bound value to validate — it
is a status indicator or counter, not a form control. No `invalid` prop or error styling. The
`severity` on the status variant is for semantic meaning (info/success/warning/danger), not
validation state.

---

## 7. No hover/focus/active states (static indicator)

Unlike interactive components (buttons, inputs), a badge is a static visual indicator — it is never
focusable or clickable in its own right. The element it's attached to (e.g. a notification button)
handles interaction; the badge is purely presentational. No hover, focus-visible, or active styles.

Positioned badges do not trap pointer events — the underlying element remains fully interactive.

---

## 8. Severity colors for status variant only

`severity: 'info' | 'success' | 'warning' | 'danger'` applies only when `variant="status"`. It
maps to semantic color roles (`--ino-color-{severity}` and `--ino-color-{severity}-surface`).

Dot and count variants use fixed colors (`--ino-color-primary` and `--ino-color-on-primary`) rather
than severity-based theming — they're generic indicators, not status classifiers.

---

## 9. No custom content slots (text/number only)

Unlike PrimeNG's Badge (which supports arbitrary content via transclusion), `ino-badge` accepts
only text/numbers via its `value` and `label` inputs. No icon slots, no template customization —
the three variants cover the specified use cases (dot/count/status), and adding a fourth
"custom-content badge" would blur the line with `ino-chip` (which is the slotted content primitive
for removable/interactive labeled indicators).

---

## 10. Mobile parity: React Native + Flutter ports

Per doc 26 §5 "Port both" — `ino-badge` will have equivalent React Native and Flutter
implementations with the same variant/state coverage (dot/count/status, sm/md, severity colors,
positioned/standalone modes). The positioned mode will use platform-native absolute positioning
rather than CSS `:host-context()`.
