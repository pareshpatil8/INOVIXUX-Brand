# `<ino-meter-group>` — component spec

**Issue:** INO-144 (INO-31 T-13, Tier 1 / Misc group)
**Parity benchmark:** PrimeNG 22.1.1 `MeterGroup` — `specs/primeng/llms-22.1.1.txt` line 87, route
`https://primeng.dev/metergroup` ("MeterGroup displays scalar measurements within a known range").
PrimeNG is a benchmark, **not a runtime dependency**; nothing here installs it.
**Register item:** half of M-14 (the other half is `ino-metric-panel`'s live-metric summary card).
**Depended on:** INO-113 (data-viz token layer) — merged (`done`) before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Non-interactive: 5 of 8 states carried, 3 deliberately N/A (DoD row 5)

`<ino-meter-group>` is a presentational composite display, matching the PrimeNG `MeterGroup`
benchmark (no built-in click/keyboard interaction in that component either).

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Segment fills resolved per-item colour (§2 below) |
| Hover | ✅ | Purely decorative `filter: brightness(1.15)` on a hovered segment/legend dot — no cursor or focus change, same non-functional feedback `ino-button`'s ghost variant gives on hover |
| Disabled | ✅ | `aria-disabled` + `opacity: 0.5`, same rationale `ino-tag`/`ino-progress-spinner` already document for a non-form host |
| Invalid | ✅ | Danger-coloured 2px inset boundary around the track (non-text 3:1, SC 1.4.11) plus an accessible-name suffix — e.g. a composite score whose sub-checks are stale or partially failed to compute |
| Loading/busy | ✅ | `aria-busy` + segments fade out while the track shimmers, same "nothing to show yet" idiom `ino-progress-spinner`'s indeterminate ring gives |
| Active/pressed | N/A — not carried | Nothing to press: the host has no `tabindex`, no click handler, and PrimeNG's own benchmark carries no pressed state either |
| Focus-visible | N/A — not carried | The host is a `<div role="group">`, never in the tab order; a component that cannot receive focus does not draw a focus ring, same reasoning `ino-tag` gives for its `<span>` host |
| Readonly | N/A — not carried | "Readonly" distinguishes a control that *could* accept input from one that currently doesn't. A meter group never accepts input — same reasoning `ino-tag`'s SPEC.md §1 gives |

---

## 2. Colour → token mapping (DoD row 1, "zero hardcoded values")

`tokens.css` is frozen after Wave 0. Rather than a raw `color` `@Input`, `InoMeterItem.color` is a
closed 6-member union resolved entirely in this component's SCSS:

| `color` | Token |
|---|---|
| `accent` | `--ino-color-accent` |
| `accent-secondary` | `--ino-color-accent-secondary` |
| `success` | `--ino-color-success` |
| `warning` | `--ino-color-warning` |
| `danger` | `--ino-color-danger` |
| `info` | `--ino-color-info` |

`--ino-color-risk-{high,medium,low}` (the tokens `ino-tag` uses for its RAG severity) are
deliberately **not** part of this union: those three roles are not ported to either mobile palette
(`ino-tag`'s own divergence note in `check-theme-parity.mjs` records this), and a composite score
routinely needs more than three weighted contributions rendered at once. The six roles above are
exactly the set `ino-tag`'s mobile port already proves exists on every platform, so
`<ino-meter-group>` never needs a per-platform colour remap the way `ino-tag.severity` does.

An item without an explicit `color` cycles through `DEFAULT_COLOR_ORDER` (the table order above) by
index, so a caller supplying only `label`/`value` pairs still gets a distinct, theme-correct colour
per segment — the "composite KYB risk score" case named in the issue, where callers are unlikely to
hand-pick a colour per weighted contribution.

All six resolve in every one of the three web themes automatically — `check-theme-parity.mjs`
already audits `--ino-color-{accent,accent-secondary,success,warning,danger,info}` across
dark/light/high-contrast; nothing new needed auditing.

---

## 3. Size API: control-icon-size scale, not control-height (DoD row 3)

`size="sm" | "default" | "lg"` drives the track's cross-axis **thickness**
(`--ino-control-icon-size-{sm,default,lg}` — 16/20/24px fluid, 16/16/20px dense).

**Deliberate exception, same shape as `ino-tag`'s §3:** the component does **not** read
`--ino-control-height` (36/44/52px). That scale sizes interactive *controls* (buttons, inputs); a
meter track is a thin bar, and PrimeNG's own benchmark renders one only a few pixels thick. Reusing
`--ino-control-icon-size` — the smallest rung the Wave 0 scale already defines — satisfies DoD row
3's "do not invent local sizing values" without forcing a control-height box onto a bar that was
never meant to be one.

The host also reads `--ino-row-min-height` as a `min-block-size` floor (falling back to 32px), the
same fallback idiom `ino-tag`'s `:host` uses, so a meter group embedded in a dense table row still
clears that row's own height floor (DoD row 4).

---

## 4. Variants built (DoD row 6)

| Named in the issue | Shipped | Surface |
|---|---|---|
| Horizontal / vertical | ✅ | `orientation` @Input — `inline-size`/`block-size` percentage segments, RTL-safe either way (§6) |
| Labelled segments | ✅ | Every `InoMeterItem` carries a `label`, rendered in the legend |
| Custom legend | ✅ | `legendTemplate` @Input — a `TemplateRef` receiving the resolved `segments` array as `$implicit`, replacing the generated legend entirely when set |
| Sizes (`sm`/`default`/`lg`) | ✅ | `size` @Input, §3 |
| Legend visibility toggle | ✅ | `showLegend` @Input — `false` keeps the legend in the DOM as a screen-reader-only list rather than removing the accessible per-segment text (§5) |

**Deliberate omission:** a per-item `icon` field/slot (present on PrimeNG's `MeterGroup` via its
`icon` template). The issue's scope line ("Horizontal/vertical, labelled segments, custom legend")
does not name icons, and per-item content projection inside an `*ngFor`-rendered legend would need
either a second array-of-templates input or a structural directive per item — real complexity for a
feature nobody asked for on this issue. `legendTemplate` already gives a caller who needs icons a
full escape hatch: they can render icons themselves in a custom legend template.

---

## 5. ARIA contract (DoD row 8)

Host is `role="group"` with `aria-label` set to `label`, or — when `label` is empty — a generated
summary of every segment (`"Documents 40, Sanctions screen 25, Adverse media 15"`), so the widget
always has a meaningful accessible name even when a caller forgets to set one. **Not** `role="meter"`
(the ARIA 1.2 role for a single scalar-within-range widget): this component renders *several*
weighted values in one track, and a single `aria-valuenow` cannot represent that without lying about
which segment it describes — the same "don't reach for a role that promises more precision than the
markup delivers" reasoning `ino-tag`'s SPEC.md §5 gives for not using `role="status"`.

**Legend.** Rendered as a `<ul>` of dot + label + value per segment. When `showLegend` is `false`,
the list stays in the DOM behind the same sr-only clip `ino-tag__label--sr-only` uses, so per-segment
text always reaches assistive tech even when the caller only wants the bar on screen.

**Track.** `aria-hidden="true"` — the coloured bar is a decorative rendering of data the legend (or
`aria-label` summary) already states in text; duplicating it as a second accessible surface would
double-announce the same numbers.

`aria-busy="true"` while `loading`; `aria-disabled="true"` while `disabled` (not the native
`disabled` attribute — a `<div>` has none). When `invalid`, the accessible name gets a
`" (data may be inaccurate)"` suffix so the boundary-colour cue (§1) has a text equivalent.

**Contrast and targets.** All six fill tokens are AA-verified non-text colours (`check-theme-parity`
audits every `--ino-color-{accent,accent-secondary,success,warning,danger,info}` role across three
themes); the legend's dot is decorative (paired with adjacent on-surface/on-surface-muted text, both
already audited), and target-size criteria (SC 2.5.8) do not apply because the component is never in
the tab order (§1).

---

## 6. RTL (DoD row 6)

Logical properties only: `inline-size`/`block-size` (segment percentages, track dimensions),
`margin`/`padding` shorthands that resolve to logical equivalents at the token layer. No
`left`/`right`/`top`/`bottom` anywhere in the stylesheet. Horizontal segments grow along the inline
axis, so an `[dir="rtl"]` ancestor mirrors the fill direction automatically with zero component-level
branching — the same approach every other Misc component in this register takes.

---

## 7. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue.

- **Capacitor**: not a separate port — the same Angular component/CSS render inside the Capacitor
  WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native**: `mobile/react-native/src/components/InoMeterGroup.tsx`. Track thickness reads
  `control[size].iconSize` — the same scale rung web's `--ino-control-icon-size` resolves to.
- **Flutter**: `mobile/flutter/lib/widgets/ino_meter_group.dart`, same sizing choice via
  `size.iconSize`.

**Declared divergence (`check-theme-parity.mjs`):** web reads `--ino-color-border-soft` for the
loading-state shimmer gradient sweeping across the track. Neither mobile port renders that texture —
both simply show an empty track while `loading` is true, avoiding a new animation-gradient dependency
for a single transient state. This is a scoped simplification, not a missing feature: the `aria-busy`
/ `Semantics(busy: true)` equivalent still fires on every platform, so assistive tech gets the same
signal regardless of whether the visual affordance is a shimmer or a blank track.

---

## 8. `check-theme-parity.mjs` — registry entry appended (DoD row 11)

One alphabetically-inserted entry (`name: 'meter-group'`, between `input` and `table`), plus the two
`borderSoft` divergence entries from §7 above. No other line in the file changed.

---

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes, including the new `meter-group` registry entry (10 components, 15 platform checks) |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token; the two literal numeric coefficients (`filter: brightness(1.15)` hover feedback) follow the same non-token-numeric precedent `ino-tag`'s `opacity: 0.5` disabled state already sets |
| `[data-theme]` branch in the component | none |
