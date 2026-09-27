# `<ino-progress-bar>` — component spec

**Issue:** [INO-318](/INO/issues/INO-318) (INO-31 F-1, T-15, Tier 1)
**Parity benchmark:** PrimeNG 22.1.1 `ProgressBar` — `specs/primeng/llms-22.1.1.txt` line 97,
route `https://primeng.dev/progressbar`: "ProgressBar is a process status indicator." PrimeNG is a
benchmark, **not a runtime dependency**; nothing here installs it.
**Sibling precedent:** `<ino-progress-spinner>` (INO-133, same indeterminate/determinate/live-region
contract, ring instead of track) and `<ino-meter-group>` (INO-144, same linear-track/thickness
precedent). This spec only records what differs from those two.

---

## 1. Non-interactive: 4 of 8 states carried, 4 N/A (DoD row 5)

Same carried/N-A split as `ino-progress-spinner`'s SPEC.md §1, for the same reasons: Default,
Disabled, Invalid, Loading/busy are carried; Hover, Active/pressed, Focus-visible, Readonly are N/A
— the host has no `tabindex` and never accepts input.

## 2. Zero hardcoded values (DoD row 1)

| Concern | Token |
|---|---|
| Track thickness | `--ino-control-icon-size-{sm,default,lg}` (§3), same alias `ino-meter-group` reuses for its own track |
| Track background | `--ino-color-surface-sunken` |
| Fill colour | `--ino-color-accent` (default) / `--ino-color-danger` (`invalid`) |
| Track/fill radius | `--ino-radius-pill` |
| Fill transition | `--ino-motion-duration-base` / `--ino-motion-easing-standard` |
| Indeterminate sweep | `--ino-motion-duration-slow` / `--ino-motion-easing-standard`, infinite |
| Disabled dimming | `opacity: 0.5` — same literal every sibling's disabled state uses |

No `[data-theme]` branch in the component.

## 3. Size API (DoD row 3)

`size="sm" | "default" | "lg"` re-points `--ino-progress-bar-thickness` to
`--ino-control-icon-size-{sm,default,lg}` (16/20/24px) — identical mechanism to
`ino-meter-group`'s `--ino-meter-group-thickness`. Not `--ino-control-height`: a thin track is not a
control-height element, same reasoning `ino-meter-group`'s SPEC gives.

## 4. Density (DoD row 4)

`min-block-size: var(--ino-row-min-height, var(--ino-progress-bar-thickness))` — same fallback
idiom as `ino-meter-group`'s `:host`, so a dense/fluid ancestor's row floor is honored without a
separate branch in this stylesheet.

## 5. Variants built (DoD row 6)

| Named in the PrimeNG benchmark | Shipped | Surface |
|---|---|---|
| Determinate mode | ✅ | `mode="determinate"` (default) — `value` @Input (0–100, clamped), `aria-valuenow` |
| Indeterminate mode | ✅ | `mode="indeterminate"` — sweeping segment, `aria-busy` |
| Show value | ✅ | `showValue` @Input — renders `"{n}%"` centered over the track (determinate only) |
| Invalid/error recolor | ✅ | `invalid` @Input, matching `ino-progress-spinner`'s precedent |

No deliberate omissions.

## 6. Motion (DoD row 7)

Determinate fill transitions `inline-size` on `--ino-motion-duration-base` /
`--ino-motion-easing-standard`, zeroed under `prefers-reduced-motion: reduce`. Indeterminate mode
sweeps a 40%-wide segment across the track on `--ino-motion-duration-slow`, infinite; under
`reduce` the animation is removed entirely and the segment freezes at a static 50% width so the
"in progress" read survives without motion.

## 7. Accessibility contract (DoD row 8)

**Role.** `role="progressbar"` — same determinate/indeterminate `aria-value*`/`aria-busy` split as
`ino-progress-spinner`'s SPEC.md §7, verbatim.

**Live-region announcement.** Visually-hidden `aria-live="polite"` span, same 25%-quartile-throttle
contract as `ino-progress-spinner`.

**Keyboard.** None — never in the tab order.

**Contrast.** Fill colour is a non-text graphical object (SC 1.4.11, 3:1 floor), same roles already
audited by `check-theme-parity.mjs` for `ino-progress-spinner`/`ino-meter-group`.

**Target size.** N/A — never focusable/clickable.

**RTL.** Logical properties only (`inline-size`/`block-size`, `inset-inline-start`). The sweep
keyframe uses `inset-inline-start`, not `left`, so it mirrors correctly under `dir="rtl"`.

## 8. Mobile parity (DoD row 9)

**Web-only for now.** No React Native or Flutter port exists for this component as of this issue.
Recorded in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` as `web-only` on both platforms
with this reason. Mobile parity tracking begins when a port is scheduled — same not-yet-ported
posture several other Tier-1/Tier-2 components in the registry already carry.

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (registry entry added, §8) |
| `node scripts/check-spec-citations.mjs` | ✅ passes — all citations resolve on this branch |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
