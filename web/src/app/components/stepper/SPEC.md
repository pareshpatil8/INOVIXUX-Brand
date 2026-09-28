# `<ino-stepper>` / `<ino-step>` — component spec

**Issue:** INO-136 (INO-31 T-27, Tier 1), recovered to full DS parity by **INO-361** after PR #20
was closed on 2026-09-27 without its web deltas landing (only the mobile ports were re-cut as #75).
See INO-361 for the recovery history — this file supersedes the version merged by #72, which shipped
a narrower state set (see §1).

**Parity benchmark:** PrimeNG 22.1.1 `Stepper` — `specs/primeng/llms-22.1.1.txt` line 113, route
`https://primeng.dev/stepper`: "displays a wizard-like workflow by guiding users through the
multi-step progression." PrimeNG is a benchmark, **not a runtime dependency**.
**Sibling precedent:** `<ino-tabs>`/`<ino-tab-panel>` (T-26) — same container/leaf split, same
automatic-activation roving-tabindex header, same selection-model decision (index-based, §2 there).
This spec only records what differs.

---

## 1. What this recovery adds over the version already on `main` (#72)

| State/capability | On `main` (#72) | Recovered here |
|---|---|---|
| `readonly` | ❌ | ✅ — focusable-but-inert, same contract `ino-tabs`'s `readonly` documents |
| Per-step `description` | ❌ | ✅ — optional secondary line under the label |
| Per-step `invalid` | ❌ | ✅ — `aria-invalid` + danger-text-safe styling on the badge/label |
| Per-step `loading` | ❌ | ✅ — spinner in the badge, `aria-busy` on the header button and the panel |
| `completed` ownership | Derived internally from navigation history (`furthestIndex`) | **Consumer-owned** — see below |

**`completed` ownership is the one real behavioral break, and it is deliberate.** The version on
`main` computed `completed` itself (`index < furthestIndex`): a step became "completed" purely by
having been navigated past, regardless of whether its form fields were actually valid. The recovered
branch's model — kept here — makes `completed` a `<ino-step>` `@Input` the *consumer* sets once that
step's own validation passes. This is the more correct model for the "validation gating between
steps" the issue text calls for: a stepper cannot know whether a step's content is valid, only the
form that owns those fields can, so it should not be guessing via "did the user click Next."

`linear` mode's `isReachable()` gate reads exactly this consumer-set flag — index `i` unlocks once
every step before it has `completed = true`. Index 0 is always reachable.

## 2. Selection model: index-based, controlled or uncontrolled

Same decision, same reasoning, as `<ino-tabs>` SPEC.md §2 — read that section for the full argument.
In short: the recovered branch (#20) used id-based selection; this recovery keeps **index-based**
(`[activeIndex]`/`(activeIndexChange)`) because the already-merged mobile ports
(`InoStepper.tsx`/`ino_stepper.dart`, #75) are controlled-only and index-based by their own design,
and no consumer of `<ino-stepper>` needs stable identity across a reordered/spliced step list.

**`next()`/`previous()` are convenience methods layered on top of `selectStep()`**, not a second
selection path. `next()` advances to `steps[current + 1]` through the same reachability gate a header
click would hit — so if the caller hasn't set the current step's `completed` flag yet, `next()`
correctly no-ops rather than bypassing the gate it exists to enforce. `previous()` is unconditional:
going back never needs unlocking, and the target index is always already reachable by construction.

**Locked-but-not-disabled is focusable, not natively `[disabled]`.** A step blocked by `linear`
gating gets `aria-disabled="true"` (and a visually dimmed, `cursor: default` treatment) but stays in
the roving-tabindex focus path — the same "readonly/locked" contract `ino-tabs` uses for its own
`readonly` rows. Native `[disabled]` is reserved for `<ino-step disabled>` (§4), a permanent lock the
consumer applies regardless of `linear`. Locking-by-not-yet-reached is a *progression* fact, not a
"this doesn't apply to you" fact, so it stays discoverable to a screen-reader user instead of being
removed from the tab order.

---

## 3. Zero hardcoded values (DoD row 1)

| Concern | Token |
|---|---|
| Indicator diameter | `max(--ino-control-icon-size, --ino-target-min)` (§4) |
| Indicator border/text (rest) | `--ino-color-border` / `--ino-color-on-surface-muted` |
| Indicator fill (active) | `--ino-color-accent` |
| Indicator fill (completed) | `--ino-color-accent` / `--ino-color-on-accent` |
| Indicator (invalid) | `--ino-color-danger-text-safe` |
| Connector line (rest / filled) | `--ino-color-border` / `--ino-color-accent`, 2px |
| Label/description text | `--ino-color-on-surface` (active) / `--ino-color-on-surface-muted` (rest) / `--ino-type-hint` (description) |
| Focus ring | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Colour transitions | `--ino-motion-duration-fast` / `--ino-motion-duration-base` / `--ino-motion-easing-standard` |
| Disabled | `--ino-color-on-surface-subtle` |

No `[data-theme]` branch in the component.

**Why the completed indicator fill reuses `--ino-color-accent` rather than a second tone.** The
version on `main` used `--ino-color-accent-secondary` for "completed" to distinguish it from
"active." This recovery folds that distinction into *shape* instead (checkmark glyph vs. active
ring/fill) rather than a second colour role, because with `completed` now consumer-owned (§1) a step
can be both `completed` and `active` simultaneously (the user revisited a step they'd already
validated) — two colour roles would need a third rule for that overlap, where one role plus a glyph
does not.

## 4. Size API (DoD row 3)

`size="sm" | "default" | "lg"` re-points the same `--ino-control-height` /
`--ino-control-padding-inline-roomy` / `--ino-control-font-size` / `--ino-control-gap` /
`--ino-control-icon-size` quintet `<ino-tabs>` re-points (SPEC.md §3 there) — the indicator's hit box
is `max(--ino-control-icon-size, --ino-target-min)`, same `max()` idiom as `ino-tabs__tab-close`, so
`lg`'s 24px icon is never shrunk below its own size.

## 5. Orientation and density (DoD row 4)

`orientation="horizontal" | "vertical"` was already present in the recovered branch and is unchanged
here — indicator/connector move to the block axis, header text switches from centred-under-badge to
inline-beside-badge. No density-specific branch beyond what the control-size aliases already give for
free (same reasoning `ino-tabs` SPEC.md §4 gives).

## 6. Variants (DoD row 6)

| Named in the PrimeNG benchmark / issue | Shipped | Surface |
|---|---|---|
| Linear progression | ✅ | `linear` @Input, default `true` (§1) |
| Non-linear (free navigation) | ✅ | `linear="false"` — every non-disabled step is always reachable |
| Horizontal stepper | ✅ | `orientation="horizontal"` (default) |
| Vertical stepper | ✅ | `orientation="vertical"` |
| Disabled step | ✅ | `<ino-step [disabled]="true">` — permanently unreachable regardless of `linear` |
| Readonly | ✅ | `readonly` @Input — recovered, §1 |
| Imperative next/previous | ✅ | `next()` / `previous()` public methods (§2) |

No deliberate omissions.

## 7. Motion (DoD row 7)

Same duration/easing pairing as `ino-tabs` SPEC.md §6: indicator/connector/label colour transitions
on `--ino-motion-duration-fast`/`-base` with `--ino-motion-easing-standard`, panel enter on
`--ino-motion-duration-base` with `--ino-motion-easing-decelerate`, spinner rotation on
`--ino-motion-duration-slow` linear. Panel exit is instant, same reasoning. All zeroed under
`prefers-reduced-motion: reduce`.

## 8. Accessibility contract (DoD row 8)

**Role/ARIA.** Same WAI-ARIA Tabs-pattern roles `ino-tabs` uses — a linear stepper's header strip is,
mechanically, a constrained tablist. `aria-disabled` covers both the per-step `disabled` lock and the
linear-mode "not yet reached" lock; the header button's screen-reader-only suffix
("locked until earlier steps are completed") disambiguates *why* for a user who wants to know,
without changing what they need to do next (nothing, from here).

**Completed indicator.** The checkmark replacing the number is `aria-hidden` (decorative); the
accessible signal is reachability (not `aria-disabled`) plus `aria-selected`.

**Keyboard.** Identical roving-tabindex automatic-activation model to `ino-tabs` SPEC.md §7,
constrained to the reachable-steps list instead of the enabled-tabs list, with the same
horizontal-RTL-aware / vertical-no-flip arrow key split.

**Contrast.** Active/completed indicator fills and the connector line are all already-audited roles
(`node scripts/check-theme-parity.mjs`).

**Target size.** The clickable surface is the whole `.ino-stepper__step` button (indicator + label +
gap), which clears the 24px SC 2.5.8 floor at every size rung even where the indicator glyph alone
would not.

**RTL.** Logical properties only — the connector and indicator positions mirror under `dir="rtl"`.

## 9. Mobile parity (DoD row 9)

**All three tracks ship, and the states recovered in §1 are web-only for now** — same situation and
same reasoning as `ino-tabs` SPEC.md §9:

- **Capacitor** — not a separate port (INO-99 path alias), same Angular component runs in the WebView.
- **React Native** — `mobile/react-native/src/components/InoStepper.tsx` (merged as #75).
- **Flutter** — `mobile/flutter/lib/widgets/ino_stepper.dart` (merged as #75).

**Selection model already matches (§2).** Both ports are controlled-only and index-based.

**One doc-comment correction needed by this recovery:** the RN port's `InoStepperItem.completed`
comment currently says completed "mirrors the internal flag web's `<ino-stepper>` derives from its
own `furthestIndex` tracking." That is no longer true — web's `completed` is consumer-owned (§1). The
RN/Flutter ports were already consumer-supplied (`items[i].completed` is a plain field the caller
sets), so their *behavior* needs no change, only the comment — corrected as part of this issue.

**States recovered on web that the mobile ports do not yet carry:** `readonly`, per-step
`description`, `invalid`, `loading` — deliberately deferred, not silently dropped, same reasoning
`ino-tabs` SPEC.md §9 gives for its own list.

## 10. Merge hygiene (DoD row 11)

Same finding as `ino-tabs` SPEC.md §10: `scripts/check-theme-parity.mjs` has no per-component
registry to update (re-verified for this issue), token adherence is covered by
`scripts/check-ds-adherence.mjs`, and `web/src/tokens.css` was not touched — no token gap found.

**Files touched by this issue:** `web/src/app/components/stepper/**`,
`docs/brand/06-angular-components/stepper.md`,
`docs/brand/06-angular-components/previews/stepper.html`, and the one doc-comment fix in
`mobile/react-native/src/components/InoStepper.tsx` (§9). Nothing else.

## 11. Behavioral smoke test (DoD row 12)

`ino-stepper.spec.ts` — asserts: only the active panel is visible on init; clicking an unreached step
in linear mode is blocked but the step stays focusable (`aria-disabled`, not native `disabled`);
`next()` no-ops until the caller marks the current step `completed`, then advances; `previous()`
always returns to the prior step; non-linear mode allows jumping to any non-disabled step directly;
`readonly` blocks activation while preserving focus reachability; vertical orientation reflects
`data-orientation`/`aria-orientation` and renders per-step descriptions; `ArrowDown` moves selection
under vertical orientation.

## 12. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (file unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ `0 violations` for `stepper/` |
| `cd web && npx ng build` | ✅ `Application bundle generation complete` |
| `cd web && npx ng test` (`ino-stepper.spec.ts`) | ⚠️ blocked by the same pre-existing test-harness environment issue documented in `ino-tabs` SPEC.md §11 — reproduces on unmodified `origin/main` for unrelated specs, not caused by this diff |
| Hardcoded colour/space/radius/duration/font-size | none |
| `[data-theme]` branch in the component | none |
