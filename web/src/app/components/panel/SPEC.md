# `<ino-panel>` — component spec

**Issue:** [INO-437](/INO/issues/INO-437) (INO-31 Phase B2, doc 26 §5 row `ino-panel`)
**Parity benchmark:** PrimeNG `Panel` — "a container component with an optional content toggle
feature" (`specs/primeng/llms-22.1.1.txt` line 93, route `https://primeng.dev/panel`). PrimeNG is
a benchmark, not a runtime dependency.
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 row:
"plain titled container; collapsible; footer slot" / states: `collapsed` / sizing: "padding
scales" / labels: "header" / a11y: "landmark/region with label" / mobile: "Port both (simple)"
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. One sizing axis, not `<ino-card>`'s two

The spec row lists a single sizing dimension ("padding scales"), unlike `<ino-card>`'s two
independent `padding` (body) / `size` (header/footer chrome) knobs. `<ino-panel>` therefore has
one `size: 'sm' | 'md' | 'lg'` @Input that re-points the shared
`--ino-control-padding-inline-roomy(-sm|-lg)` alias, read uniformly by the header bar, the body,
and the footer bar — the same bare-alias-only approach `<ino-fieldset>`'s `size` uses for the same
documented-as-one-axis reason. Because tokens.css §10/§12 redefines that alias per
`[data-density]`, dense/fluid density composes for free with no branch in this component.

---

## 2. Eight states — six carried, two deliberately N/A

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | |
| Hover | ✅ | `collapsible` only — toggle text color to `--ino-color-accent` |
| Active/pressed | ✅ | `collapsible` only — toggle text color to `--ino-color-accent-active` |
| Focus-visible | ✅ | `collapsible` only — `--ino-focus-ring`/`-offset` on the toggle |
| Disabled | ✅ | `disabled` @Input — whole panel dims to `opacity: 0.5`, header text follows `--ino-color-on-surface-muted`, toggle native-disabled |
| Loading/busy | ✅ | `loading` @Input — body dims to `opacity: 0.5`, centered spinner, `aria-busy="true"` on the host; header/footer stay fully visible, same "keep content mounted" treatment `<ino-card>`/`<ino-fieldset>` use |
| Collapsed | ✅ **(new, row-specific)** | `collapsed` @Input, inert unless `collapsible`; content region `[hidden]`, toggle `aria-expanded="false"` |
| Readonly | ✅ | Locks the collapse toggle only (no native disabled, no emit) — leaves the chrome fully legible, same "behavior-only, no corresponding ARIA attribute" call `<ino-fieldset>`'s `readonly` makes, since `region` has no readonly semantic any more than `group` does |
| Invalid/error | N/A — not carried | A panel is a generic titled container with no value of its own to fail validation — same reasoning `<ino-card>` SPEC.md §2 gives for the same state |
| Empty | N/A — not carried | No empty-state concept named in the spec row; same omission `<ino-card>` makes |

---

## 3. `role="region"` + `aria-labelledby`, not `aria-label` (a11y row: "landmark/region with label")

The host is a plain `<section role="region">`. Per WAI-ARIA, a `region` is only exposed as a
landmark when it has an accessible name — `aria-labelledby` pointing at the visible header text
element (the toggle button when `collapsible`, a plain `<span id>` otherwise) satisfies that
without duplicating the string into an `aria-label`. A panel with no `header` renders no landmark
label at all; that is accepted as a caller error (same spirit as `<ino-fieldset>` rendering a bare
`<legend>`-less fieldset when `legend` is omitted) rather than synthesizing a generic fallback
label no AT user would find useful.

---

## 4. Disclosure mirrors `<ino-fieldset>` exactly; footer slot mirrors `<ino-card>` exactly

**Collapsible toggle** — same WAI-ARIA APG disclosure-button pattern `<ino-fieldset>` already
ships: a `<button>` (here spanning the whole header bar, since there is no `<legend>` to keep
narrow) with `aria-expanded` + `aria-controls` pointing at the content region's id. `collapsible`
defaults `false` — most panels (a settings block) are static grouping with no disclosure, matching
`<ino-fieldset>`'s same default-off reasoning.

**Footer slot** — `[ino-panel-footer]`, the identical content-projection idiom `<ino-card>` uses
for `[ino-card-footer]` (same selector shape, same position in render order, same `:empty { display:
none }` collapse-when-unused rule). No `[ino-panel-header]` content slot is added alongside the
`header` string @Input — the spec row's "Labels: header" names a single title string, the same
shape `<ino-fieldset>`'s `legend` already uses, and `<ino-card>`'s richer `[ino-card-header]` slot
exists for a different, more general container with no single documented label field.

---

## 5. ARIA contract

`role="region"` + `aria-labelledby` (§3). `aria-disabled="true"` reflects `disabled` on the host;
`aria-busy="true"` reflects `loading`. The toggle button carries `aria-expanded`/`aria-controls`
and native `disabled`; `readonly` only sets `aria-disabled="true"` on the toggle (locks the click
handler, not a native disable) — mirroring `<ino-fieldset>`'s identical toggle-readonly treatment.

**Keyboard.** The toggle is a real `<button>` — Tab reaches it, Enter/Space activate it, with no
custom key handling needed.

**Contrast and targets.** Border/background/focus-ring pairs are all pre-existing tokens, audited
across all three themes by `check-theme-parity.mjs`.

**RTL.** Logical properties throughout: `padding-block`/`-inline`, `border-block-end`/`-start`,
`border-inline-start-color` (spinner), `text-align: start` (toggle). No `left`/`right`/`top`/
`bottom` anywhere in the stylesheet.

---

## 6. Motion

Hover/press toggle color and the disabled/loading opacity transitions use
`--ino-motion-duration-base` + `--ino-motion-easing-standard`. The chevron rotation uses
`--ino-motion-duration-fast`; the loading spinner uses `--ino-motion-duration-slow` linear
rotation — both wrapped in `@media (prefers-reduced-motion: no-preference)`, matching every other
component's spinner/chevron treatment in this repo.

---

## 7. Mobile parity — both ports ship (row disposition: "Port both (simple)")

- **React Native** — `mobile/react-native/src/components/InoPanel.tsx`. Combines `<ino-fieldset>`
  RN port's collapsible-toggle logic (`Pressable` + `accessibilityState={{ expanded, disabled:
  readonly }}`) with `<ino-card>` RN port's explicit `footer?: ReactNode` prop (no content
  projection in RN, same idiom used there).
- **Flutter** — `mobile/flutter/lib/widgets/ino_panel.dart`. Same combination: `InoFieldset`'s
  `GestureDetector` + `Semantics(button: true, expanded: ...)` toggle, `InoCard`'s explicit
  `footer` `Widget?` parameter.
- **Capacitor** — not a separate port; the same Angular component/CSS renders inside the Capacitor
  WebView, same "Capacitor is not a port" call every other B2 component makes.

Neither mobile port carries an animated loading spinner (static ring only) — same scope call
`<ino-card>`/`<ino-fieldset>`'s own RN/Flutter ports already made, since neither theme token file
ports an animation-timing primitive worth reaching for here.

---

## 8. `check-theme-parity.mjs` — not modified

Same finding as every other B2 component's SPEC.md: the file has no per-component registry to
append a line to; `node scripts/check-theme-parity.mjs` passes unchanged. Component-level token
adherence is covered by `check-ds-adherence.mjs`'s directory-scope walk instead.

---

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `ng test --include ino-panel.spec.ts` | ✅ 6/6 |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |
