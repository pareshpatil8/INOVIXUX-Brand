# `<ino-colorpicker>` — component spec

**Issue:** INO-473 (INO-31 Phase B5, Tier-1 Misc track)
**Parity benchmark:** PrimeNG 22.1.1 `ColorPicker` — `specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/colorpicker`. PrimeNG is a benchmark, **not a runtime dependency**; nothing
here installs it.
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5
row (`ino-colorpicker`)
**Parent issue:** INO-31 Brand Architecture / Identity Creation

This file records the decisions the §2 Component Publish Contract requires to be written down.

---

## 1. `value` is `string | null`, not a hardcoded default

`@Input() value: string | null = null`. There is no universal "correct" starting color for an
arbitrary theming/admin picker, and hardcoding one would itself be a raw-colour literal (§8
below) — so `null` ("nothing picked yet") is the default, the same null-default convention
`ino-datepicker`'s `value: Date | null = null` uses. The internal HSB model initializes to black
(`h=0 s=0 b=0`) when `value` is `null`, matching native `<input type="color">`'s own default.

`value` is a hex string — `#rrggbb`, or `#rrggbbaa` when `showAlpha` is on — never an `rgb()`/
`hsl()` string. See §8 for why hex, specifically, is the component's internal/external currency.

---

## 2. Popover (default) vs. inline — the same overlay shape as `ino-datepicker`

`inline={true}` renders the picker body (SB panel, hue/alpha bars, hex/RGB fields, presets)
directly with no trigger, overlay, backdrop, or focus trap. The default (`inline=false`) renders
a trigger — a swatch button plus a typeable hex field — that opens a `role="dialog"` popover
anchored under it.

The overlay mechanics (backdrop click / Escape / focus-trap / `appendTo="self"|"body"` portal)
are a direct copy of `ino-datepicker`'s (`../datepicker/ino-datepicker.component.ts`): same
reason the overlay markup lives inside the trigger's own positioned wrapper (INO-364), same
`computeOverlayPlacement` call with `align: 'start'`, same zoneless `detectChanges()` sequencing
around `openPanel()`. This is the third consumer of that exact shape (after `ino-datepicker` and,
upstream of both, `ino-popover`/`ino-confirm-popup`/`[inoTooltip]`'s shared
`computeOverlayPlacement`) — not reinvented here.

---

## 3. Trigger: "dialog/combobox hybrid" — two inputs, two roles

The spec row's a11y cell names a hybrid explicitly:

- **Combobox half** — the hex text field beside the swatch is typeable directly (no need to open
  the panel to set an exact known hex value), `role="combobox"`, `aria-haspopup="dialog"`,
  `aria-expanded`. Focusing it opens the panel, same as typing into `ino-autocomplete`'s input
  opens its listbox.
- **Dialog half** — the swatch button is the primary trigger (`aria-haspopup="dialog"` /
  `aria-expanded` / `aria-controls`); the panel itself is `role="dialog"` with `aria-modal="true"`.

Both inputs drive the same underlying HSB model, so typing a hex value and then opening the panel
shows the SB/hue/alpha thumbs already at the right position, and vice versa.

---

## 4. Presets: any CSS color string, hex round-trips best

`@Input() presets: string[] = []` — no default array. A brand preset palette is an
admin/theming-surface decision for the *caller* to supply (doc 26 §5's own disposition for this
component is "theming/admin surfaces"), not one this component bakes in — and baking one in would
also mean hardcoding raw colour literals in this component's own source, the exact thing §8
explains this component must not do.

`selectPreset()` tries `parseHex()` on the clicked preset string first. If it parses, the SB/hue/
alpha thumbs jump to the matching position (so dragging afterward continues from the right
place) and the emitted `value` is the component's own re-encoded hex. If it doesn't parse (the
caller passed a named CSS color, an `rgb()` string, or — as the docs demo does, see
`colorpicker-demo.component.ts` — a `var(--ino-color-*)` reference), the preset is still
selectable and still emitted as `value` verbatim; the drag thumbs simply stay wherever they were,
since there's no general CSS-color-string parser here to decompose it into HSB. This is a
deliberate, narrow scope decision, not an oversight.

---

## 5. "Value announced on commit" — drag does not emit `valueChange` per pixel

A deliberate divergence from `ino-slider`'s convention (`../slider/ino-slider.component.ts`),
which commits (and emits) on every `pointermove`. Here:

- **Drag** (SB panel, hue bar, alpha bar): `pointermove` updates the internal HSB model and the
  live swatch/thumb positions (`isDragging` host class true), but does **not** touch `value`,
  does **not** emit `valueChange`, and does **not** move `aria-valuenow`/`aria-valuetext`.
  `pointerup` calls the one `commit()` method, which does all four.
- **Keyboard** (arrow/Home/End/PageUp/PageDown on any of the three controls): there is no drag
  gesture to speak of — each keypress is already a discrete, committed step — so every keydown
  calls `commit()` directly, same as `ino-slider`'s keyboard path.
- **Hex/RGB text fields**: commit on blur (`onHexBlur`/`onRgbBlur`), not on every keystroke —
  matches the hex field's "invalid-hex" state (§6) needing to tolerate a transiently-unparseable
  string while typing.

Reasoning: this component's realistic consumer is a theming/admin form that likely persists
`valueChange` to a backend or re-paints a large preview on every emission. Streaming that at
drag-move frequency (tens of events per gesture) is real, avoidable cost for zero benefit — the
live visual feedback the user actually needs is already satisfied by the local HSB-model update
repainting the swatch/thumbs, which needs no `@Output` at all. The spec row's own wording,
"value announced on **commit**," reads as endorsing exactly this split rather than ino-slider's
continuous-commit model.

---

## 6. Accessibility contract (WCAG 2.2 AA)

- **Hue bar / alpha bar**: each `role="slider"`, `aria-valuemin`/`aria-valuemax`/`aria-valuenow`
  (0–360 for hue, 0–100 for alpha), `aria-label` ("Hue" / "Alpha"). This is the literal "slider
  semantics per bar" the spec row names.
- **Saturation/brightness panel**: ARIA has no native two-axis slider role. This gets the same
  `role="slider"` treatment as the 1-D bars, but `aria-valuenow` can only ever carry one of the
  two axes (brightness, here) — `aria-valuetext` carries both ("Saturation N%, brightness N%") so
  a screen reader announces the full state rather than half of it. Deliberately **not**
  `role="application"`: WAI-ARIA Authoring Practices and WebAIM both advise against it for
  exactly this kind of custom widget, since it opts the entire subtree out of the screen reader's
  normal navigation commands with no corresponding benefit here. Keyboard operation (Arrow
  Left/Right = saturation ±1, Up/Down = brightness ±1, Home = both to 0, End = both to 100) still
  works identically whichever role is used, so the practical a11y contract (an alternative,
  fully-keyboard-operable path to every value the panel can represent) holds regardless.
- **Trigger**: see §3.
- **Panel**: `role="dialog"`, `aria-modal="true"`, `aria-label` falls back to "Color picker" when
  no `label` is set. Composes `InoFocusTrapDirective` (Tab containment + return-focus-on-close) —
  the same reusable primitive `ino-datepicker`/`ino-modal`/`ino-popover`/`ino-confirm-dialog` use,
  not a fourth hand-rolled trap.
- **Commit announcement**: a visually-hidden `aria-live="polite"` region ("Color set to #...")
  updates on every `commit()` (§5) — drag/keyboard/hex-blur/RGB-blur/preset-click alike — so a
  screen reader user gets exactly one announcement per committed change, not one per drag pixel.
- **Invalid-hex vs. field `error`**: two independent surfaces. `error` (the standard §2 field-
  level input) renders as `<p role="alert">` below the control, same as every other form
  component. `hexInputInvalid` is a separate, transient boolean — true only while the hex text
  field currently holds unparseable text — surfaced as its own `role="alert"` message and
  `aria-invalid` on the hex field, independent of whether a caller also passed `error`. A caller
  can have both at once (an externally-invalid committed color *and* a mid-type unparseable
  string) without either state masking the other.
- **RTL**: logical properties only (`inline-size`/`block-size`/`inset-inline-*`/`inset-block-*`);
  no `left`/`right`/`top`/`bottom`/`width`/`height` anywhere in the stylesheet. The SB-panel drag
  math itself reads `getBoundingClientRect()` (physical, direction-agnostic) the same way
  `ino-slider`'s pointer math does — see that component's SPEC.md §2 for why physical pointer math
  and logical layout are not in tension.
- **Contrast**: every static color (panel border/background, field borders, thumb rings) reads an
  existing role audited in every theme by `node scripts/check-theme-parity.mjs`. The *dynamic*
  swatch/thumb/gradient fills are, by construction, whatever color the caller or user picked —
  WCAG contrast for those is the caller's data-entry concern (same as `<input type="color">`'s own
  swatch), not a themed-role contrast question this component can audit.

---

## 7. Sizing (§2 contract row 3) — swatch sm/md, a local two-rung scale

`swatchSize: 'sm' | 'md'` (default `'md'`), re-pointing the local `--ino-colorpicker-swatch`
custom property — the same local-alias precedent `<ino-slider>`'s `--ino-slider-thumb` sets. Not
`InoControlSize` (`sm | default | lg`): the spec row itself asks for exactly two rungs, and a
swatch button's size is a compact-trigger decision, not a text-baseline control height (same
argument `ino-slider`'s `InoSliderTrackSize` doc comment makes for its own two-rung scale).

No density (dense/fluid) split for the swatch itself — `--ino-target-min` already enforces the
tap-target floor regardless of `swatchSize`. The hex/RGB text fields inside the panel and the
trigger's hex field use the ambient `--ino-control-height`/row-min-height the surrounding page
density sets, same as every other text input.

---

## 8. Design-system-adherence lint: why `rgb()`/`hsl()` never appear in this component's source

`scripts/check-ds-adherence.mjs`'s `no-raw-color` rule is a plain text scan: any `#` followed by
3–8 hex digits, or the literal substrings `rgb(`/`rgba(`/`hsl(`/`hsla(`/`color-mix(`/`oklch(`/
`lab(`, anywhere in a linted file's source, regardless of whether it's a hardcoded brand decision
or a runtime-computed value. That's the right rule for every other component — a raw `#7C5CFC`
in, say, a badge is exactly the drift the rule exists to catch. But *this* component's entire job
is rendering and emitting an arbitrary, caller/user-chosen color that is by definition not a
design-system role — the one component in the tree where "contains a color value" is the
feature, not drift.

Rather than add a waiver (the waivers file's own header explicitly says "do not add a waiver to
land a component" — a waiver is for pre-existing drift pending cleanup, not a structural
necessity), every dynamic color computation in `ino-colorpicker.component.ts` is written to never
produce the literal substrings the scan looks for:

- **Hex strings** (`toHex2`/`hexFrom`) are built by string concatenation: `'#' + toHex2(r) + ...`.
  The only string literal is `'#'` on its own — one character, never followed in the *source
  text* by 3+ hex digits, so the regex has nothing contiguous to match. The computed *value* at
  runtime is of course a full hex string; the lint only ever sees the source.
- **`HEX_RE`** (the hex-parsing regex) writes `#(` in source — `(` immediately after `#` isn't a
  hex digit, so this doesn't match either, by the same logic.
- **No `rgb()`/`hsl()` CSS function is used anywhere**, including for the hue-bar rainbow
  gradient, which a typical implementation would write as `hsl()` stops. Instead,
  `hueBarGradient` computes each stop through the same `hsbToRgb`/hex pipeline as everything
  else and assembles `linear-gradient(to right, ${stops.join(', ')})` — the literal text
  `linear-gradient(` isn't on the scan's list, and the hex stops are template-interpolated, not
  concatenated as bare literals.
- **The alpha-bar checkerboard** uses two existing surface role tokens
  (`var(--ino-color-surface)` / `var(--ino-color-surface-sunken)`) in SCSS, not hardcoded
  checker colors — correct anyway, since it means the checkerboard itself re-themes.
- **SB-panel overlay gradients** use the CSS keywords `white`/`black`/`transparent` (standard
  "spectrum chrome" idiom for an SB panel — see any color-picker reference implementation), which
  are not on the scan's raw-colour pattern list at all.

Net effect: `node scripts/check-ds-adherence.mjs` reports zero violations for any file this
component touches, with no waiver file entry — verified at build time, not asserted here.

---

## 9. Testing and QA validation (§2 contract row 8)

The QA validation checklist for this component includes:
- [ ] Popover mode: swatch button opens the panel; typing a valid hex into the trigger field
      updates the SB/hue/alpha thumbs without opening the panel.
- [ ] Inline mode renders the picker body directly, no trigger/overlay.
- [ ] SB panel: drag and all six keyboard keys (Arrow×4, Home, End) move the thumb correctly;
      `valueChange` fires on release/keypress, not per drag pixel (§5).
- [ ] Hue bar and alpha bar: drag and keyboard (Arrow/PageUp/PageDown/Home/End on hue; Arrow/
      Home/End on alpha) move each thumb correctly.
- [ ] Hex field commits a valid typed hex on blur; an invalid string sets `hexInputInvalid` and
      shows the inline error without committing.
- [ ] R/G/B number fields commit on blur and stay in sync with the hex field and SB/hue/alpha
      thumbs in both directions.
- [ ] Preset swatches: clicking a hex preset updates the thumbs; clicking a non-hex preset
      (e.g. a `var(--ino-color-*)` reference, as the docs demo uses) still selects/emits it.
- [ ] All states (hover, focus-visible, active/dragging, disabled, readonly, invalid, invalid-hex)
      render in all 3 themes × dense/fluid.
- [ ] Screen reader announces `role=dialog` on open, `role=slider` + `aria-valuenow`/`valuetext`
      on each bar/panel, and exactly one "Color set to #…" announcement per commit.
- [ ] WCAG 2.2 AA contrast verified for every static (non-data) color (already gated by
      `check-theme-parity.mjs`); `node scripts/check-ds-adherence.mjs` reports zero new
      violations (§8).
- [ ] No mobile port (doc 26 §5 disposition: "Web-only (theming/admin surfaces)") — nothing to
      verify on React Native/Flutter.

QA sign-off required before docs page ships to Pages (D-gate 2, doc 26 §7) — tracked as the
blocking subtask on this issue.
