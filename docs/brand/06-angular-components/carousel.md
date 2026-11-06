# `<ino-carousel>` — Carousel

> Built to doc 26 §2 Component Publish Contract as INO-483 (INO-31 Wave B5).
>
> Ported to React Native and Flutter (doc 26 §5 row: "Port both").

Content slider built from content-projected `<ino-carousel-item>` slides. Shows one or more
slides at a time in a sliding window, with prev/next navigation, optional indicators, optional
opt-in autoplay, and circular wraparound.

---

## Structure

```html
<ino-carousel ariaLabel="Product highlights" [visibleCount]="3" [step]="1">
  <ino-carousel-item>Slide one content</ino-carousel-item>
  <ino-carousel-item>Slide two content</ino-carousel-item>
  <ino-carousel-item>Slide three content</ino-carousel-item>
</ino-carousel>
```

`<ino-carousel>` is the container and single owner of which slides are visible; each
`<ino-carousel-item>` is a dumb leaf holding one slide's content — same container/leaf split as
`ino-tabs`/`ino-tab-panel`. See `SPEC.md` §1.

### Variants

| Variant | How | Notes |
|---|---|---|
| Horizontal (default) | `orientation="horizontal"` | Slides move along the inline axis |
| Vertical | `orientation="vertical"` | Slides move along the block axis; `ArrowUp`/`ArrowDown` replace `ArrowLeft`/`ArrowRight` |
| N visible + step | `[visibleCount]`, `[step]` | Sliding window over the projected items — `visibleCount=3, step=1` is a classic "peek" carousel; see SPEC.md §2 |
| Autoplay (opt-in) | `[autoplay]="true"`, `[autoplayInterval]` | Off by default; never starts under `prefers-reduced-motion: reduce` |
| Circular | `[circular]="true"` | `next()`/`prev()` wrap instead of stopping at the bounds |
| Indicators + prev/next | `[showIndicators]`, `[showNavigation]` | Both default to `true`; see SPEC.md §2 for how indicator stops are computed |

### Usage

Controlled/uncontrolled follows the `ino-tabs` precedent: bind `[activeIndex]` +
`(activeIndexChange)` for a controlled carousel; omit `activeIndex` for uncontrolled mode, where
the component owns its own `startIndex` starting at 0.

```html
<ino-carousel ariaLabel="Controlled" [activeIndex]="index" (activeIndexChange)="index = $event">
  <ino-carousel-item>One</ino-carousel-item>
  <ino-carousel-item>Two</ino-carousel-item>
</ino-carousel>
```

---

## API — `<ino-carousel>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `ariaLabel` | `string` | `'Carousel'` | Accessible name for the `role="region"` host |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Drives the item gap only — SPEC.md §4 |
| `visibleCount` | `number` | `1` | How many items are visible at once |
| `step` | `number` | `1` | How many items `next()`/`prev()` move by |
| `autoplay` | `boolean` | `false` | Opt-in; never starts under reduced motion |
| `autoplayInterval` | `number` | `5000` | Milliseconds between autoplay ticks |
| `circular` | `boolean` | `false` | Wrap instead of stopping at the bounds |
| `showIndicators` | `boolean` | `true` | |
| `showNavigation` | `boolean` | `true` | |
| `activeIndex` | `number` | *(uncontrolled)* | Bind for controlled mode |

| Output | Payload | Fires when |
|---|---|---|
| `activeIndexChange` | `number` | The visible window's start index changes (click, keyboard, indicator, or autoplay tick) |
| `playingChange` | `boolean` | Autoplay starts, is paused by the user, or auto-pauses at a non-circular bound |

## API — `<ino-carousel-item>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Optional name prefixed onto the generated "n of total" slide label |

---

## States

| State | Carried? | Surface |
|---|---|---|
| Default | ✅ | Visible window renders normally |
| Hover | ✅ | Nav/indicator/pause buttons darken on hover |
| Focus-visible | ✅ | `outline: var(--ino-focus-ring)` on the track, nav buttons, pause button, and indicators |
| Disabled (at-bounds) | ✅ | Prev/next disable at `startIndex === 0` / `maxStart` unless `circular` |
| Playing / paused | ✅ | `data-playing` host attribute; visible pause control toggles between ▶/⏸ |
| At-bounds | ✅ | `data-at-start` / `data-at-end` host attributes; autoplay auto-pauses at a non-circular end (SPEC.md §3) |

---

## Sizing

`size="sm" | "default" | "lg"` scales only the gap between visible items
(`--ino-control-gap-{size}`) — the one sizing axis the spec calls for (SPEC.md §4). Density
(dense/fluid) follows the global `[data-density]` cascade, not a separate input.

---

## Labels

Each slide carries an accessible "x of n" label (`aria-label="2 of 5"`, or
`"{label}, 2 of 5"` when the item has a `label`). A visually-hidden status region announces the
visible range ("Slides 2-4 of 10") — `aria-live="off"` while autoplaying, `"polite"` otherwise, so
manual navigation is announced but autoplay ticks are not (SPEC.md §5).

---

## Accessibility contract

**Role / ARIA**

- `role="region"` + `aria-roledescription="carousel"` + `aria-label` on the host — the APG
  carousel pattern's triple.
- Each `<ino-carousel-item>` is `role="group"` + `aria-roledescription="slide"` +
  `aria-label="n of total"`.
- Indicators are a `role="group"` labelled "Choose slide"; the active one carries
  `aria-current="true"`.

**Keyboard**

| Key | Action |
|---|---|
| `Tab` | Moves focus into the track (single stop), then to nav/pause/indicator buttons in DOM order |
| `ArrowRight` / `ArrowLeft` (horizontal) | Move the window forward/back by `step`; flips under RTL |
| `ArrowDown` / `ArrowUp` (vertical) | Move the window forward/back by `step` |
| `Home` / `End` | Jump to the first / last reachable stop |

**Reduced motion** — `prefers-reduced-motion: reduce` prevents autoplay from starting at all,
regardless of the `autoplay` input — not merely instant transitions. This is a hard gate read via
`matchMedia` in `ngAfterContentInit`/`play()`, the same idiom `ino-tabs` uses for its own
script-driven scroll behavior.

**Visible pause control** — whenever `autoplay` is `true`, a real, always-visible button (never
hover/focus-revealed) toggles play/pause — required by the APG carousel pattern so autoplay can
be stopped by any user regardless of pointer capability.

**Contrast** — nav/pause/indicator surfaces resolve through `--ino-color-surface-raised` /
`--ino-color-on-surface` / `--ino-color-border`, audited WCAG 2.2 AA pairs in all 3 themes
(`check-theme-parity`).

**Targets** — nav and pause buttons are `--ino-target-min` (24px) square; indicator dots are
visually 8px but their hit box is grown to the same floor via a transparent pseudo-element
(SC 2.5.8).

**RTL** — uses `padding-inline`/`inset` logical properties throughout; the ‹/› nav glyphs mirror
under `:dir(rtl)` the same way `ino-tabs`'s scroll buttons do.

---

## Deliberate omissions

- **Off-window slides are `[hidden]`, not CSS-clipped.** No slide-transition animation ships —
  switching the window swaps which items are hidden instantly. A caller that wants an animated
  slide transition is explicitly out of scope here; see SPEC.md §2 for the reasoning (the
  accessibility surface staying exactly as large as the visible window at every instant was
  judged more valuable than a transition effect).
- **Autoplay timer is Angular-owned on web, host-owned on mobile.** The mobile ports do not run
  their own timer — see Mobile parity below and SPEC.md §6.
- **Roving tabindex across individual slides** was considered and rejected: keyboard navigation
  moves the *window*, not focus between individual slide elements, matching the APG carousel
  example's own keyboard model (a carousel is not a tablist).

---

## Mobile parity

| Track | Status | Notes |
|---|---|---|
| Capacitor | Not a port | Renders the same Angular component and CSS — done the moment the web component passes. |
| React Native | Ported | `InoCarousel.tsx` — controlled-only, index-based, same `visibleCount`/`step`/`circular`/`activeIndex` surface. Autoplay is driven by the host app's own timer, not a timer owned by the component (SPEC.md §6). |
| Flutter | Ported | `ino_carousel.dart` — same controlled-only, index-based contract as the React Native port. |
