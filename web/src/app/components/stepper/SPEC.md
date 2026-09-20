# `<ino-stepper>` / `<ino-step>` — component spec

**Issue:** INO-136 (INO-31 T-27, Tier 1 / Panel group)
**Parity benchmark:** PrimeNG 22.1.1 `Stepper` — `specs/primeng/llms-22.1.1.txt` line 113, route
`https://primeng.dev/stepper` ("The Stepper component displays a wizard-like workflow by guiding
users through the multi-step progression"). PrimeNG is a benchmark, **not a runtime dependency**;
nothing here installs it.
**Depends on:** W0-2 (INO-124, control-size scale), W0-1 (INO-122, `--ino-focus-ring`), W0-5
(INO-127, motion contract) — all merged before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Interactive: 7 of 8 states carried, 1 folded into another (DoD row 5)

Same footing as `ino-tabs`: this is a control, not decoration, so every DoD state is real here.

| State | Carried? | Surface |
|---|---|---|
| Default | ✅ | Outlined circle indicator (`--ino-color-border`), `--ino-color-on-surface-muted` label, numbered |
| Hover | ✅ | Indicator border + label promote to `--ino-color-accent` / `--ino-color-on-surface`. Suppressed on locked and disabled steps, so hover never promises an activation that will be refused |
| Active/pressed | ✅ | `:active:not(:disabled)` → indicator border `--ino-color-accent-active` (W0 pressed-fill role, INO-123) |
| Focus-visible | ✅ | `outline: var(--ino-focus-ring)` with the token's own offset — see §8 |
| Disabled | ✅ | Native `[disabled]` on the step `<button>` + `--ino-color-on-surface-subtle` on indicator and label. Skipped by arrow-key navigation and by the uncontrolled-mode initial pick |
| Readonly | ✅ | `data-readonly` on the track. Focus model untouched (arrows still move); `selectStep()` refuses for every non-active step, same "focusable but inert" contract `ino-tabs`'s readonly documents |
| Invalid | ✅ | `--ino-color-danger-text-safe` on indicator border/label, `aria-invalid="true"` on the step |
| Loading/busy | ✅ | Spinner replaces the number/check in the indicator, `aria-busy="true"` on the step and the panel |

**Selected vs. active/pressed** — same distinction `ino-tabs` SPEC.md §1 draws. The DoD's
"active/pressed" is `:active` (mouse-held); a step's *current* state is `aria-selected` plus the
outlined-accent indicator, and is not one of the eight.

**A fourth, non-DoD flag — `completed`.** Not a DoD state; it is the data the `linear` gate reads
(§4/§7) and renders as a filled indicator + checkmark. It coexists with every state above (a
completed step can still be re-visited, re-invalidated, etc.).

---

## 2. Size API: the full control-size scale (DoD row 3)

`size="sm" | "default" | "lg"`, typed as the shared `InoControlSize` union from
`web/src/app/components/control-size.ts` — imported, never re-declared locally. Recipe identical
to `ino-tabs` SPEC.md §2's `:host([data-size='…'])` block:

| Alias | Used for |
|---|---|
| `--ino-control-icon-size` | indicator diameter, floored at `--ino-target-min` via `max()` — the exact idiom `ino-tabs__tab-close` uses, so `lg`'s 24px icon (already at the floor) is never shrunk |
| `--ino-control-padding-inline-roomy` | horizontal padding on a step button (horizontal orientation only) |
| `--ino-control-font-size` | indicator glyph + label |
| `--ino-control-gap` | gap between indicator and label/description text |

No off-scale sizes exist.

---

## 3. Density (DoD row 4)

Free, same reasoning as `ino-tabs` SPEC.md §3: the density blocks in `tokens.css` §10 redefine the
control-size aliases themselves, so a `[data-density="dense"]` ancestor shrinks the indicator with
no component-level branch. `--ino-row-min-height` is deliberately not read — a step track is not
row-based, same rule and same reasoning as `ino-tabs`.

---

## 4. Variants (DoD row 6)

| Named in the issue | Shipped | Surface |
|---|---|---|
| Linear | ✅ (default) | `linear` @Input, default `true` — a step unlocks only once every step before it has `completed = true`. This is the "validation gating between steps" the issue names |
| Non-linear | ✅ | `linear="false"` — free navigation between any non-disabled step, identical to `ino-tabs`'s default |
| Horizontal | ✅ (default) | `orientation="horizontal"` — row of steps, connector is a horizontal line |
| Vertical | ✅ | `orientation="vertical"` — column of steps, connector is a vertical line, arrow keys swap to Up/Down |
| Controlled / uncontrolled | ✅ | Same `[activeId]`-bound-or-omitted split as `ino-tabs` |
| Completed indicator | ✅ | Filled accent circle + checkmark, driven by `<ino-step completed>` |

### Against the PrimeNG benchmark

PrimeNG 22 ships Stepper as a compound composition (`Stepper` / `StepList` / `Step` / `StepPanels`
/ `StepPanel`, plus a deprecated single-component `StepperPanel` form). This component collapses
that to **two** parts (`ino-stepper` + `ino-step`), for the same reason `ino-tabs` collapsed its
four-part PrimeNG equivalent — see that SPEC.md §4 for the full "one declaration site keeps the
`aria-controls` graph unbreakable" argument, which applies here unchanged.

- **Interaction model reused from `ino-tabs`, not reinvented** — role=tablist/tab/tabpanel, roving
  tabindex, one visible panel. The WAI-ARIA APG has no defined "stepper" pattern; the closest
  vetted pattern in this codebase is exactly what `ino-tabs` already implements (single-panel
  navigation strip), so reusing it rather than inventing a new untested ARIA contract is the safer
  choice. What's new on top: the numbered/checkmark indicator, the connector line, `orientation`,
  and the `linear` gate.
- **Content placement — a single panel region after the step track, not interleaved per-step** —
  same reason `ino-tabs` renders all panels through one `<ng-content>` outlet regardless of how
  many tabs exist: Angular content projection has one insertion point per unnamed `ng-content`, and
  a dynamic step count rules out per-step named slots. This also matches the common KYB wizard
  layout (a step rail alongside/above a single active-step content pane), so it is not a compromise
  specific to this implementation.
- **Vertical orientation — shipped**, unlike `ino-tabs` which deliberately omitted it. A wizard is
  the canonical vertical-stepper use case (GOV.UK/USWDS-style step indicators), so it is in scope
  here where it wasn't for a tab strip.
- **Linear gating — shipped**, the one behaviour with no `ino-tabs` analog. PrimeNG's own Stepper
  supports both linear and non-linear; the KYB flow this issue serves needs linear as the default.

---

## 5. Motion (DoD row 7)

| Moving thing | Duration | Easing |
|---|---|---|
| Indicator border/background, label colour | `--ino-motion-duration-base` / `-fast` | `--ino-motion-easing-standard` |
| Connector fill (on completion) | `--ino-motion-duration-base` | `--ino-motion-easing-standard` |
| Step panel enter (opacity + `--ino-space-1` rise) | `--ino-motion-duration-base` | `--ino-motion-easing-decelerate` |
| Step indicator spinner | `--ino-motion-duration-slow` | `linear` (a rotation has no start or end to ease) |

**Panel exit is instant**, same rule and same reason as `ino-tab-panel` — the outgoing panel
unmounts the moment `active` flips, so animating it out would keep stale content painted while the
new step's content is already being announced.

**`prefers-reduced-motion: reduce`** is a single CSS branch here (unlike `ino-tabs`, which also
needed a JS branch for `scrollBy()`): this component has no script-driven animation, so killing the
transitions and gating both `@keyframes` blocks inside
`@media (prefers-reduced-motion: no-preference)` covers every animated surface.

---

## 6. Keyboard map (DoD row 8)

Roving tabindex: exactly one step is `tabindex="0"` (the current one); every other is `-1`.

| Key | Action |
|---|---|
| `Tab` | Moves into the track (landing on the current step), then out of it to the panel |
| `ArrowRight` (horizontal) / `ArrowDown` (vertical) | Focus the next enabled step, wrapping. **RTL-aware** in horizontal orientation only — reversed when computed `direction` is `rtl`. Vertical has no RTL concept (Up/Down is direction-invariant) |
| `ArrowLeft` (horizontal) / `ArrowUp` (vertical) | Focus the previous enabled step, wrapping. Same RTL flip as above |
| `Home` | First enabled step |
| `End` | Last enabled step |
| `Enter` / `Space` | Attempt to activate the focused step — refused if it is locked (§7), readonly, or already current |

Disabled steps are skipped by every movement key. Locked steps (linear gate) are **not** skipped by
movement — a user can focus and inspect an upcoming locked step; only activation is refused, so its
existence and position stay perceivable, matching `ino-tabs`'s readonly-vs-disabled split.

---

## 7. ARIA contract (DoD row 8)

| Element | Contract |
|---|---|
| Track | `role="tablist"`, `aria-orientation="horizontal"` or `"vertical"` |
| Step | `role="tab"`, `id="{id}-tab"`, `aria-controls="{id}-panel"`, `aria-selected`, roving `tabindex`, plus `aria-busy` / `aria-invalid` as applicable, and `aria-disabled="true"` while locked by the linear gate or while the track is readonly |
| Panel | `role="tabpanel"`, `id="{id}-panel"`, `aria-labelledby="{id}-tab"`, `aria-busy` while loading, `hidden` while inactive, `tabindex="0"` |
| Connector | Presentational, `aria-hidden="true"` — the step order is already conveyed by DOM order and by each step's visually-hidden "step N of M" suffix, so the line carries no independent information |

**Why `role="tablist"`/`"tab"`/`"tabpanel"` for a wizard.** The APG defines no "stepper" pattern.
Reusing the pattern this codebase already ships and has audited (`ino-tabs`) is the smaller claim
than inventing a new role/aria-* contract with no reference implementation to check it against —
same reasoning §4 gives for reusing the two-part composition.

**Locked steps use `aria-disabled`, not the native `disabled` attribute** — deliberately the
opposite choice from `disabled` (which *is* native, per `ino-tabs` SPEC.md §1's reasoning). A
locked step is a temporary, data-driven state (it unlocks the moment earlier steps complete), and
roving-tabindex focus must still be able to reach it so a user can see what's next; `aria-disabled`
gives the "not currently actionable" announcement without removing it from the focus order the way
native `disabled` would.

**Ids are derived**, never hand-wired — identical mechanism to `ino-tab-panel`'s `panelId`/
`tabButtonId`, so `aria-controls` ↔ `aria-labelledby` cannot be mismatched by a caller.

**The panel is always `tabindex="0"`**, same reasoning as `ino-tab-panel` — the projected content
is arbitrary, so the component cannot know whether it already contains a focusable element.

---

## 8. Contrast, target size, RTL (DoD rows 2 and 8)

**Contrast.** Every colour is a semantic role already audited across dark/light/high-contrast by
`node scripts/check-theme-parity.mjs`: `--ino-color-on-surface` (current label),
`--ino-color-on-surface-muted` (idle), `--ino-color-accent` / `--ino-color-accent-active` (current /
pressed indicator), `--ino-color-danger-text-safe` (invalid — the text-safe red, not the fill red,
same reasoning `ino-tabs` gives), `--ino-color-on-surface-subtle` (disabled, decorative-only by that
token's contract), `--ino-color-on-accent` (checkmark on the filled completed indicator — audited
pair, tokens.css §1). `--ino-color-border` carries the indicator ring and connector line at 2px,
clearing the SC 1.4.11 3:1 non-text floor; the current/completed step is additionally distinguished
by colour AND shape (filled vs. outlined vs. numbered), so validity/progress is never colour-only
(SC 1.4.1) — same rule `ino-tabs`'s invalid dot follows.

**No `[data-theme]` branch exists anywhere in the component** (DoD rows 1–2).

**Target size (SC 2.5.8).** The indicator hit box is
`max(var(--ino-control-icon-size), var(--ino-target-min))` — 24px floor at every size, never
shrinking `lg`'s 24px icon. The step `<button>` itself extends the hit area further via
`--ino-control-padding-inline-roomy` (horizontal) or the full label/description block (vertical).

**Focus ring.** `outline: var(--ino-focus-ring)` with the token's own (positive)
`--ino-focus-ring-offset` — not negated, unlike `ino-tabs`'s scroll-clipped strip: a step track is
never `overflow: auto`, so there is no scroll container to clip an outward ring.

**RTL.** Logical properties only: `inline-size`/`block-size`, `margin-inline-start`,
`margin-block-start`, `padding-inline`. No physical `left`/`right`/`top`/`bottom`. Arrow-key
direction flips only in horizontal orientation (§6); vertical orientation and the connector's own
geometry need no RTL handling — a vertical line's position is defined by `margin-inline-start`,
which already flips for free under `dir="rtl"`.

---

## 9. Mobile parity (DoD row 9)

**All three tracks ship**, same three bullets and same reasoning as `ino-tabs` SPEC.md §9
(Capacitor runs the same web bundle through the `@web-app/*` alias; RN and Flutter are real ports):

- **Capacitor** — no per-component file; `mobile/capacitor/app/src/` imports the web component.
- **React Native** — `mobile/react-native/src/components/InoStepper.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_stepper.dart`.

**Scope of the ports — a controlled step *rail*, not a step *system*** (same split `ino-tabs`
draws for its strip):

| Web feature | RN / Flutter |
|---|---|
| Controlled `activeId` (there is no uncontrolled mode on mobile) | ✅ |
| `size`, `orientation` (horizontal/vertical) | ✅ |
| `linear` gating (`completed` per step) | ✅ — same "every step before `i` must be completed" rule |
| `disabled`, `invalid`, `loading` per step | ✅ |
| Step content panels | ❌ — same reason as `ino-tabs`: RN/Flutter already have first-class ways to hold per-step content (a parent `switch`/`IndexedStack`/navigator); the ports render the rail and return the active id, the parent renders content |
| Keyboard map, roving tabindex, focus ring | ❌ — no equivalent, same drop `InoButton`/`InoTabs` document for `:focus-visible` |
| RTL arrow-key flip | N/A — no arrow keys on either mobile port |

**No new mobile tokens were invented.** The ports read only existing fields:
`colors.{onSurface,onSurfaceMuted,onSurfaceSubtle,accent,accentActive,border,onAccent,dangerTextSafe}`,
`control[size]`, `radius.pill`, `space`, `targetComfortable`, `motion` (RN) and their `InoPalette`/
`InoControlSize`/`InoRadius`/`InoSpace`/`InoMotion` equivalents (Flutter).

---

## 10. Merge hygiene (DoD row 11)

**`scripts/check-theme-parity.mjs` was not modified.** Re-verified for this issue, the way
`ino-tabs` SPEC.md §10 and `ino-tag` SPEC.md §8 both did: DoD row 11 describes "one appended line
in the `check-theme-parity.mjs` component registry", but no such registry exists in that file — it
is a pure token-contract audit. `git log -- scripts/check-theme-parity.mjs` shows only
token-assertion commits (INO-163/125/124/92/…); none add a per-component list. Component-level
token adherence is covered instead by `scripts/check-ds-adherence.mjs`, which needs no
registration and ran clean against this component (0 violations after fixing two off-scale `-1px`
connector-offset literals found during development — removed rather than waived, since the offset
was a cosmetic half-border-width nudge the design does not need).

**`web/src/tokens.css` was not touched** (frozen after Wave 0). No token gap was found.

**Files touched by this issue:** `web/src/app/components/stepper/**`,
`docs/brand/06-angular-components/stepper.md`,
`docs/brand/06-angular-components/previews/stepper.html`,
`mobile/react-native/src/components/InoStepper.tsx`,
`mobile/flutter/lib/widgets/ino_stepper.dart`. Nothing else.

---

## 11. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (file unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ `0 violations` (2 found during development, fixed, no waiver added) |
| `cd web && npx ng build` (temporarily wired into `app.ts`/`app.html`, reverted after) | ✅ `Application bundle generation complete` |
| Hardcoded colour / space / radius / duration / font-size | none — every one resolves through a token |
| `[data-theme]` branch in the component | none |
| Physical `left`/`right`/`top`/`bottom` in the SCSS | none — §8 |
