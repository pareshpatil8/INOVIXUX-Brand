# `<ino-image>` — component spec

**Issue:** INO-487 (INO-31 Phase B5)
**Parity benchmark:** PrimeNG 22.1.1 `Image` (`specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/image`). PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5
row `ino-image` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
[INO-377](/INO/issues/INO-377). Program: INO-31.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Structure: a `<figure>`, not a bare `<img>`

Doc 26 §5's row names a caption slot and an error-fallback slot — both need a container beyond
the native `<img>` itself. The template root is a `<figure>` wrapping:

1. A clickable frame (only when `previewable`) around the `<img>` — same `[icon]`/`[fallback]`
   content-projection idiom `ino-avatar` and `ino-tag` already use for optional slots.
2. A projected `[fallback]` slot, falling back to a built-in "broken image" glyph when nothing is
   projected — the same `:empty` + general-sibling CSS detection `ino-avatar__icon` already uses,
   one more instance of the same precedent rather than a new pattern.
3. A projected `[caption]` slot rendered as a `<figcaption>`, hidden via `:empty` when the caller
   doesn't project anything — no separate `hasCaption` boolean needed.

---

## 2. States: `loading` / `error-fallback` / `zoomed`, plus the §2 standard set

Doc 26 §5 names three states on top of the standard set. Carried/N-A breakdown:

| State | Carried? | Reason |
|---|---|---|
| `loading` | ✅ | `src` set, native `(load)` not yet fired — an `ino-skeleton` (`shape="rectangle"`) overlays the frame until it does. Same cross-component precedent `ino-avatar`'s SPEC.md §3 names for *not* carrying a loading state: here the row explicitly asks for one, so unlike avatar this component owns it directly rather than delegating to a caller-mounted `ino-skeleton` in sequence. |
| `error-fallback` | ✅ | Doc 26's own named state — native `<img>` `(error)` event; see §1. |
| `zoomed` | ✅ | Doc 26's own named state, scoped to the lightbox only (`zoom() > 1`) — exposed as a modifier class on the lightbox panel, not the host, since the thumbnail itself has no "zoomed" concept. |
| Default | ✅ | Loaded, not failed, lightbox closed. |
| Disabled | N/A | Not a control — nothing to disable. |
| Readonly / invalid | N/A | Not a form control — same reasoning `ino-avatar`'s SPEC.md §3. |
| Hover / active | ✅ (CSS only) | `cursor: zoom-in` on the trigger button when `previewable`; no component-level flag needed, a plain `:hover` rule. |
| Focus-visible | ✅ | The trigger button and every lightbox control button get the shared `--ino-focus-ring` treatment. |
| Empty | N/A | An image with no `src` renders the fallback slot (§1) — there is no separate "empty" rendering from "error," since both have nothing to show but the fallback. |

---

## 3. Sizing: intrinsic + fit modes, no density split

Doc 26 §5 names "intrinsic + fit modes" rather than a numbered scale. Resolved as two modes,
switched on whether a caller sets `width`/`height`:

- **Intrinsic (default)** — neither `width` nor `height` set. The frame has no explicit box;
  the `<img>` renders at its own natural size (capped by `max-inline-size: 100%` so it never
  overflows a narrow container). `fit` is bound but inert — there is no constrained box for
  `object-fit` to act on.
- **Fit (`width`/`height` set)** — the frame gets an explicit `inline-size`/`block-size` from
  whichever of the two inputs is set (CSS lengths, e.g. `'320px'`/`'100%'`), the `<img>` fills it
  100%/100%, and `fit` (`InoImageFit` — `cover`/`contain`/`fill`/`none`/`scale-down`, the native
  `object-fit` keyword set) governs how the image's own aspect ratio reconciles with the box.

No `dense`/`fluid` split: like `ino-avatar`'s diameter (SPEC.md §2), an image's box is a
caller-chosen content decision, not a row-height one, and nothing in the spec row asks for a
density-driven image size.

**Known tradeoff:** the `loading` skeleton (§2) only has a box to paint when `width`/`height` are
set — in intrinsic mode the `<img>` has no rendered size until it loads, so the frame collapses to
nothing beforehand. Fixing that would need a JS pre-fetch of the image's natural dimensions before
mount, which the spec row doesn't ask for; callers that want a reserved-space loading state set
`width`/`height` (or `ino-skeleton` ahead of mounting this component, the same two-component
sequence `ino-avatar`'s SPEC.md §3 already documents for its own declined `loading` case).

---

## 4. Labels: `alt` required, caption slot

Doc 26 §5 names `alt` required and a caption slot:

- **`alt`** — not type-enforced (same convention as `ino-avatar`'s `alt`), but an empty value is a
  contract violation a caller must fix. Carries the `<img>`'s native accessible name, and doubles
  as the lightbox dialog's `aria-label` and the fallback glyph's `aria-label` when shown.
- **`[caption]`** — projected content rendered as a `<figcaption>` below the frame; hidden via
  `:empty` when unprojected, same idiom as §1's fallback slot.

No required-marker/help-text/error-text axis — not a form control.

---

## 5. Preview-on-click lightbox

A click (or Enter/Space, since the trigger is a native `<button>`) on the frame opens an internal
dialog — doc 26 §5's own "preview-on-click lightbox (zoom/rotate)" row:

- Only mounted when `previewable` (default `true`) **and** the thumbnail has a usable image
  (`src` set, not failed) — a broken thumbnail has nothing to preview, and `previewable=false`
  lets a caller embedding this inside a context with its own larger-preview affordance (e.g. a
  table cell) opt out so the two never fight over the click.
- Zoom: `1x`–`4x` in `0.5` steps. `1x` is "fit" (never below it — zooming *out* past fit would
  shrink the image smaller than its own preview box for no reason); `4x` is the ceiling past which
  a raster photo is mostly visible noise.
- Rotate: `90°` steps, either direction, unbounded (wraps at 360°).
- `opened`/`closed` outputs — a caller that wants to pause a carousel or log an analytics event
  around the preview doesn't need to poll `lightboxOpen`.
- Body scroll is locked for the duration the lightbox is open (`document.body.style.overflow`),
  same technique `ino-modal` uses, and released in `ngOnDestroy` if the component is torn down
  mid-preview.

---

## 6. A11y contract

- **Lightbox = dialog** (doc 26 §5's own a11y row): `role="dialog"` + `aria-modal="true"` +
  `aria-label` (resolved from `alt`, falling back to `'Image preview'`) on the panel.
  `[inoFocusTrap]` contains Tab/Shift+Tab inside it, same primitive `ino-modal` uses.
- **Zoom keys, documented** (doc 26 §5's own a11y row) — the lightbox's `keydown` handler:

  | Key | Action |
  |---|---|
  | `Escape` | Close |
  | `+` / `=` | Zoom in |
  | `-` / `_` | Zoom out |
  | `0` | Reset zoom + rotation |
  | `r` | Rotate clockwise |
  | `R` (Shift+r) | Rotate counter-clockwise |

  `Escape` is handled by this component's own `keydown` listener rather than by
  `[inoFocusTrap]` — the same division of responsibility `ino-modal`'s SPEC.md records: the trap
  owns containment only, never a dismissal key, since only the dialog itself knows its own
  dismiss policy.
- **Trigger button** — `aria-label="Open full-size preview: {alt}"`; the projected `<img>` inside
  it is not independently labeled (the button carries the one accessible name a screen reader
  announces, avoiding a double announcement of the same alt text).
- **Fallback slot** — `role="img"` + `aria-label` (`alt`, falling back to `'Image unavailable'`)
  on the wrapper, so a broken/absent image still announces *something* rather than going silent.
- **Contrast** — every colour (`--ino-color-surface-sunken`, `--ino-color-on-surface-muted`,
  `--ino-color-on-surface`, `--ino-color-border`, `--ino-color-overlay-scrim`,
  `--ino-color-surface-raised`) is an existing role already audited in every theme by
  `node scripts/check-theme-parity.mjs`.
- **Target size** — the trigger button and every lightbox control button meet the existing
  `--ino-space` scale's step sizes (36px lightbox controls, well above the 24px AA floor).

---

## 7. RTL

Logical properties only throughout both stylesheets (`inline-size`/`block-size`,
`margin-block-start`, `padding-inline`, `inset`). No `left`/`right`/`top`/`bottom`/`width`/`height`
anywhere.

---

## 8. Mobile parity: port both — base render only, lightbox web-only

Per the issue row ("Port both (base render; lightbox web-only)"):

- **Capacitor**: not a separate port — the same Angular component/CSS render inside the
  Capacitor WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native**: `mobile/react-native/src/components/InoImage.tsx` — base `<Image>` render
  (loading placeholder, error-fallback, caption, intrinsic/fit sizing) only. No lightbox: RN has
  no native `role="dialog"`/focus-trap primitive of its own in this codebase (that's a web-only
  primitive, `InoFocusTrapDirective`, with no RN counterpart), and the spec row explicitly scopes
  the lightbox to web.
- **Flutter**: `mobile/flutter/lib/widgets/ino_image.dart` — same base-render-only scope, same
  reasoning.

---

## 9. `check-theme-parity.mjs` / `check-ds-adherence.mjs` — not modified

No new colour/space/radius/duration token was added — every value this component needs already
exists and is already audited across all three web themes. Nothing appended to either script's
registry/field list.

---

## 10. Verification run for this issue

| Check | Result |
|---|---|
| `ng build --configuration=development` | ✅ passes — component compiles, no new errors |
| `node scripts/generate-component-registry.mjs` | ✅ re-run — `ino-image` now in the generated registry |
| `node scripts/generate-design-system-manifest.mjs` | ✅ re-run — `ino-image` now in the manifest |
| `node scripts/check-ds-adherence.mjs` | ✅ passes — zero violations on `image/` |
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `node scripts/check-spec-citations.mjs` | ✅ passes — every citation in this file resolves |
| `node scripts/check-docs-completeness.mjs` | ✅ passes once `docs/brand/06-angular-components/image.md` + the custom demo land |
| Hardcoded colour/space/radius/duration | none — every value resolves through a token |
| `[data-theme]` branch in either component | none |
