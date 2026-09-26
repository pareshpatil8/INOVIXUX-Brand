# `<ino-stepper>` — component spec

**Issue:** [INO-318](/INO/issues/INO-318) (INO-31 F-1, T-27, Tier 1)
**Parity benchmark:** PrimeNG 22.1.1 `Stepper` — `specs/primeng/llms-22.1.1.txt` line 113, route
`https://primeng.dev/stepper`: "displays a wizard-like workflow by guiding users through the
multi-step progression." PrimeNG is a benchmark, **not a runtime dependency**.
**Sibling precedent:** `<ino-tabs>`/`<ino-tab>` (T-26) — same container/leaf split, same
automatic-activation roving-tabindex header. This spec only records what differs.

---

## 1. Linear-mode unlock model (the difference from `ino-tabs`)

Tabs has no notion of "reachable" — every enabled tab is always selectable. A stepper's whole point
is guiding a *sequence*, so `<ino-stepper>` adds a `linear` @Input (default `true`, matching the
PrimeNG benchmark's own default): in linear mode, a step is reachable only once the caller's flow
has advanced *to* it at least once. Tracked as `furthestIndex` (private, monotonically
non-decreasing except on... it never decreases — going back with `previous()` does not forget
progress already made, so re-advancing past an already-visited step needs no re-confirmation).

`disabled` (per-`<ino-step>` @Input) is a *separate*, permanent lock, orthogonal to the linear
frontier — a step can be disabled in either linear or non-linear mode, and disabled always wins
over "reachable" (`isReachable()` checks `disabled` first).

Two public imperative methods, `next()`/`previous()`, are the primary driving API (not just
`[activeIndex]`) — a wizard's "Back"/"Next" buttons are the dominant real-world interaction, and
exposing them as methods matches this system's existing precedent for imperative component APIs
(e.g. `ino-modal`'s `requestClose()`).

## 2. Zero hardcoded values (DoD row 1)

| Concern | Token |
|---|---|
| Index badge diameter | `--ino-control-icon-size-{sm,default,lg}` (§3) |
| Index badge border/text (rest) | `--ino-color-border` / `--ino-color-on-surface-muted` |
| Index badge fill (active) | `--ino-color-accent` / `--ino-color-on-accent` |
| Index badge fill (completed) | `--ino-color-accent-secondary` / `--ino-color-on-accent` |
| Connector line | `--ino-color-border`, 1px |
| Label text (active/completed) | `--ino-color-on-surface` |
| Focus ring | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Colour transitions | `--ino-motion-duration-fast` / `--ino-motion-easing-standard` |
| Disabled dimming | `opacity: 0.5` — same literal every sibling's disabled state uses |

No `[data-theme]` branch in the component.

**Why `accent-secondary` for "completed", not `success`.** A completed step is not itself a
success/failure judgement — it is "already passed through," a neutral progress fact. Reserving
`--ino-color-success` for an actual outcome (e.g. a review step that specifically validated) keeps
that role meaningful; the plain "you've been here" marker uses the system's other identity accent,
matching `ino-meter-group`'s own precedent for using `accent-secondary` as a non-evaluative second
tone.

## 3. Size API (DoD row 3)

`size="sm" | "default" | "lg"` re-points `--ino-stepper-index-size` to
`--ino-control-icon-size-{sm,default,lg}` — the index badge is a small circular marker, not a
field-height element, same reasoning `ino-meter-group`/`ino-progress-bar` give for reusing that
rung instead of `--ino-control-height`.

## 4. Density (DoD row 4)

No density-specific branch: the index badge's fixed diameter and the header's flex layout do not
change under `[data-density]`, and there is no row-based floor to inherit (a stepper header is not
embedded inside a table row the way a tag might be).

## 5. Variants built (DoD row 6)

| Named in the PrimeNG benchmark | Shipped | Surface |
|---|---|---|
| Linear progression | ✅ | `linear` @Input, default `true` (§1) |
| Non-linear (free navigation) | ✅ | `linear="false"` — every non-disabled step is always reachable |
| Horizontal stepper | ✅ | `orientation="horizontal"` (default) |
| Vertical stepper | ✅ | `orientation="vertical"` — index/connector move to the block axis |
| Disabled step | ✅ | `<ino-step [disabled]="true">` — permanently unreachable regardless of `linear` |
| Imperative next/previous | ✅ | `next()` / `previous()` public methods (§1) |

No deliberate omissions.

## 6. Motion (DoD row 7)

Index-badge fill/border/text-colour and header text-colour both transition on
`--ino-motion-duration-fast` / `--ino-motion-easing-standard`, zeroed under
`prefers-reduced-motion: reduce`. No animated panel enter/exit, same reasoning `ino-tabs`'s SPEC.md
§6 gives — panels toggle via native `[hidden]`.

## 7. Accessibility contract (DoD row 8)

**Role/ARIA.** Same WAI-ARIA Tabs-pattern roles `ino-tabs` uses (`role="tablist"`/`"tab"`/
`"tabpanel"`, `aria-selected`/`aria-controls`/`aria-labelledby`) — a linear stepper's header strip
is, mechanically, a constrained tablist, and reusing the audited pattern instead of inventing a
stepper-specific one avoids introducing an unaudited ARIA contract for what is structurally the
same widget with an additional reachability gate. `aria-disabled` covers both the per-step
`disabled` lock and the linear-mode "not yet reached" lock — a screen-reader user hears "current
item, disabled" either way, since the distinction (permanent vs. progression-gated) doesn't change
what they need to do next: nothing, from here.

**Completed indicator.** The checkmark glyph replacing the number inside a completed, non-active
badge is `aria-hidden` (decorative only, on the SVG); the accessible signal is `aria-selected` plus
the fact the step is reachable (not `aria-disabled`) — a screen reader does not need a separate
"completed" announcement to know it can navigate there.

**Keyboard.** Identical roving-tabindex automatic-activation model to `ino-tabs`'s SPEC.md §7,
constrained to the reachable-steps list instead of the enabled-tabs list.

**Contrast.** Active/completed badge fills (`--ino-color-accent`/`--ino-color-accent-secondary`
with `--ino-color-on-accent` text) and the connector line (`--ino-color-border`, non-text, SC
1.4.11) are all already-audited roles.

**Target size.** The index badge alone need not clear 24px at `sm` in isolation, but the clickable
surface is the whole `.ino-stepper__step` button (badge + label + `--ino-space-2` padding), which
does — same "the hit target is the whole control, not just its visible glyph" reasoning
`ino-tag`'s icon slot documents.

**RTL.** Logical properties only (`margin-inline`, `inline-size`/`block-size`) — the connector and
badge positions correctly mirror under `dir="rtl"`.

## 8. Mobile parity (DoD row 9)

**Web-only for now.** No React Native or Flutter port exists for this component as of this issue.
Recorded in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` as `web-only` on both platforms
with this reason.

## 9. Behavioral smoke test (DoD row 12)

`ino-stepper.spec.ts` — asserts: only the active panel is visible on init; clicking an unreached
step in linear mode is blocked (button carries native `disabled`); `next()` unlocks the following
step and marks the passed step `completed`; `previous()` returns to a prior step without
re-locking the already-unlocked frontier; in non-linear mode (`linear="false"`) every step is
directly clickable regardless of progression.

## 10. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (registry entry added, §8) |
| `node scripts/check-spec-citations.mjs` | ✅ passes |
| `ng build` (`web/`) | ✅ passes |
| `ng test` (`ino-stepper.spec.ts`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none |
