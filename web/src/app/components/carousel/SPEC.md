# `<ino-carousel>` / `<ino-carousel-item>` — component spec

**Issue:** INO-483 (INO-31 B5, doc 26 §5 row — `ino-carousel`). Spec seed: horizontal/vertical;
N visible + step; autoplay opt-in; circular; indicators + prev/next; states playing/paused +
at-bounds; sizing item-gap scales; labels "x of n"; APG carousel a11y; **Port both**.

Parity benchmark: PrimeNG 22.1.1 `Carousel` (`specs/primeng/llms-22.1.1.txt` line 39,
`https://primeng.dev/carousel`). PrimeNG is a benchmark, not a runtime dependency — nothing here
installs it ([[inovixux-primeng-is-a-runtime-dependency]]).

This file records the decisions the DoD/§2 contract requires to be written down rather than
silently made.

---

## 1. Container/leaf split, index-based and controlled-only (same precedent as `ino-tabs`)

`<ino-carousel>` is the container; `<ino-carousel-item>` is a dumb leaf holding one slide's
content, content-projected as a direct child — same split `ino-tabs`/`ino-tab-panel` and
`ino-meter-group`/`InoMeterItem` already use for composite components, for the same reason: the
container is the single owner of "which slide(s) are visible," and the leaf has no selection
logic of its own.

Selection is **index-based** (`startIndex` — the index of the first currently-visible item), not
id-based, matching `ino-tabs` SPEC.md §2's reasoning: no consumer needs slide identity to survive
a reorder, and the mobile ports below are controlled-only index-based by their own design, so an
id layer here would be a second source of truth with no consumer.

**Controlled/uncontrolled** follows the `ino-tabs` precedent: bind `[activeIndex]` +
`(activeIndexChange)` for a controlled carousel; omit `activeIndex` for uncontrolled mode, where
the component owns `startIndex` internally starting at 0.

---

## 2. "N visible + step" is a sliding window, not a page grid

`visibleCount` (how many `<ino-carousel-item>`s are visible at once) and `step` (how many slides
`next()`/`prev()` advance by) are independent inputs. `visibleCount=3, step=1` is a classic
"peek" carousel; `visibleCount=1, step=1` is the simple one-slide-at-a-time case the APG example
covers. This is a sliding window over `startIndex`, not a paginated grid — `maxStart` is
`items.length - visibleCount`, clamped to `0`, and `next()`/`prev()` move `startIndex` by `step`
within `[0, maxStart]` (or wrap, if `circular`).

Off-window items are hidden via the same `[hidden]` idiom `ino-tab-panel` uses for its inactive
panel — not a CSS transform/clip — so they are simultaneously invisible, unfocusable, and
unreachable by assistive tech. This keeps the accessibility surface exactly as large as the
visible window at every instant, at the cost of no slide-transition animation; see §5.

**Indicators are `step`-grid stops, not one-per-item.** With `visibleCount=3, step=1` over 10
items there are 8 reachable `startIndex` values (0..7) — one indicator per *reachable stop*,
not one per slide, because one-per-slide would imply 10 indicators for a 3-wide window where only
8 positions are ever distinct. The last stop is always included even when it falls off the
`step` grid (e.g. `step=3` over 10 items with `visibleCount=1`: stops are `0,3,6,9` — 9 already
lands on the grid, but if it didn't, it would still be appended), so every item is always
reachable by exactly one indicator.

---

## 3. Autoplay is opt-in, pauses itself at a non-circular bound, and never starts under
   reduced motion

`autoplay` defaults to `false` (spec seed: "autoplay opt-in"). When `true` the component starts
a `setInterval(autoplayInterval)` timer in `ngAfterContentInit`, **unless**
`prefers-reduced-motion: reduce` — reduced motion wins outright; autoplay never starts, matching
the APG carousel pattern's requirement and the same `matchMedia` idiom `ino-tabs` uses for its
own scroll-behavior branch (`ino-tabs.component.ts`, `prefersReducedMotion()`).

**At-bounds auto-pause.** If `circular` is `false` and the timer's own `next()` would run past
`maxStart`, the component pauses itself instead of silently idling forever on the last slide with
a "Pause" affordance that has nothing left to advance. This is the `at-bounds` state the spec seed
calls out, reached from `playing` without any user action. `circular=true` never hits this path —
the timer just wraps.

**The pause control is always visible when `autoplay` is on**, never hidden behind hover/focus —
the APG carousel pattern requires a visible mechanism to stop rotation regardless of whether a
screen-reader or low-vision user can trigger hover at all.

---

## 4. Sizing: item gap scales, nothing else does

The spec seed's only sizing axis is "item gap scales." `size: InoControlSize = 'sm' | 'default' |
'lg'` maps straight onto the existing `--ino-control-gap-{size}` tokens (already defined in
`tokens.css` §... for exactly this purpose — see `ino-tabs.component.scss`'s identical
`--ino-control-gap` custom-property pattern) and nothing else on the component changes size. Nav
buttons and indicators use fixed dimensions (`--ino-target-min`-floored) regardless of `size` —
there is no spec requirement for a second size axis on the chrome, and inventing one would be a
new primitive for no named need.

Density (dense/fluid) is the existing global `[data-density]` cascade, not a component input —
same "no second density axis" decision `ino-toolbar`'s SPEC/docs page already made
([[inovixux-dense-floor-equal-heights-is-correct]] for why dense floors, not shrinks, below the
32px row).

---

## 5. A11y: APG carousel, with the off-window items genuinely removed rather than just hidden

- `role="region"` + `aria-roledescription="carousel"` + `aria-label` on the host — the exact
  triple the APG carousel pattern specifies, because `role="region"` alone has no generic
  "carousel" semantics for AT to announce.
- Each `<ino-carousel-item>` is `role="group"` + `aria-roledescription="slide"` +
  `aria-label="{n} of {total}"` (optionally prefixed with an author-supplied `label`) — the
  spec seed's "slide labels (x of n)" requirement, worded exactly as the APG example's own slide
  labels.
- A visually-hidden live region announces the visible range ("Slides 2-4 of 10"). Its
  `aria-live` is **`off` while `playing`, `polite` otherwise** — the APG pattern's own guidance:
  a live announcement on every autoplay tick would be a new interruption every
  `autoplayInterval`, so the region only speaks when the carousel is under manual control.
- **Reduced motion stops autoplay** (§3) is listed in the DoD a11y column and implemented as a
  hard gate, not a CSS-only transition suppression, because the thing reduced-motion users need
  stopped here is unattended *content change*, not just an animation.
- Keyboard: `ArrowLeft`/`ArrowRight` (`ArrowUp`/`ArrowDown` when `orientation="vertical"`) move
  by `step` from a single tab stop on the track (not roving tabindex across items — the visible
  window, not an individual slide, is what keyboard navigation moves); `Home`/`End` jump to the
  first/last reachable `startIndex`. RTL flips `ArrowLeft`/`ArrowRight` exactly like `ino-tabs`'s
  `onKeydown` does, reusing the same `getComputedStyle(...).direction === 'rtl'` check.

---

## 6. Mobile parity: Port both, controlled-only index-based, no autoplay-timer drift

React Native (`InoCarousel.tsx`) and Flutter (`ino_carousel.dart`) are both **controlled-only** —
the host app owns `activeIndex`/`startIndex` state and passes it back in, exactly like
`InoTabs.tsx`/`ino_tabs.dart` are controlled-only by their own design (`ino-tabs` SPEC.md §2). An
uncontrolled internal fallback on mobile would be a second, platform-specific source of truth for
"which slide is showing," and the web component already has to support a `[activeIndex]`-bound
controlled mode, so the controlled contract is shared, not invented twice.

Autoplay on mobile is driven by the **host app's own timer** calling back into the port's
`onNext`/`activeIndexChange`, not a timer owned by the port — avoiding a JS/Dart `setInterval`
running against a view that may already be unmounted (RN) or disposed (Flutter) with no shared
lifecycle hook as clean as Angular's `ngOnDestroy`. Both ports still expose `circular` and render
the same prev/next/indicator/pause-affordance surface; they simply don't start a timer themselves.
