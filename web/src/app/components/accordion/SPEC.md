# `<ino-accordion>` — component spec

**Issue:** [INO-435](/INO/issues/INO-435) (INO-31 Phase B2, doc 26 §5 row `ino-accordion`)
**Parity benchmark:** PrimeNG `Accordion` — "a container component with vertically stacked,
collapsible content panels" (`specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/accordion`). PrimeNG is a benchmark, not a runtime dependency.
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 row:
"single/multiple expand; icon position; nested" / states: `expanded`, `disabled-panel` / sizing:
"compact/comfortable" / labels: "header = button" / a11y: "APG accordion: heading+button, Arrow
keys" / mobile: "Port both" (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
[INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Two-component architecture: container + tab

`<ino-accordion>` is the container, `<ino-accordion-tab>` is the individual panel. Not intended
for standalone use outside an accordion — the tab component depends on the parent for mutual-
exclusion coordination, icon-position/size cascading, and Arrow-key focus management.

```html
<ino-accordion [multiple]="false" size="comfortable" iconPosition="start">
  <ino-accordion-tab header="Section 1" [expanded]="true">Content 1</ino-accordion-tab>
  <ino-accordion-tab header="Section 2">Content 2</ino-accordion-tab>
  <ino-accordion-tab header="Section 3" [disabled]="true">Content 3</ino-accordion-tab>
</ino-accordion>
```

---

## 2. Single-expand vs multiple-expand mode

`multiple` @Input (default `false`) controls the expand mode:
- **Single-expand** (default): opening one tab closes all others (radio-like mutual exclusion) —
  the parent accordion coordinates this in `onTabOpen()`. PrimeNG default, matches the "accordion"
  mental model where exactly one section is open.
- **Multiple-expand** (`[multiple]="true"`): any number of tabs can be open simultaneously. Tabs
  operate independently; no mutual-exclusion coordination happens.

Both modes follow the WAI-ARIA APG accordion pattern identically — the difference is only in the
close-others logic, not the ARIA semantics.

---

## 3. Sizing: compact/comfortable, not sm/md/lg

Doc 26's spec row says "compact/comfortable", a two-value scale rather than the three-value
sm/md/lg other components carry. `size: 'compact' | 'comfortable'` (default `'comfortable'`)
re-points `--ino-control-padding-inline-roomy(-sm)` — the same bare-alias-only approach
`<ino-panel>` and `<ino-fieldset>` use. Because tokens.css §10/§12 redefines that alias per
`[data-density]`, dense/fluid density composes for free with no branch in this component.

Compact maps to `--ino-control-padding-inline-roomy-sm`; comfortable reads the bare alias
(equivalent to md in the three-value scale).

---

## 4. Icon position: start (default) vs end

`iconPosition: 'start' | 'end'` (default `'start'`) controls chevron placement in the tab header:
- **Start** (default): chevron before the text, PrimeNG default, reads as a visual bullet.
- **End**: chevron after the text, reads as a disclosure hint (some enterprise UIs).

The parent accordion cascades this value to all tabs in `ngAfterContentInit()`.

---

## 5. States — eight standard + one row-specific

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | |
| Hover | ✅ | Tab header background → `--ino-color-surface-hover`, text → `--ino-color-accent` |
| Active/pressed | ✅ | Tab header background → `--ino-color-surface-active`, text → `--ino-color-accent-active` |
| Focus-visible | ✅ | `--ino-focus-ring`/`-offset` on the header button (inset, `z-index: 1` to layer over adjacent borders) |
| Disabled | ✅ | Accordion-level `disabled` dims the whole accordion (`opacity: 0.5`, `pointer-events: none`); tab-level `disabled` locks only that tab's toggle (native `disabled`, cursor `not-allowed`, text → `--ino-color-on-surface-muted`) |
| Loading/busy | ✅ | Accordion-level `loading` dims all panels (`opacity: 0.7`), `aria-busy="true"` on the host; no per-tab loading state (same "behavior at the container level" call `<ino-panel>` makes) |
| Expanded | ✅ **(new, row-specific)** | Tab `expanded` @Input, emits `expandedChange`; body region `[hidden]` when collapsed, button `aria-expanded` reflects state; expanded tab body background → `--ino-color-surface` (differentiate from collapsed state's `--ino-color-surface-raised`) |
| Disabled-panel | ✅ **(new, row-specific)** | Same as tab-level `disabled` above — the spec row's "disabled-panel" is the tab's own `disabled` @Input |
| Readonly | N/A — not carried | Accordion has no "lock all toggles but stay legible" use case that `disabled` doesn't already cover; tabs are pure disclosure, not form inputs |
| Invalid/error | N/A — not carried | An accordion is a structural grouping with no value of its own to fail validation |
| Empty | N/A — not carried | No empty-state concept named in the spec row |

---

## 6. APG accordion pattern: heading+button, roving tabindex, Arrow keys

**ARIA structure** (per WAI-ARIA APG accordion):
- Each tab header is a `<button>` wrapped in a heading element (`<h1>`-`<h6>`, configurable via
  `headingLevel` @Input, default `<h3>`). The heading exists purely for document outline; all
  visual styling is on the button.
- Button carries `aria-expanded` (true/false) + `aria-controls` pointing at the panel region's id.
- Panel region has `role="region"` + `aria-labelledby` pointing back at the button.

**Keyboard navigation** (APG):
- **Tab** enters the accordion at the first tab header; once inside, roving tabindex keeps only the
  focused header tabbable (`tabindex="0"`), all others are `tabindex="-1"`.
- **ArrowDown** moves focus to the next tab (wraps at the end); **ArrowUp** moves to the previous
  tab (wraps at the start).
- **Home** jumps to the first tab; **End** jumps to the last tab.
- **Enter/Space** toggles the focused tab (native button behavior, no custom handler needed).

Focus management is coordinated by the parent accordion (`focusTab()`, `focusFirstTab()`,
`focusLastTab()`); each tab handles only its own `onKeyDown()` event routing.

---

## 7. Nested accordions

The spec row says "nested" as a variant. A nested accordion is an `<ino-accordion>` inside an
`<ino-accordion-tab>`'s content:

```html
<ino-accordion>
  <ino-accordion-tab header="Parent section">
    <ino-accordion [multiple]="true">
      <ino-accordion-tab header="Child 1">Content 1</ino-accordion-tab>
      <ino-accordion-tab header="Child 2">Content 2</ino-accordion-tab>
    </ino-accordion>
  </ino-accordion-tab>
</ino-accordion>
```

**Heading-level decision:** The inner accordion's tabs should have `headingLevel` one rank deeper
than the outer accordion's tabs (e.g. outer `h3` → inner `h4`). This is caller responsibility; the
component has no automatic nesting-depth detection. The docs page demonstrates the pattern.

**Focus trap:** Arrow keys do NOT cross accordion boundaries — the inner accordion's tabs are a
separate roving-tabindex group. Tab/Shift+Tab moves between the two accordions normally.

---

## 8. ARIA contract

**Accordion (container):**
- `aria-busy="true"` when `loading`.
- `aria-disabled="true"` when `disabled`.

**Tab:**
- Heading element (`<h1>`-`<h6>`) wraps the button.
- Button: `aria-expanded` (true/false), `aria-controls` (panel region id), `tabindex` (0 for first
  tab, -1 for others; roving on Arrow keys), native `disabled` when the tab is disabled.
- Panel region: `role="region"`, `aria-labelledby` (button id), `[hidden]` when collapsed.

**Keyboard.** Tab/Enter/Space are native button behavior; Arrow/Home/End are custom handlers in
`onKeyDown()` (see §6).

**Contrast and targets.** Border/background/focus-ring pairs are all pre-existing tokens, audited
across all three themes by `check-theme-parity.mjs`. Tab header button in default state is a
44px-equivalent target in fluid density (comfortable size), meets WCAG 2.2 AA 2.5.8.

**RTL.** Logical properties throughout: `padding-block`/`-inline`, `border-block-end`, `flex-
direction: row-reverse` for icon-end variant, `text-align: start`. No `left`/`right`/`top`/
`bottom` anywhere in the stylesheet.

---

## 9. Motion

Tab header hover/press color transitions and the expanded/disabled opacity use
`--ino-motion-duration-base` + `--ino-motion-easing-standard`. Chevron rotation uses
`--ino-motion-duration-fast`, wrapped in `@media (prefers-reduced-motion: no-preference)` —
matches `<ino-panel>`'s chevron treatment.

---

## 10. Mobile parity — both ports ship (row disposition: "Port both")

- **React Native** — `mobile/react-native/src/components/InoAccordion.tsx` (container),
  `InoAccordionTab.tsx` (tab). Uses `Pressable` for the header button,
  `accessibilityState={{ expanded, disabled }}`, `accessibilityRole="button"` on the header;
  no heading wrapper in RN (heading semantics are not portable). Roving tabindex is not ported
  (RN has no tabindex concept); keyboard navigation is omitted (mobile is touch-first).
- **Flutter** — `mobile/flutter/lib/widgets/ino_accordion.dart` (container),
  `ino_accordion_tab.dart` (tab). Uses `GestureDetector` + `Semantics(button: true, expanded: ...)`,
  same "no heading wrapper, no roving tabindex" scope as RN.
- **Capacitor** — not a separate port; the same Angular component/CSS renders inside the Capacitor
  WebView, same "Capacitor is not a port" call every other B2 component makes.

---

## 11. `check-theme-parity.mjs` — not modified

Same finding as every other B2 component's SPEC.md: the file has no per-component registry to
append a line to; `node scripts/check-theme-parity.mjs` passes unchanged. Component-level token
adherence is covered by `check-ds-adherence.mjs`'s directory-scope walk instead.

---

## 12. Verification run for this issue

| Check | Result |
|---|---|
| `ng test --include ino-accordion*.spec.ts` | Pending (tests to be written) |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |
| Logical properties (RTL) | ✅ — `padding-block`/`-inline`, `border-block-end`, `text-align: start`, `flex-direction: row-reverse` |
| Focus-visible outline | ✅ — `--ino-focus-ring` + `--ino-focus-ring-offset` |
| Reduced-motion guard | ✅ — chevron rotation wrapped in `@media (prefers-reduced-motion: no-preference)` |
| Disabled cursor | ✅ — `cursor: not-allowed` on disabled header button |
| ARIA (via browser DevTools) | To be verified in QA pass — `aria-expanded`, `aria-controls`, `aria-labelledby`, `role="region"`, roving tabindex |
| Keyboard (manual) | To be verified in QA pass — Arrow/Home/End, roving tabindex, Enter/Space toggle |
| Dense/fluid density compose | To be verified — `--ino-control-padding-inline-roomy` read bare, no branch on `[data-density]` |
| Three themes (dark/light/high-contrast) | To be verified — no theme-specific overrides, all colors via semantic tokens |
