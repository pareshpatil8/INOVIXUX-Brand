# `<ino-imagecompare>` — Before/after image comparison slider

> **Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 row
> "ino-imagecompare" (rev-2 amendment `a21a93c`).
> **Board approval:** `f55baa72` on INO-377.
> **Issue:** INO-489 (INO-31 Phase B5).
> **Parity benchmark:** none — PrimeNG does not ship an image-compare widget; this is a from-
> scratch build against the generic before/after reveal-slider pattern (see the decisions record).
> **Decisions record:** `web/src/app/components/imagecompare/SPEC.md`.

A single draggable handle overlays two full-bleed images and reveals one over the other as it
moves. Built as a single-thumb APG slider (`role="slider"`), reusing `<ino-slider>`'s pointer-
capture drag and keyboard contract scoped to one axis.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `beforeSrc` / `afterSrc` | `string` | `''` | The two overlaid images |
| `beforeAlt` / `afterAlt` | `string` | `''` | Passed straight through to each `<img>`'s `alt` |
| `beforeLabel` / `afterLabel` | `string` | `''` | Fixed corner captions — see Labels |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Axis the handle moves along |
| `value` | `number` (0–100) | `50` | Percent of the "before" image shown; two-way via `valueChange` |
| `step` | `number` | `1` | Arrow-key increment; `PageUp`/`PageDown` move by `step * 10` |
| `disabled` | `boolean` | `false` | Handle not focusable, drag/keyboard no-op |
| `readonly` | `boolean` | `false` | Handle stays focusable, drag/keyboard no-op |
| `ariaLabel` | `string` | `'Image comparison'` | Accessible name for the slider |
| `aspectRatio` | `string` | `'16 / 9'` | CSS `aspect-ratio` fallback while the consumer hasn't fixed the host's own block-size |

Output: `valueChange: number`.

### Variants

- **`orientation="horizontal"`** (default) — the handle is a full-height vertical bar that moves
  left/right; the before image reveals from the inline-start edge.
- **`orientation="vertical"`** — the handle is a full-width horizontal bar that moves up/down; the
  before image reveals from the top edge.
- **Sizing — "container scales"**: no `sm`/`md`/`lg` axis. The host fills the consumer's
  inline-size and falls back to `aspectRatio` for block-size unless the consumer sets one
  directly (`SPEC.md` §3).

### Structure (anatomy)

```
ino-imagecompare                     container-scales — no intrinsic size of its own
└── div.ino-imagecompare__frame      position: relative, overflow hidden
    ├── img.ino-imagecompare__img--after    full-bleed background layer, aria-hidden
    ├── img.ino-imagecompare__img--before   same full-bleed image, clip-path reveals value%, aria-hidden
    ├── span.ino-imagecompare__label--before   fixed corner caption
    ├── span.ino-imagecompare__label--after    fixed corner caption
    └── div.ino-imagecompare__handle     role=slider, tabindex, positioned at value%
        └── span.ino-imagecompare__grip  visual grip, aria-hidden
```

## States

| State | Behavior |
|---|---|
| default | Handle at `value`'s position on the clip boundary |
| hover | Handle grip background darkens to `--ino-color-surface-sunken` |
| focus-visible | `--ino-focus-ring` on the handle |
| active (pressed) | Handle grip scales to 0.95× |
| dragging | Handle grip holds the pressed look for the whole gesture; host carries `ino-imagecompare--dragging` |
| at-bounds | `value` is `0` or `100`; host carries `ino-imagecompare--at-bounds`, handle sits flush with the frame edge |
| disabled | Handle not focusable (`tabindex="-1"`), `aria-disabled="true"`, 50% opacity on the handle only — the images stay fully visible |
| readonly | Handle stays focusable (`tabindex="0"`, `aria-readonly="true"`), drag/keyboard commits no-op |

Loading, invalid/error and empty are deliberate omissions — see below.

## Labels and fields

`beforeLabel`/`afterLabel` render as fixed corner captions pinned to the frame's own corners, not
the clip boundary, so they stay legible regardless of where the handle currently sits.
`horizontal`: `beforeLabel` at the inline-start corner, `afterLabel` at the inline-end corner.
`vertical`: `beforeLabel` at the top corner, `afterLabel` at the bottom corner. Both render over a
semi-opaque dark scrim so caption text stays contrast-safe against an arbitrary photo in all 3
themes — the one deliberate non-token colour pairing in this component (`SPEC.md` §7).

## Accessibility contract

**Roles / ARIA** — `div.ino-imagecompare__handle` is `role="slider"` with `aria-valuemin="0"`,
`aria-valuemax="100"`, `aria-valuenow"` = the rounded `value`, `aria-orientation"` = `orientation`,
`aria-label` (from `ariaLabel`), and `aria-disabled`/`aria-readonly` when applicable. Both
`<img>` layers are `aria-hidden` — the handle's `aria-valuetext` is the one accessible
description of the comparison state.

**`aria-valuetext`** — `` `${value}% before shown` ``, e.g. `"62% before shown"`. A bare
`aria-valuenow="62"` would announce "62" with no unit, which is why the doc-26 row calls out
`aria-valuetext` specifically.

**Keyboard** — `ArrowRight`/`ArrowUp` increment by `step`; `ArrowLeft`/`ArrowDown` decrement
(not orientation-swapped — the right/up pair always increments, matching every other
slider-shaped control in this library). `PageUp`/`PageDown` move by `step * 10`. `Home`/`End`
jump to `0`/`100`.

**Pointer** — drag the handle (pointer capture, same idiom `<ino-slider>`'s thumb uses), or click
anywhere on the frame to jump the handle to that position.

**Contrast** — every colour except the corner-label scrim is a role token
(`--ino-color-*`, `--ino-focus-ring`), AA-guaranteed by construction in all 3 themes.

## Deliberate omissions

- **Loading/invalid/empty states** — no async data source, no validity concept for a reveal
  slider.
- **A fixed dark scrim behind the corner labels** — the one non-token colour pairing in this
  component; flagged rather than silently shipped. (`SPEC.md` §7)
- **Lazy-loading / responsive `srcset`** — out of this component's `@Input` surface; a consumer
  layering its own wrapper can add `loading="lazy"` there.
- **Zoom/pan on either image** — not in the §5 row; this is a reveal slider, not an image viewer.
- **A visible percent readout** — the doc row asks for `aria-valuetext` (AT-facing), not a
  sighted-user-facing badge; a consumer wanting one composes it from `(valueChange)`.
- **`ControlValueAccessor`** — not applicable; `value`/`valueChange` is a plain two-way-bindable
  pair, the same shape `<ino-slider>`'s single-thumb mode uses.

## Mobile parity

**Web-only by spec.** The doc 26 §5 row's mobile disposition for `ino-imagecompare` is
"Web-only": no React Native or Flutter port is planned, and none ships.
