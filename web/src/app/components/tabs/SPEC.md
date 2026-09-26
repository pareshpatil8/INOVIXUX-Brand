# `<ino-tabs>` — component spec

**Issue:** [INO-318](/INO/issues/INO-318) (INO-31 F-1, T-26, Tier 1)
**Parity benchmark:** PrimeNG 22.1.1 `Tabs` — `specs/primeng/llms-22.1.1.txt` line 116, route
`https://primeng.dev/tabs`: "Tabs is a container component to group content with tabs." PrimeNG is
a benchmark, **not a runtime dependency**.

---

## 1. Container/leaf split and automatic-activation keyboard model

`<ino-tabs>` is the container; `<ino-tab>` is the leaf, one per projected panel. This mirrors
`ino-drawer`/`ino-modal`'s named-slot split, but via `@ContentChildren(InoTabComponent)` rather than
`[attr]`-selector `ng-content` slots, because the container needs to *read data* (`label`,
`disabled`) off each child to render the tablist, not just relocate markup.

**Keyboard model: automatic activation**, per the WAI-ARIA Authoring Practices' tabs pattern —
ArrowRight/Down/Left/Up/Home/End both move focus **and** immediately select the target tab, rather
than a manual-activation model where arrow keys move focus and Enter/Space commits the selection.
Chosen because every tab's content already renders eagerly in the DOM (`[hidden]`, not `*ngIf`) —
switching panels costs nothing expensive enough to warrant the two-step manual model, and automatic
activation is the simpler contract for a caller to reason about (`activeIndexChange` fires on the
same interaction that moved focus, always).

Disabled tabs are permanently skipped by both arrow navigation and click, and never receive focus
via Home/End either — the enabled-tabs-only list (`enabled = tabs.filter(t => !t.disabled)`) is
computed fresh on every keydown and used as the sole basis for "next"/"previous"/"first"/"last".

## 2. Zero hardcoded values (DoD row 1)

| Concern | Token |
|---|---|
| Tablist divider | `--ino-color-border` |
| Tab text (resting/hover/active) | `--ino-color-on-surface-muted` / `--ino-color-on-surface` / `--ino-color-on-surface` |
| Active indicator | `--ino-color-accent`, 2px border |
| Focus ring | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Tab height/padding/font-size | `--ino-control-height` / `--ino-control-padding-inline` / `--ino-control-font-size` triad (§3) |
| Panel gutter | `--ino-space-5` |
| Colour/border transitions | `--ino-motion-duration-fast` / `--ino-motion-easing-standard` |
| Disabled dimming | `opacity: 0.5` — same literal every sibling's disabled state uses |

No `[data-theme]` branch in the component.

## 3. Size API (DoD row 3)

`size="sm" | "default" | "lg"` re-points the same three Wave 0 aliases every sized field component
re-points, driving the tab button's own `min-block-size`/`padding-inline`/`font-size`.

## 4. Density (DoD row 4)

Tab buttons read `min-block-size: var(--ino-row-min-height, var(--ino-control-height, …))` — same
fallback chain `ino-input`/`ino-input-group` use, so a dense/fluid ancestor's row floor applies with
no separate branch.

## 5. Variants built (DoD row 6)

| Named in the PrimeNG benchmark | Shipped | Surface |
|---|---|---|
| Horizontal tabs | ✅ | `orientation="horizontal"` (default) |
| Vertical tabs | ✅ | `orientation="vertical"` — indicator/border move to the inline edge (§ SCSS) |
| Disabled tab | ✅ | `<ino-tab [disabled]="true">` — skipped by click and keyboard nav (§1) |
| Controlled active index | ✅ | `[activeIndex]` / `(activeIndexChange)` two-way-bindable pair |

**Deliberate omission — closable tabs.** PrimeNG's Tabs supports a per-tab close button
(`removable`). Not built in this issue: it needs a removal-confirmation/undo contract (what happens
to the panel's own state/content on close?) that is a product decision, not a styling one, and the
audit's F-1 finding only asked for the base container. Tracked as a forward reference
`(pending INO-nnn)` rather than shipped speculatively.

## 6. Motion (DoD row 7)

Tab text-colour and active-indicator border-colour both transition on
`--ino-motion-duration-fast` / `--ino-motion-easing-standard`, zeroed under
`prefers-reduced-motion: reduce`. No animated panel enter/exit — panels toggle via the native
`[hidden]` attribute, an instant show/hide with nothing to gate behind reduced motion.

## 7. Accessibility contract (DoD row 8)

**Role/ARIA.** WAI-ARIA Tabs pattern: `role="tablist"` (with `aria-orientation`) on the tab strip,
`role="tab"` + `aria-selected` + `aria-controls` on each button, `role="tabpanel"` +
`aria-labelledby` on each `<ino-tab>` host. `aria-disabled` marks a disabled tab without removing it
from the DOM (disabled tabs stay discoverable, just unreachable by interaction, same convention
`ino-input`'s own `disabled` carries).

**Keyboard.** ArrowRight/Down → next enabled tab; ArrowLeft/Up → previous enabled tab; Home → first
enabled tab; End → last enabled tab. All four both move focus and select (§1). Tab/Shift+Tab moves
focus in and out of the tablist as a single stop (roving `tabindex`: only the active tab carries
`tabindex="0"`, every other tab is `tabindex="-1"`) — standard roving-tabindex composite-widget
behavior, same pattern this system's `ino-select`/`ino-multiselect` option lists already use.

**Contrast.** Active-tab text (`--ino-color-on-surface`) and the active-indicator border
(`--ino-color-accent`, non-text, SC 1.4.11 3:1 floor) are both already-audited roles.

**Target size.** Tab buttons inherit the control-height scale (§3), clearing the 24px SC 2.5.8
floor at every size rung, same as every other sized control in this system.

**RTL.** Logical properties only (`border-inline-end`, `padding-inline`) — the vertical variant's
indicator correctly renders on the trailing logical edge under `dir="rtl"`.

## 8. Mobile parity (DoD row 9)

**Web-only for now.** No React Native or Flutter port exists for this component as of this issue.
Recorded in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` as `web-only` on both platforms
with this reason.

## 9. Behavioral smoke test (DoD row 12)

`ino-tabs.spec.ts` — asserts: only the active panel is un-`hidden` and its tab carries
`aria-selected="true"`; clicking a tab switches the active panel; a disabled tab is never
activated by click; `ArrowRight` moves selection to the next *enabled* tab, skipping a disabled one
in between; roving tabindex holds (`tabindex="0"` only on the active tab).

## 10. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (registry entry added, §8) |
| `node scripts/check-spec-citations.mjs` | ✅ passes |
| `ng build` (`web/`) | ✅ passes |
| `ng test` (`ino-tabs.spec.ts`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none |
