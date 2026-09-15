# `<ino-card>` — component spec

**Issue:** [INO-161](/INO/issues/INO-161) (INO-31 U-6)
**Parity benchmark:** PrimeNG 22.1.1 `Card` — `specs/primeng/llms-22.1.1.txt` line 38, route
`https://primeng.dev/card`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it. The live route documents three content areas: a `header` template (image/avatar/
visual, typically full-bleed), a default-projected body, and a `footer` template.
**Prerequisite for:** decomposing `ino-metric-panel` into `Tag` + `MeterGroup` inside a `Card`
(register item M-14) — not attempted in this issue; out of scope.
**Predecessor state:** `<ino-card>` already existed pre-issue with `variant`/`padding`/
`interactive` and `[ino-card-header]`/`[ino-card-footer]` content slots — this issue is an uplift
of an existing component, not a from-scratch build.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. `media`, not a redefinition of `header` (DoD row 6, scope)

PrimeNG's `Card` calls its full-bleed image/visual slot `header`. This repo's `<ino-card>`
already had a `[ino-card-header]` slot before this issue — and at every one of its ~14 existing
call sites (`web/src/app/pages/**`, `mobile/capacitor/**`, `ino-modal`), it is used as a title/
eyebrow bar (`<div ino-card-header>KYB / Vendor Underwriting</div>`, `<div ino-card-header>Default
surface</div>`, …), never an image. Renaming or repurposing it to match PrimeNG's literal slot
name would silently change what every existing caller renders, and merge hygiene (DoD row 11)
forbids touching any of those files in this branch to fix them up.

The new slot is therefore named `[ino-card-media]` — PrimeNG's `header` **shape** (full-bleed,
clipped to the card's own corner radius, sits above everything else), under a name that does not
collide with this repo's own established `header` meaning. `[ino-card-header]`/`[ino-card-footer]`
are otherwise untouched: same selector, same position in the render order, same behavior.

---

## 2. Eight states — six carried, two deliberately N/A (DoD row 5)

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | Pre-existing |
| Hover | ✅ | Pre-existing, `interactive` only — border-color to `--ino-color-accent` + 2px lift |
| Active/pressed | ✅ | Pre-existing, `interactive` only — border-color to `--ino-color-accent-active`, lift cancels |
| Focus-visible | ✅ | Pre-existing, `interactive` only — `--ino-focus-ring`/`-offset` |
| Disabled | ✅ **(new)** | `disabled` @Input — `opacity: 0.5` always; combined with `interactive` also drops hover/press/focus and sets `pointer-events: none` + `aria-disabled="true"` |
| Loading/busy | ✅ **(new)** | `loading` @Input — body content dims to `opacity: 0.5`, a centered spinner appears, `aria-busy="true"`; header/footer/media stay fully visible, matching `<ino-radio>`/`<ino-tag>`'s "keep the last committed content on screen" treatment |
| Readonly | N/A — not carried | "Readonly" distinguishes a control that *could* accept input from one that currently doesn't. `<ino-card>` is a content container with no value of its own to lock — same reasoning `<ino-tag>` SPEC §1 gives for the same state |
| Invalid | N/A — not carried | Same reasoning: "invalid" is a form-control validity concept; a card carries no value to fail validation. Forcing this input onto the component would invite misuse as a fake form control (`<ino-tag>` SPEC §1, same call) |

`disabled`/`loading` never native-disable the host — `<article>` has no native `disabled` IDL
attribute — so both are ARIA-reflected (`aria-disabled`, `aria-busy`) rather than attribute-removed,
the same choice `<ino-tag>` makes for its own non-form host element.

---

## 3. Two independent size knobs: `padding` (pre-existing) and `size` (new, DoD row 3)

`size="sm" | "default" | "lg"` (`InoControlSize`, Wave 0 control-size scale) is new in this issue
and sizes the header/footer **chrome**: `--ino-control-padding-inline-roomy` (both inline AND
block padding — see below), `--ino-control-font-size`, `--ino-control-gap`/`-icon-size` (used by
the loading spinner). It does not touch the body.

The pre-existing `padding="sm" | "md" | "lg"` @Input is left exactly as it was (`--ino-space-4` /
`-6` / `-8`, unchanged values) and continues to size the **body's** own breathing room only.

**Why two knobs instead of collapsing `padding` into `size`:** `padding` predates this issue and
is read at all ~14 existing `<ino-card>` call sites (`padding="lg"` on marketing pages, `padding="sm"`
on mobile Capacitor screens, `<ino-modal>`'s panel). Merge hygiene (DoD row 11) restricts this
branch to `web/src/app/components/card/**` plus docs/preview — none of those call sites can be
touched here. Re-pointing `padding` at the control-size scale's values (`sm`=16/20px,
`lg`=24px fluid) instead of its current values (`sm`=16px, `lg`=40px) would silently change body
spacing at every one of those 14 sites with no corresponding code change visible in their diffs.
Keeping `padding` untouched and adding `size` as a second, orthogonal input satisfies DoD row 3 (a
real `size` API exists, reads only the control-size scale, invents no local values) without an
unreviewable visual regression outside this branch's scope.

**Deliberate reuse: `--ino-control-padding-inline-roomy` sizes both axes of the header/footer bar,
not just the inline one.** Button/input use the *-roomy*/plain inline-padding track alongside a
separate `--ino-control-height` for the block dimension; a header/footer bar has no `height`
concept of its own (it wraps its content's natural block size), so there's no second field in the
DoD's control-size scale to reach for. Applying the one roomy alias to both `padding-inline` and
`padding-block` consumes the scale exactly as published rather than inventing a companion
block-padding value the DoD does not provide.

---

## 4. Per-section padding replaces the negative-margin bleed trick (unplanned bug fix)

Pre-issue, `.ino-card` held all padding and `.ino-card__header`/`__footer` bled back out to the
card edge via a negative margin hardcoded to `calc(var(--ino-space-6) * -1)` — the `padding="md"`
default. `padding="sm"`/`"lg"` only ever resized `.ino-card`'s own padding, never that hardcoded
negative margin, so a header/footer on a non-default-padding card rendered with a
2px-to-16px edge misalignment (visible gap or overlap) before this issue.

This uplift removes `.ino-card`'s own padding entirely; `__media`/`__header`/`__body`/`__footer`
each own their padding directly (`__media` gets none — full-bleed by design). This is a
prerequisite for an edge-to-edge `__media` slot (a third negative-margin rule would have been
needed otherwise) and fixes the pre-existing misalignment as a side effect — not a behavior any
caller could have been relying on, since it was visibly broken.

---

## 5. Variants built (DoD row 6)

| Named in the benchmark / issue | Shipped | Surface |
|---|---|---|
| Media (PrimeNG `header` template) | ✅ **(new)** | `[ino-card-media]`, full-bleed, clipped to `--ino-radius-xl` |
| Header (title/eyebrow bar) | ✅ (pre-existing, untouched selector) | `[ino-card-header]` |
| Footer (actions) | ✅ (pre-existing, untouched selector) | `[ino-card-footer]` |
| Body / default content | ✅ (pre-existing) | Default `<ng-content>` |
| Surface roles (`default`/`sunken`/`overlay`) | ✅ (pre-existing, not a PrimeNG concept — this repo's own token-role system, documented in the component's doc comment) | `variant` |

PrimeNG's `title`/`subtitle` are separate template slots in the benchmark; not built here. This
repo's pre-existing `[ino-card-header]` already serves as one freeform title bar per card at every
call site (never split into two lines), and adding a second, more granular slot was not something
any consumer asked for or the issue named — scope stays at "header / footer / media," the issue's
own title. A future issue can split `header` into `title`/`subtitle` if a caller needs it.

---

## 6. ARIA contract (DoD row 8)

No explicit `role` — `<article>`'s implicit role is appropriate for a self-contained piece of
content, unchanged from before this issue. `aria-disabled="true"` reflects `disabled`;
`aria-busy="true"` reflects `loading`. Neither uses a native IDL attribute because `<article>` has
none to use (same call `<ino-tag>` makes for its own `disabled`/`loading`).

**Keyboard.** No keyboard handling is owned by this component, `interactive` or not — the doc
comment is explicit that callers own the actual interactive element/role/keyboard behavior
(unchanged from before this issue). A caller making a card clickable wraps it in a real `<a>`/
`<button>` or supplies its own `tabindex`/`(keydown)`; this component only supplies the visual
hover/press/focus state for that case.

**Contrast and targets.** Border/background/focus-ring pairs are all pre-existing tokens, audited
across all three themes by `check-theme-parity.mjs`. SC 2.5.8 (24px target) does not apply to the
card shell itself — the clickable surface, if any, is caller-supplied per the keyboard note above.

**RTL.** Logical properties throughout: `padding-block`/`padding-inline`, `border-block-start`/
`-end`, `border-inline-start-color` (spinner). No `left`/`right`/`top`/`bottom` anywhere in the
stylesheet — this uplift also converted the two pre-existing physical `margin`/`padding` shorthand
declarations (numerically RTL-safe already, since both sides were always equal, but not
*structurally* logical) to their logical equivalents.

---

## 7. Motion (DoD row 7)

Hover/press lift and the disabled/loading opacity transitions use `--ino-motion-duration-base` +
`--ino-motion-easing-standard` (pre-existing base rule, `opacity` added to the transition list in
this issue). The loading spinner uses `--ino-motion-duration-slow` linear rotation, matching
`<ino-button>`/`<ino-radio>`/`<ino-tag>`'s spinner treatment, wrapped in
`@media (prefers-reduced-motion: no-preference)` so it (and the hover/press transform) collapse to
no animation under `reduce`.

No component-owned mount/unmount transition exists: `<ino-card>` never toggles its own presence in
the DOM (a caller's `*ngIf`/router outlet does), so there is no enter/exit lifecycle for this
component to animate — same conclusion `<ino-radio>`/`<ino-tag>` reached for the same reason.

---

## 8. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue.

- **Capacitor** — not a separate port; the same Angular component/CSS renders inside the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port"). The existing Capacitor pages already consume
  `<ino-card variant="…" padding="…">` (e.g. `mobile/capacitor/app/src/app/pages/sign-in`) —
  unaffected by this issue, since `padding` and the pre-existing slots are untouched (§3, §1).
- **React Native** — `mobile/react-native/src/components/InoCard.tsx`. No `[ino-card-media]`-style
  content projection exists in RN, so `media`/`header`/`footer` are explicit `ReactNode` props
  (same idiom `InoRadioGroup`'s `options` prop uses in place of Angular structural content) rather
  than a single `children`-only API.
- **Flutter** — `mobile/flutter/lib/widgets/ino_card.dart`, same explicit-slot-as-parameter
  approach (`media`/`header`/`footer`/`child` widgets), matching `ino_radio_group.dart`'s own
  non-content-projection shape.

Neither mobile port carries a `loading` spinner animation — `theme/tokens.ts`/`tokens.dart` port no
elevation/shadow tokens either (see `theme/tokens.ts`'s own comment on that gap), so the mobile
card is background/border/radius/padding only; the spinner reuses the same static-ring, no-native-
animation-library choice `InoRadio`'s RN/Flutter ports already made for their own loading state.

---

## 9. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `tag/SPEC.md` §8 and `radio-group/SPEC.md` §9, re-verified for this issue: DoD row
11 describes "one appended line in the `check-theme-parity.mjs` component registry", but no such
registry exists in the file (confirmed by reading it in full). Nothing appended;
`node scripts/check-theme-parity.mjs` passes unchanged. Component-level token adherence is covered
by `check-ds-adherence.mjs`'s directory-scope walk instead.

---

## 10. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |
