# `<ino-image>` — Image

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5 row
> `ino-image` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-487](/INO/issues/INO-487).
> Parity benchmark: PrimeNG 22.1.1 `Image` (`specs/primeng/llms-22.1.1.txt`,
> `https://primeng.dev/image`) — PrimeNG is a benchmark, **not a runtime dependency**; nothing
> here imports it.
> Decisions record: `web/src/app/components/image/SPEC.md`.

A lazy-loaded `<figure>`/`<img>` with a loading placeholder, an error-fallback slot, an optional
caption, and an internal click-to-open lightbox with zoom/rotate. Ports to React Native and
Flutter (base render only — the lightbox is web-only).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | `''` | Image URL |
| `alt` | `string` | `''` | Required accessible name — see [Labels](#labels) |
| `fit` | `'cover' \| 'contain' \| 'fill' \| 'none' \| 'scale-down'` | `'cover'` | Applied only when `width`/`height` constrain the box — see [Sizing](#sizing) |
| `width` | `string` | `''` | CSS length, e.g. `'320px'`/`'100%'`. Unset: intrinsic sizing |
| `height` | `string` | `''` | CSS length override, independent of `width` |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | Native `loading` attribute |
| `previewable` | `boolean` | `true` | Enables the click-to-open lightbox — see [Preview lightbox](#preview-lightbox) |

| Output | Payload | Fires when |
|---|---|---|
| `opened` | `void` | The lightbox opens |
| `closed` | `void` | The lightbox closes |

Content projection: `[fallback]` (shown when `src` is empty or the image fails to load — a
built-in glyph fills the gap when nothing is projected) and `[caption]` (rendered as a
`<figcaption>`, hidden automatically when nothing is projected). Full reasoning: `SPEC.md` §1/§4.

---

## Variants / Structure

A `<figure>` wraps the frame (clickable when `previewable`) and an optional caption. The frame
holds, in priority order:

1. The `<img>` itself, once `src` is set and hasn't failed.
2. An `ino-skeleton` (`shape="rectangle"`) loading placeholder, shown until the native `(load)`
   event fires.
3. The `[fallback]` slot (or a built-in "broken image" glyph) — shown when `src` is empty or the
   image fails to load.

Full reasoning: `SPEC.md` §1.

---

## Sizing

Two modes (doc 26 §5 row: "intrinsic + fit modes"), switched on whether `width`/`height` are set:

- **Intrinsic (default)** — the image renders at its own natural size, capped so it never
  overflows a narrow container.
- **Fit** — set `width` and/or `height`; the image fills that box and `fit` (the native
  `object-fit` keyword set) governs how its aspect ratio reconciles with it.

No `dense`/`fluid` split — an image's box is a caller-chosen content decision, not a row-height
one. Full reasoning: `SPEC.md` §3.

---

## Labels

`alt` is required (doc 26 §5 row: "`alt` required") — carries the `<img>`'s accessible name, the
lightbox dialog's `aria-label`, and the fallback glyph's `aria-label` when shown. `[caption]` is
an optional projected slot rendered as a `<figcaption>` beneath the frame. No required-marker/
help-text/error-text axis — not a form control. Full reasoning: `SPEC.md` §4.

---

## Preview lightbox

Doc 26 §5's own "preview-on-click lightbox (zoom/rotate)" row. Clicking (or Enter/Space on) the
frame opens an internal dialog when `previewable` is `true` (default) and there is a usable image
to show:

- **Zoom** — `1x` (fit) to `4x`, in `0.5` steps.
- **Rotate** — `90°` steps, either direction.
- **Reset** — returns to `1x`/`0°`.

`opened`/`closed` outputs fire on open/close, for callers that want to pause other activity (e.g.
a carousel) while the preview is open. Full reasoning: `SPEC.md` §5.

---

## States

Doc 26 §5 names three states on top of the §2 standard set (`SPEC.md` §2 for the full carried/N-A
breakdown):

- **`loading`** — `src` set, not yet loaded: an `ino-skeleton` overlays the frame.
- **`error-fallback`** — doc 26's own named state; the native `<img>` `(error)` event swaps in
  the `[fallback]` slot/built-in glyph.
- **`zoomed`** — doc 26's own named state, scoped to the lightbox (`zoom() > 1x`).

Exposed as `[data-state]` on the host (`default`/`loading`/`error-fallback`/`zoomed`) for
visual-regression tooling, the same convention `ino-avatar`'s `[data-shape]`/`[data-size]` host
attributes already use.

---

## Accessibility contract

- **Lightbox = dialog** (doc 26 §5's own a11y row) — `role="dialog"` + `aria-modal="true"` +
  `aria-label` (from `alt`), with `[inoFocusTrap]` containing Tab/Shift+Tab, same primitive
  `ino-modal` uses.
- **Zoom keys, documented** (doc 26 §5's own a11y row):

  | Key | Action |
  |---|---|
  | `Escape` | Close the lightbox |
  | `+` / `=` | Zoom in |
  | `-` / `_` | Zoom out |
  | `0` | Reset zoom + rotation |
  | `r` | Rotate clockwise |
  | `R` | Rotate counter-clockwise |

- **Trigger button** — `aria-label="Open full-size preview: {alt}"`; the image inside it is not
  independently labeled, avoiding a double announcement.
- **Fallback slot** — `role="img"` + `aria-label` (`alt`, falling back to `'Image unavailable'`).
- **Contrast** — every colour is an existing role audited in every theme by
  `node scripts/check-theme-parity.mjs`.

Full reasoning: `SPEC.md` §6.

---

## Deliberate omissions

**No reserved loading-state space in intrinsic mode.** The `loading` skeleton only has a box to
paint when `width`/`height` are set — in intrinsic mode the frame has no rendered size until the
image loads. Callers that want a reserved-space loading state set `width`/`height`. Full
reasoning: `SPEC.md` §3.

**No automatic initials/placeholder derivation.** Unlike `ino-avatar`, there is no secondary
content form besides the projected `[fallback]`/built-in glyph — a photo has no "initials"
equivalent.

---

## Mobile parity

**Port both — base render only, lightbox web-only** (doc 26 §5 row).

- **Capacitor**: not a separate port — the same Angular component/CSS render inside the
  Capacitor WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native**: `mobile/react-native/src/components/InoImage.tsx` — loading placeholder,
  error-fallback, caption, intrinsic/fit sizing. No lightbox (no RN focus-trap primitive in this
  codebase, and the spec row scopes it to web).
- **Flutter**: `mobile/flutter/lib/widgets/ino_image.dart` — same base-render-only scope.

Full reasoning: `SPEC.md` §8.
