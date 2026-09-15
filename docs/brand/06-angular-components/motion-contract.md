# Motion contract — named tokens + `prefers-reduced-motion`

> Wave 0, INO-127. Closes **N-7**. Not a new token layer — `tokens.css` §9 (`--ino-motion-duration-*`
> / `--ino-motion-easing-*`) already existed and every component already consumed it; the gap this
> issue closed was `prefers-reduced-motion` coverage, and this doc is the pattern Wave 2 inherits
> instead of re-deriving it per component.
> Visual specimen: **INO-117** renders every duration/easing pair and both reduced-motion patterns
> below as something you can actually watch — this doc is the written contract, INO-117 is the demo.
> Source of truth for duration/easing values is always `tokens.css` §9, never this file.

## 1 — The tokens (unchanged, frozen after Wave 0)

```css
--ino-motion-duration-fast: 120ms;
--ino-motion-duration-base: 200ms;
--ino-motion-duration-slow: 480ms;
--ino-motion-duration-countup: 900ms;
--ino-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
--ino-motion-easing-decelerate: cubic-bezier(0, 0, 0, 1);
--ino-motion-easing-accelerate: cubic-bezier(0.3, 0, 1, 1);
```

Every `transition:`/`animation:` declaration in `web/src/app/components/**` must resolve duration
and easing through these — never a raw `Nms` or `cubic-bezier(...)` literal. As of this issue, that
was already true everywhere (a repo-wide grep for hardcoded motion values against the component tree
returned zero hits); `scripts/check-ds-adherence.mjs`'s `non-token-duration` rule is the ongoing
lint that keeps it that way.

## 2 — Three implementation patterns, by motion shape

There is no single `@media (prefers-reduced-motion: …)` snippet that fits every case — the right
pattern depends on whether the motion is *state feedback* (something has to change either way) or
*decoration* (nice to have, safe to skip entirely). Picking the wrong one either leaves motion running
under `reduce`, or — worse — leaves a control with no visible state change at all once motion is
stripped.

### Pattern A — state-feedback transition (hover/active/focus colour or border change)

The transition exists to make an already-instant state change (hover, active, focus) feel less
abrupt. Under `reduce` the state change must still happen — only the easing is removed, not the
state. Declare the transition normally, then null it in a `reduce` block at the end of the file:

```scss
.ino-field__control {
  transition: border-color var(--ino-motion-duration-fast) var(--ino-motion-easing-standard);
}

@media (prefers-reduced-motion: reduce) {
  .ino-field__control {
    transition: none;
  }
}
```

Used by: `ino-alert` (`.ino-alert__dismiss`), `ino-input` / `ino-select` (`.ino-field__control`),
`ino-nav` (`.ino-nav__links a`, `.ino-nav__theme-toggle`, `.btn.primary`), `ino-toggle`
(`.ino-toggle__track`, `.ino-toggle__thumb`), `ino-tag` (base opacity/background transition).

Do **not** reuse this pattern to null a `transform` used for hover lift/press feedback where the
component has a separate resting state that reads fine without it — that's Pattern B.

### Pattern B — decorative or entrance/exit animation (opt-in under `no-preference`)

Spinners, hover lifts, fades, rises, and shimmer are additive: the component is fully legible and
usable with zero motion. Rather than writing the animation and then trying to cancel it under
`reduce`, gate the whole declaration inside `@media (prefers-reduced-motion: no-preference)` so
`reduce` users get the resting state by default — nothing to override, nothing to forget:

```scss
@media (prefers-reduced-motion: no-preference) {
  .ino-card:hover {
    transform: translateY(-2px);
  }
}
```

Used by: `ino-button` (hover/active lift transform, loading spinner), `ino-card` (hover/active
`translateY` lift only — its `border-color`/`box-shadow` transition is not gated, since removing an
in-progress visual property change entirely would be a worse experience than an instant one),
`ino-modal` (scrim fade + panel rise `@keyframes`), `ino-tag` (loading spinner), `ino-toast-container`
(enter/exit `@keyframes` — see `alert.md` §Motion for the full writeup, including why
`animate.enter`/`animate.leave` still remove the element promptly with no animation registered),
`ino-virtual-scroller` (skeleton shimmer).

### Pattern C — JS-driven motion (rAF loops, programmatic scroll)

Anything driven from TypeScript rather than pure CSS must check the media query itself before
starting motion, and take the instant path if it matches:

```ts
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) {
  // jump straight to the end state — no rAF loop, no smooth scroll
}
```

Used by: `CountUpDirective` (`web/src/app/directives/count-up.directive.ts`, consumed by
`ino-metric-panel`) — jumps straight to `target` instead of running the rAF count-up; `ino-virtual-scroller`'s
`resolveBehavior()` — returns `'auto'` instead of `'smooth'` for programmatic `scrollToIndex`, since a
smooth *programmatic* scroll is still vestibular motion even though it's JS-triggered, not CSS.

## 3 — Components with no motion surface

`ino-checkbox`, `ino-radio-group`, `ino-feature-grid`, `ino-footer`, `ino-tier-card`, and
`ino-focus-trap` declare no `transition`/`animation`/`@keyframes` and have no JS-driven motion —
there is nothing to gate, and adding a no-op media query to a component with no motion would be
dead code. This is a verified absence (grepped), not an oversight.

## 4 — What Wave 2 inherits

A new component with a hover/focus/active colour or border transition uses **Pattern A** verbatim —
copy the two blocks above, swap the selector. A new component with an entrance/exit animation,
loading spinner, or any `@keyframes` uses **Pattern B** — wrap the whole declaration in
`no-preference`, don't write-then-cancel. A new component with rAF or programmatic-scroll motion in
its `.ts` uses **Pattern C**. If a component's motion doesn't fit any of the three, that's a signal
to raise it against this doc rather than inventing a fourth pattern silently.

`web/src/tokens.css` stays frozen: nothing above requires a new token. If a genuinely new
duration/easing value is needed, that's a Wave 0 amendment against INO-31, not something to add
inline in a component.
