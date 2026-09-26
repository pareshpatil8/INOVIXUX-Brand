# `<ino-icon-field>` — component spec

**Issue:** [INO-318](/INO/issues/INO-318) (INO-31 F-1, T-16, Tier 1)
**Parity benchmark:** PrimeNG 22.1.1 `IconField` — `specs/primeng/llms-22.1.1.txt` line 67, route
`https://primeng.dev/iconfield`: "IconField wraps an input and an icon." PrimeNG is a benchmark,
**not a runtime dependency**.
**Named dependency:** `ino-input.component.ts`'s class doc names this component as the sanctioned
icon-slot mechanism (audit finding F-1) — this issue builds it.

---

## 1. Non-interactive: 3 of 8 states carried, 5 N/A (DoD row 5)

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Icon rendered at rest |
| Disabled | ✅ | `disabled` @Input dims the icon (`opacity: 0.5`) in step with the projected control's own `:disabled` — this component has no access to the control to disable it itself, so it is the caller's job to set `disabled` on both the control and this wrapper |
| Invalid | N/A — not carried | Validity is the wrapped control's own state (border/ring recolor); the icon itself carries no validity signal, matching PrimeNG's own IconField (it has no `invalid` prop either) |
| Loading/busy | N/A — not carried | Same reasoning — `ino-input`'s own `loading` state already draws its trailing spinner; stacking a second loading concept in the wrapper would conflict with it, not compose |
| Hover/Active/Focus-visible | N/A — not carried | The host has no `tabindex` and the icon is `pointer-events: none` (decorative) — focus/hover/press always land on the wrapped control, never this wrapper |
| Readonly | N/A — not carried | Same reasoning as Invalid/Loading — readonly is the control's state |

## 2. Padding hand-off without `::ng-deep` (DoD row 1 / repo governance N-11)

Styling a projected native `<input>` from this component's own stylesheet needs `::ng-deep`
(Angular's emulated encapsulation never lets a plain descendant selector reach `<ng-content>`), and
`::ng-deep` is explicitly **not** a sanctioned escape hatch in this design system — doc 16 §4.3
"Layer 4" logs the override contract as an open, undecided governance item (N-11). `<ino-float-
label>` (INO-141) already established the workaround this component reuses verbatim: `Renderer2` +
`ElementRef.querySelector` on the one native node the projected control renders, setting a single
inline style directly on that real DOM element rather than reaching it through a stylesheet
selector.

The padding value itself is not duplicated as a number: `--ino-icon-field-offset` is declared once
on `:host` (SCSS) and the projected control's own `padding-inline-{start,end}` is set to
`var(--ino-icon-field-offset)` (a CSS var reference, not a resolved literal) — because custom
properties inherit, the control resolves the current value itself, and a later theme/token change
to the constituent tokens (`--ino-control-icon-size-default`, `--ino-space-3`) propagates with no
code change here.

| Concern | Token |
|---|---|
| Icon size | `--ino-control-icon-size-default` |
| Icon inset from the field edge | `--ino-space-3` |
| Icon colour | `--ino-color-on-surface-muted` |
| Disabled dimming | `opacity: 0.5` — same literal every sibling's disabled state uses |

No `[data-theme]` branch in the component.

## 3. Size API (DoD row 3) — deliberate omission

**No `size` @Input.** The icon offset reads a single fixed rung
(`--ino-control-icon-size-default`), not `sm`/`lg`. Rationale: this component wraps whatever
control the caller supplies, and that control's own `size` @Input already drives its
`--ino-control-height`/`--ino-control-font-size` — adding a *second*, independently-settable size
here would let the two drift out of sync (an `lg` input wrapped by a `sm` icon-field). If a future
issue needs the icon to visually track the wrapped control's size, that plumbing belongs to a
follow-up that also solves how this component observes the projected control's own resolved size,
not a bare enum copy — recorded here as the DoD-row-6 "deliberate omission with reasoning."

## 4. Density (DoD row 4)

No density-specific branch needed: the icon's absolute position is expressed in `--ino-space-3`
(inset) which does not change under `[data-density]`, and vertical centering (`top: 50%`) tracks
the wrapped control's actual rendered height automatically regardless of density.

## 5. Variants built (DoD row 6)

| Named in the PrimeNG benchmark | Shipped | Surface |
|---|---|---|
| Icon position (left/right) | ✅ | `iconPosition="start" \| "end"` @Input |
| Icon content | ✅ | `[ino-icon]` content-projection slot (any glyph/SVG/icon font element) |

No deliberate omissions beyond §3.

## 6. Motion (DoD row 7) — N/A

No transition/animation in this component; it only sets a static inline style on mount and on
`iconPosition` change. Nothing to gate behind `prefers-reduced-motion`.

## 7. Accessibility contract (DoD row 8)

**Role.** None on the host — a plain wrapping `<span>`-equivalent, no ARIA semantics of its own.

**Icon is decorative.** The host template wraps the `[ino-icon]` projection in
`aria-hidden="true"` — the icon never carries its own accessible name; if it is meaningful (e.g. a
validation glyph rather than a purely decorative search icon), the caller's own control/label must
carry the equivalent text, same convention `ino-tag`'s `[icon]` slot documents.

**Keyboard.** None — `pointer-events: none` on the icon wrapper, so it can never intercept a click
or become a tab stop; all interaction reaches the wrapped control.

**Contrast.** `--ino-color-on-surface-muted` on a decorative icon is not itself a WCAG-audited
pairing (SC 1.4.11 exempts purely decorative graphics), matching PrimeNG's own IconField.

**Target size.** N/A — the icon is not independently interactive; the wrapped control's own target
size is that control's contract, unaffected by this wrapper (padding only reserves space, it does
not shrink the control's own hit area).

**RTL.** Logical properties only (`inset-inline-start`/`inset-inline-end`, `padding-inline-*`) —
`iconPosition="start"` correctly renders on the right in `dir="rtl"`, matching `start`'s logical
meaning rather than a fixed physical side.

## 8. Mobile parity (DoD row 9)

**Web-only for now.** No React Native or Flutter port exists for this component as of this issue.
Recorded in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` as `web-only` on both platforms
with this reason.

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (registry entry added, §8) |
| `node scripts/check-spec-citations.mjs` | ✅ passes |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none |
