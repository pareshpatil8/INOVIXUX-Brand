# `<ino-galleria>` — image gallery component

**Issue:** [INO-485](/INO/issues/INO-485) (INO-31 Phase B5, doc 26 §5 row)

Image gallery with thumbnail strip, fullscreen mode, autoplay, and captions. Built for photo galleries, product image showcases, and visual media presentation.

---

## Overview

`<ino-galleria>` renders a main stage area with optional thumbnail strip, indicator dots, and fullscreen dialog. Navigate via keyboard (Arrow keys, Home, End), thumbnails, or indicators. Autoplay pauses at the last image (non-circular).

APG carousel semantics; fullscreen dialog opens with Esc to close.

---

## Import

```typescript
import { InoGalleriaComponent, InoGalleriaItemComponent } from '@inovixux/components';
```

---

## Basic usage

```html
<ino-galleria ariaLabel="Gallery">
  <ino-galleria-item
    src="image1.jpg"
    alt="Image 1"
    caption="First image"
  >
  </ino-galleria-item>
  <ino-galleria-item
    src="image2.jpg"
    alt="Image 2"
    caption="Second image"
  >
  </ino-galleria-item>
</ino-galleria>
```

---

## Variants

### Fullscreen gallery

The gallery includes a built-in fullscreen button that opens the current image in a fixed-position dialog overlay. Press Esc or click the close button to exit fullscreen.

```html
<ino-galleria [showFullscreen]="true">
  <!-- items -->
</ino-galleria>
```

### Autoplay

Enable automatic image cycling with `[autoplay]` and control the interval with `[autoplayInterval]` (milliseconds).

```html
<ino-galleria [autoplay]="true" [autoplayInterval]="5000">
  <!-- items -->
</ino-galleria>
```

### Custom layout

Hide thumbnails or indicators based on your layout needs.

```html
<ino-galleria
  [showThumbnails]="false"
  [showIndicators]="true"
>
  <!-- items -->
</ino-galleria>
```

---

## States

- **Default** — shows all controls, idle
- **Loading** — loading spinner overlay (set `[loading]="true"`)
- **Playing** — autoplay active, play button shows "pause"
- **Fullscreen** — fixed-position dialog with image centered

---

## Sizing

The `size` input controls the stage area's minimum height:

- **sm** — 200px (compact, embedded contexts)
- **default** — 300px (standard)
- **lg** — 500px (hero image sections)

Stage always contains the image without stretching (`object-fit: contain`); aspect-ratio mismatch results in letterboxing.

---

## Labels

- `ariaLabel` — sets the gallery's accessible name (required for landmark regions)
- Per-item `caption` — optional text overlay on the main stage
- **Count** — "Image X of Y" displayed in the caption area

---

## Accessibility

**Keyboard navigation** (APG carousel pattern):

- **Arrow Right / Arrow Left** — next/previous image (respects RTL)
- **Home / End** — jump to first/last image
- **Escape** (in fullscreen) — close the fullscreen dialog
- **Tab** — focus the stage area; subsequent Tab moves to thumbnails/indicators

**Screen reader:**

- `role="region"` with `aria-roledescription="gallery"`
- `aria-label` on the stage and fullscreen dialog
- Thumbnail strip uses `role="tablist"` / `role="tab"` semantic pattern
- Fullscreen dialog uses `role="dialog"`

**Motion:**

Autoplay respects `prefers-reduced-motion: reduce` and will not start under that preference.

---

## Notes

- **Web-first component** — no React Native or Flutter ports. Mobile apps use platform native gallery patterns.
- **Non-circular by default** — autoplay pauses at the last image; user can press Play to cycle again or navigate manually.
- **Fixed fullscreen positioning** — fullscreen overlay fills the viewport; works on all devices including mobile.

---

## Mobile disposition

Web component only. Mobile apps (React Native, Flutter) use platform native gallery patterns:

- **iOS** — `Photos` / `PHPickerViewController` / SwiftUI `PhotosUI`
- **Android** — Gallery app / Material picker
- **Flutter** — `image_picker` + platform-native gallery

---

## Component Publish Contract checklist

- [ ] **Variants** — All variants (thumbnail strip, fullscreen, autoplay opt-in, indicators) demonstrated with live code
- [ ] **States** — Default, loading, playing, fullscreen demonstrated in all 3 themes
- [ ] **Sizing** — sm/default/lg stage scales, dense/fluid density variants demonstrated
- [ ] **Labels** — Captions, counts, aria-label demonstrated
- [ ] **A11y** — Keyboard table (Arrow/Home/End/Esc), APG carousel roles, fullscreen dialog semantics documented, WCAG 2.2 AA contrast verified
- [ ] **Notes** — Deliberate omissions (non-circular, mobile disposition), PrimeNG mapping, mobile notes formatted and visible
- [ ] **Mobile** — Disposition documented (web-first; native gallery on mobile)
- [ ] **QA sign-off** — QA validation checklist + evidence comment on the component issue before publishing

---

## Related components

- **`<ino-carousel>`** — horizontal/vertical carousel with N-visible sliding window (INO-483)
- **`<ino-image>`** — individual image with lightbox zoom (INO-?, B5)
