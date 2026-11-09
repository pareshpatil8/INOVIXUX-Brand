# `<ino-imagecompare>` — component spec

**Issue:** INO-489 (INO-31 B5, doc 26 §5 row "ino-imagecompare")
**Parity benchmark:** PrimeNG does not ship an image-compare widget (no `p-imagecompare`); the
closest public reference is the generic "before/after slider" pattern (e.g. `img-comparison-
slider`). Not a runtime dependency — the same stance every SPEC in this library records.
**Spec seed (doc 26 §5):** before/after slider handle; horizontal/vertical. States (+ §2
standard set): dragging, at-bounds. Sizing: container scales. Labels: side labels. A11y:
`role=slider` on handle, Arrow keys, `aria-valuetext` %. Web-only.
**Sibling:** `<ino-slider>` (INO-408) for the pointer-capture drag + APG-slider keyboard
pattern this component reuses almost verbatim, scoped to a single thumb.

This file records the decisions the §2 contract requires to be written down rather than silently
made.

---

## 1. Anatomy

```
ino-imagecompare (host)              container-scales — no intrinsic size of its own (§3)
└── div.ino-imagecompare__frame      position: relative, overflow hidden — the clip viewport
    ├── img.ino-imagecompare__img--after    full-bleed background layer, aria-hidden
    ├── div.ino-imagecompare__clip          absolute, clipped to value% along the active axis
    │   └── img.ino-imagecompare__img--before  same full-bleed image, aria-hidden
    ├── span.ino-imagecompare__label--before   fixed corner caption (beforeLabel)
    ├── span.ino-imagecompare__label--after    fixed corner caption (afterLabel)
    └── div.ino-imagecompare__handle     role=slider, tabindex=0, positioned at value%
        └── span.ino-imagecompare__grip  visual grip glyph, aria-hidden
```

Both `<img>` elements are `aria-hidden` — the handle's `role="slider"` + `aria-valuetext` is the
one accessible description of the comparison state (§5), the same "decorative layering, one
accessible surface" split `<ino-slider>`'s own track/fill decorations use. A sighted user's two
*captions* (`beforeLabel`/`afterLabel`) are real visible text, not duplicated into ARIA, since a
screen-reader user already gets the equivalent information from `aria-valuetext` (e.g. "62%
before shown") without a second announcement path to keep in sync.

## 2. Value model: `value` is "percent of **before** shown"

`value: number` (0–100, default `50`), one-way-bindable with `valueChange` — the same plain-
number two-way-bindable shape `<ino-slider>` uses in single-thumb mode, not a
`ControlValueAccessor`: an image-compare handle position is a view-state slider, not a form
field (same exemption `<ino-dock>`'s `activeId` SPEC.md §8 reasoning records for its own
read/write split, here applied to a plain `@Input`/`@Output` pair instead since there is no
external "current view" owner to defer to).

- `value = 0` → fully "after" visible, handle at the start edge.
- `value = 100` → fully "before" visible, handle at the end edge.
- The **before** layer is clipped to `value%` of the frame along the active axis (inline size for
  `horizontal`, block size for `vertical`) and sits on top of the full-bleed **after** layer —
  dragging the handle toward the end reveals more "before."

**At-bounds** (doc 26 §5 state) is `value <= 0 || value >= 100`, exposed as a host class
(`ino-imagecompare--at-bounds`) and mirrored by the native `aria-valuemin`/`aria-valuemax` clamp
a screen reader already reports at the extremes — no separate ARIA needed.

## 3. Sizing: "container scales" — no `sm`/`md`/`lg` axis

The doc 26 row's sizing cell is literally "container scales," not a rung scale like every form
control's `InoControlSize`. The host is `position: relative; display: block; inline-size: 100%`
and takes its block-size from `aspect-ratio` (`@Input() aspectRatio = '16 / 9'`, a CSS
`aspect-ratio` value) unless the consumer overrides block-size directly (e.g. a fixed-height
gallery slot) — the same "host never imposes a hard dimension, consumer's layout wins" posture
`<ino-dock>` takes toward the viewport (its SPEC.md §1), applied here to the frame's own box
instead. `aspectRatio` is a sizing nicety, not a doc-26 input: without it an unstyled host would
collapse to 0 block-size and show nothing, which is a worse default than picking one.

## 4. Orientation: `horizontal` (default) | `vertical`

- `horizontal` — handle moves along the inline axis; the before layer clips by `inline-size`;
  the handle is a full-block-size vertical bar; Arrow Left/Right (see §5) are the primary axis.
- `vertical` — handle moves along the block axis; the before layer clips by `block-size`; the
  handle is a full-inline-size horizontal bar; Arrow Up/Down are the primary axis.

Both axes use logical properties (`inset-inline-start`/`inset-block-start`,
`inline-size`/`block-size`) throughout, so `horizontal` mirrors correctly under `dir="rtl"`
(spot-checked on the docs page) without a separate RTL branch.

## 5. A11y: `role="slider"` on the handle, APG slider keyboard map

Reuses `<ino-slider>`'s single-thumb keyboard contract verbatim (SPEC.md there, §"Keyboard
contract"), scoped to one handle and one axis:

- `ArrowRight`/`ArrowUp`: `value += step`. `ArrowLeft`/`ArrowDown`: `value -= step` — **not**
  orientation-swapped (same as `<ino-slider>`: the right/up pair always increments, matching
  every other slider-shaped control in this library rather than inventing a per-orientation key
  map here).
- `PageUp`/`PageDown`: `±(step * 10)`. `Home`/`End`: jump to `0`/`100`.
- `role="slider"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` = the rounded
  `value`, `aria-orientation` = `orientation`, `aria-label` (from `ariaLabel`, default
  `'Image comparison'`), `aria-disabled`/`aria-readonly` when applicable.
- **`aria-valuetext`** carries the human-readable percent per the doc-26 row ("`aria-valuetext`
  %"): `` `${Math.round(value)}% before shown` `` — a bare `aria-valuenow="62"` would announce
  "62" with no unit; the row calls out `aria-valuetext` specifically because the number alone is
  meaningless without "before"/"shown."
- Pointer drag: `pointerdown` on the handle calls `setPointerCapture` (same idiom
  `<ino-slider>`'s thumb uses) so `pointermove`/`pointerup` keep firing off-element; `pointerdown`
  on the frame itself jumps the handle to that position (click-to-set), matching
  `<ino-slider>`'s track click.

## 6. States (§2 standard set + §5: dragging, at-bounds)

| State | Treatment |
|---|---|
| default | Handle centered (or at `value`'s position) on the clip boundary |
| hover | Handle grip background lightens (`--ino-color-surface-sunken`) |
| focus-visible | `--ino-focus-ring` ring on the handle |
| active (pressed) | Handle grip scales to 0.95× — a pressed affordance distinct from drag |
| dragging | `ino-imagecompare--dragging` host class; handle grip holds its active-scale look for the whole gesture, not just the initial press |
| at-bounds | `ino-imagecompare--at-bounds` host class when `value` is `0` or `100` — handle sits flush with the frame edge |
| disabled | `ino-imagecompare--disabled`; handle not focusable (`tabindex="-1"`), `aria-disabled="true"`, pointer/keyboard handlers no-op, 50% opacity on the handle only (images stay fully visible — disabling a comparison doesn't need to also dim the photos) |
| readonly | `ino-imagecompare--readonly`; handle stays focusable (`tabindex="0"`, `aria-readonly="true"`) but drag/keyboard commits no-op — same "focusable but inert" contract `<ino-splitter>`'s `readonly` gutters document |

Loading, invalid/error and empty are deliberate omissions (§9) — a comparison slider has no
async data source, no validity concept, and "no images provided" is a caller's content-guideline
concern (broken `<img>` renders the browser's own broken-image affordance), not a modeled
component state.

## 7. Labels (doc 26 row: "side labels")

`beforeLabel`/`afterLabel` (`string`, default `''`) render as fixed corner captions pinned to the
frame's own corners — **not** tied to the clip boundary, so they stay put and legible regardless
of where the handle currently sits (the clip boundary sweeping past a label that moved with it
would make it illegible mid-drag). `horizontal`: `beforeLabel` at the inline-start corner,
`afterLabel` at the inline-end corner. `vertical`: `beforeLabel` at the block-start corner,
`afterLabel` at the block-end corner. Both render over a semi-opaque dark scrim
(`--ino-color-surface`, alpha) so caption text stays WCAG-contrast-safe against an arbitrary
photo background in all 3 themes — the one place this component uses a fixed dark-on-light
pairing rather than a role token pair, documented here because it is a deliberate exception
rather than an oversight (§9).

## 8. Value/activation contract

Plain `@Input() value` / `@Output() valueChange`, no `ControlValueAccessor` (§2). `beforeSrc`/
`afterSrc` (`string`, required by convention, default `''`) and `beforeAlt`/`afterAlt` (`string`,
default `''`) are passed straight to the two `<img>` elements' `src`/`alt` — even though both
images are `aria-hidden` or arrange by visual overlay (`alt` still matters for the browser's own
broken-image fallback text and for non-AT tooling that reads `alt`, e.g. a text browser).

## 9. Out of scope (deliberate omissions — rendered on the docs page)

- **Mobile ports** — the §5 row is explicitly Web-only; no RN/Flutter disposition.
- **Loading/invalid/empty states** — no async source, no validity concept (§6).
- **A fixed dark scrim behind the corner labels** — the one non-token color pairing in this
  component (§7); flagged rather than silently shipped.
- **Lazy-loading / responsive `srcset`** — the doc-26 row is about the slider interaction, not
  image-loading strategy; a consumer wanting lazy-loading sets the native `loading` attribute via
  its own wrapper if it layers one on, out of this component's `@Input` surface.
- **Zoom/pan on either image** — not in the §5 row; this is a reveal slider, not an image viewer.
- **A caption for the handle itself** (e.g. a visible "%" readout) — the doc row asks for
  `aria-valuetext` (an AT-facing readout), not a sighted-user-facing one; a consumer wanting a
  visible percent badge composes it from `(valueChange)` outside the component.

## 10. Verification plan (§2 contract, point 8 evidence)

- Unit spec (`ino-imagecompare.spec.ts`): `role="slider"` + `aria-valuemin/max/now/valuetext/
  orientation` on the handle, Arrow/Page/Home/End key math (both orientations map to the same
  right/up-increments key pair per §5), pointer drag clamped to `[0, 100]`, frame click-to-set,
  `disabled` → `tabindex="-1"` + handlers no-op, `readonly` → stays focusable but commits no-op,
  `at-bounds` class at `0`/`100`, `dragging` class across the gesture.
- Docs-page QA (QALead, the point-8 gate): 3 themes × `horizontal`/`vertical` screenshots,
  keyboard-only walkthrough (Tab → handle receives focus → Arrow/Page/Home/End move it →
  `aria-valuetext` updates), pointer-drag confirmed visually, RTL spot-check on `horizontal`'s
  label corners and clip direction, corner-label contrast confirmed against a busy photo in all
  3 themes.
