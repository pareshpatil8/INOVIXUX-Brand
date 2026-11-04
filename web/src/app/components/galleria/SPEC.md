# `<ino-galleria>` — component spec

**Issue:** [INO-485](/INO/issues/INO-485) (INO-31 Phase B5, doc 26 §5 row `ino-galleria`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Index-based, not item-object, architecture

Like `ino-carousel`, `ino-galleria` uses index-based navigation (`activeIndex`) rather than
reference equality on item objects. This keeps the component's mental model aligned with the
thumbnail/indicator UI (both are arrays of indices 0..N), and avoids data-sync surprises if the
caller later adds/removes items or re-sorts the gallery.

Controlled (`[activeIndex]` + `(activeIndexChange)`) and uncontrolled modes both supported.

---

## 2. Thumbnails and indicators are optional, fullscreen is optional

- `showThumbnails` (default `true`): render the thumbnail strip below the stage area. Hide for
  minimal/lightbox-style galleries.
- `showIndicators` (default `true`): render the dot indicators. Hide when thumbnails are already
  visible (one is usually enough).
- `showFullscreen` (default `true`): show the fullscreen button and enable fullscreen dialog mode.
  Set `false` for embedded contexts (modals, cards) where a fullscreen overlay is not appropriate.

Each is independently toggleable so the caller can pick the right combination for their use case
(e.g., thumbnails + fullscreen, no indicators; or just indicators for a minimal carousel reuse).

---

## 3. Fullscreen mode opens a fixed-position overlay dialog with Esc to close

Fullscreen is not `fullscreen()` API or a CSS `:fullscreen` pseudo-class, but a fixed-position
overlay dialog that fills the viewport. This:
- Stays within the component's own z-index context (no z-fighting with global modals).
- Respects the focus-trap contract already established in the component's keyboard handling (Esc
  still exits the dialog; no competing browser fullscreen behavior).
- Works on mobile/touch devices where fullscreen API may not be available or expected.

The dialog is semantically marked with `role="dialog"` and `aria-label` for screen readers.

---

## 4. Captions and counts overlay the stage, not the thumbnail strip

Unlike PrimeNG's `p-galleria` (which uses captions on thumbnails), INOVIXUX `ino-galleria`
overlays caption + count at the bottom of the main stage area. This:
- Makes the active image's metadata immediately visible without looking elsewhere.
- Keeps the thumbnail strip functional and self-contained (each thumbnail is just the image, no
  layout pressure from text).
- Matches the reference gallery UX pattern (Google Photos, Unsplash, etc.).

Captions are authored by the caller via `<ino-galleria-item caption="...">`.

---

## 5. Autoplay pauses at the last image (non-circular)

Unlike `ino-carousel` (which can be circular), `ino-galleria` is non-circular by design. When
autoplay reaches the last image, it pauses automatically — the user can then press Play to cycle
again or navigate manually. This matches photo gallery expectations (you reach "the end" of the
photos).

If the caller needs circular gallery behavior, that's a future variant; it is not the default
here.

---

## 6. Loading state is a parent concern, not item-level

`[loading]` is a single boolean on the component, not per-item. When `true`, a spinner overlay
covers the stage area. The caller is responsible for deciding when the next item is loaded (e.g.,
defer setting `[activeIndex]` until the source image is known to exist, or set `loading=true`
while fetching thumbnail data).

This keeps the component simple and lets the caller use their own loading strategy (request all
at once, lazy-load per image, cache, etc.).

---

## 7. Keyboard navigation follows APG carousel pattern, extended for galleries

- **Arrow Right/Left**: next/previous image (respects RTL direction).
- **Home/End**: jump to first/last.
- **Tab**: focus moves into the stage area; once focused, Arrow keys work; Tab again exits to
  browser tabbing.
- **Escape (in fullscreen)**: close the fullscreen dialog and return focus to the fullscreen
  button.

No Enter/Space binding on indicators (click only), to avoid ambiguity with carousel-pattern
Tab-through-rows.

---

## 8. Thumbnails and indicators are tab-stops, stage is one focusable area

- `role="tablist"` on the thumbnail/indicator containers, `role="tab"` on each item.
- The stage area is `tabindex="0"` and acts as a single focusable region; keyboard nav inside it
  (Arrow keys, Home, End) does not tab to the next browser element.
- When the user Tabs away from the stage, they then tab through the thumbnail/indicator buttons,
  not through individual thumbnails as a roving-tabindex list.

This balances discoverability (the gallery is a single interactive region, not a grid of buttons)
with WCAG keyboard navigation (all controls are reachable).

---

## 9. Mobile disposition: web-first

`ino-galleria` is a web component. Mobile apps (React Native, Flutter) use platform native
gallery patterns (iOS Photos app, Android Gallery, SwiftUI PhotosUI). The web component is not
ported to mobile.

The `docs/mobile` tab on the published docs page will note this.

---

## 10. Dense/fluid density on the layout, not a second control size

Unlike sized controls (`sm`/`md`/`lg`), density changes how items are laid out:
- **dense**: thumbnails 64px, controls 36px, compact spacing. For embedded contexts (forms,
  tables, admin UIs).
- **fluid** (default): thumbnails 96px, controls 48px, generous spacing. For photo galleries,
  hero content, marketing pages.

Both densities ship in all three color themes (dark/light/high-contrast) and are gated by
`check-theme-parity`. The `size` input (`sm`/`default`/`lg`) affects the stage's minimum height
for responsive layouts.

---

## 11. Stage sizing is "stage scales," not "item scales"

Per the spec row's Sizing column ("stage scales"), the component's width and height scale with
the container and the `size` input. Individual images are never stretched (always `object-fit:
contain`), so aspect-ratio mismatch (portrait in a wide container, landscape in a tall one) is
handled gracefully — the component fills available space, the image centers with letterboxing as
needed.

This matches lightbox/gallery UX and avoids distortion.

---
