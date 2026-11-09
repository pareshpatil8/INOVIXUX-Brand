# `<ino-badge>` — Badge

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B4 row
> `ino-badge` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-460](/INO/issues/INO-460).
> Parity benchmark: PrimeNG 22.1.1 `Badge`
> (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a benchmark, **not a runtime dependency**;
> nothing here imports it.
> Decisions record: `web/src/app/components/badge/SPEC.md`.

A compact notification indicator or status label — dot (presence), count (numeric with 99+
overflow), or status (labeled with severity). Positions on parent elements (badges on buttons,
icons, avatars) or renders standalone. Ports to React Native and Flutter.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'dot' \| 'count' \| 'status'` | `'count'` | See [Variants / Structure](#variants--structure) |
| `size` | `'sm' \| 'md'` | `'md'` | See [Sizing](#sizing) |
| `severity` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'info'` | `status` variant only — maps to semantic color roles |
| `value` | `number \| null` | `null` | `count` variant only — displays "99+" when ≥ 100 |
| `label` | `string` | `''` | `status` variant only — visible text label |
| `ariaLabel` | `string` | `''` | **Required for `count` variant** (e.g. "3 new notifications"); optional for `dot` (makes it informative instead of decorative); ignored for `status` |

No outputs. No content projection.

---

## Variants / Structure

Three usage modes per doc 26 §5: "dot/count/status; positioned-on-child or standalone; max+ overflow (99+)".

**Dot variant** — simple circular presence indicator (8px sm / 10px md). Two roles:
- **Decorative** (no `ariaLabel`): `aria-hidden="true"`, no role — pure visual indicator.
- **Informative** (with `ariaLabel`): `role="status"`, announces the label to screen readers.

**Count variant** — numeric badge with pill shape, displays "99+" when `value >= 100` (doc 26 §5
"max+ overflow"). The real value is always preserved in `ariaLabel` for screen readers.
`role="status"` makes it a live region — dynamic count updates are announced automatically.
**Always requires `ariaLabel`** (e.g. "3 new notifications"); the visible count itself is
`aria-hidden` to avoid double-announcement.

**Status variant** — labeled indicator with severity colors (info/success/warning/danger). Renders
a tinted background (`color-mix()` of 12% severity color on surface), colored text/border, and the
visible `label` text. No extra `role` or `aria-label` needed — the visible label is already
accessible text.

**Positioned mode** — when the parent container has `position: relative` / `absolute` / `fixed`,
the badge anchors to the top-end corner via `position: absolute` + `transform`. Mode is detected
via `:host-context()` rather than an explicit prop. Useful for badges on buttons, icons, avatars,
etc.

**Standalone mode** — without a positioned parent, the badge renders as a regular inline-flex
element. Useful in toolbars, after labels, in lists.

---

## Sizing

Two sizes (doc 26 §5 "sm/md") — aligned with dense/fluid density modes. Unlike `ino-avatar`'s
five-step scale, badge uses only two sizes:

- **sm** (dense mode): 8px dot, 16px count height, 20px status height
- **md** (fluid mode): 10px dot, 20px count height, 24px status height

---

## Labels

Only "own label" (doc 26 §5) — `ariaLabel` for count variant (required), `label` for status
variant (visible text). No `<ino-label>`/hint/error integration; a badge is not a form control.

RTL: logical properties only (`padding-inline`, `inset-inline-end`, `transform`, no physical
`left`/`right`/`top`/`bottom`).

---

## States

Per doc 26 §5 "States: n/a" — badge has no interactive states (hover/focus/active) or validation
states (invalid/error). It is a static visual indicator or counter, never a form control. The
element it's attached to (e.g. a button) handles interaction; the badge is purely presentational.

---

## Accessibility contract

**Roles** — variant-specific:
- **Dot without `ariaLabel`:** decorative, `aria-hidden="true"`, no role.
- **Dot with `ariaLabel`:** informative, `role="status"`, announces the label.
- **Count:** always informative, `role="status"`, requires `ariaLabel`. The visible count is
  `aria-hidden` to avoid double-announcement. The `role="status"` live region announces dynamic
  count updates automatically.
- **Status:** the visible `label` is already accessible text, so no `role` or `aria-label` is
  added. Standard flow content semantics.

**WCAG 2.2 AA:**
- Contrast: all color pairs (dot/count `--ino-color-accent`/`--ino-color-on-accent`; status
  severity colors on tinted backgrounds) are verified AA in all 3 themes by
  `check-theme-parity.mjs`.
- Target size: §2.5.8 does not apply — badge is never in the tab order, never interactive.

**Live-region guidance for dynamic counts** (doc 26 §5 a11y row): fulfilled by `role="status"` —
it's already a polite live region, so incrementing `value` will announce the new count. No
separate `aria-live` region needed.

---

## Deliberate omissions

**No automatic positioning-mode detection from arbitrary CSS.** The `:host-context()` selector
checks for `position: relative` / `absolute` / `fixed` on the parent — a conservative heuristic
that catches the common case (a button with `position: relative` explicitly for the badge). If a
parent is positioned for other layout reasons, the badge still anchors. The alternative (an
explicit `positioned` prop) was rejected because it doubles the surface area and re-introduces the
"mode prop out-of-sync with layout" bug the heuristic solves. Full reasoning: `SPEC.md` §2.

**No custom-color override.** Dot and count variants use `--ino-color-accent` (the brand primary).
Status variant maps `severity` to semantic roles (`--ino-color-{info,success,warning,danger}`).
Free-form color input was rejected — a badge is a semantic indicator, and "purple just because"
bypasses the theme-safe role layer. Full reasoning: `SPEC.md` §1.

**No icon/avatar leading visual.** Unlike `<ino-chip>` (which explicitly documents
`label+icon+avatar`), `<ino-badge>` is a pure counter/label indicator — doc 26 §5's "Variants"
column names only "dot/count/status", with no icon axis. The status variant's visible label is
text-only. Full reasoning: `SPEC.md` §1.

### Contrast with PrimeNG Badge
- PrimeNG `value` / `severity` → same name here.
- PrimeNG's `badgeDisabled` / `badgeHidden` → not carried here; a badge is presentational markup,
  never in the tab order — the disabled state would only apply to the element *wearing* the badge,
  and visibility is a caller concern (`*ngIf`).
- PrimeNG's overlay-positioned badge → our positioned mode (`position: absolute` when parent is
  positioned).

---

## Mobile parity

**Port both** (doc 26 §5): React Native (`mobile/react-native/src/components/InoBadge.tsx`) and
Flutter (`mobile/flutter/lib/widgets/ino_badge.dart`) implementations carry the same
variant/size/severity contract. Mobile platforms get:
- Native badge rendering (Material `Badge` idiom on Android, iOS-native badge affordance)
- Platform positioning patterns — positioned mode adapts to mobile stack/overlay idioms
- Accessibility: TalkBack/VoiceOver announce count values and status labels; decorative dots are
  hidden (`importantForAccessibility="no"` / `Semantics(excludeSemantics: true)`)
