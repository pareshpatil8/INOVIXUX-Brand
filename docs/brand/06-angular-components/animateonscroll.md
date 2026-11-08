# `[inoAnimateOnScroll]` / `<ino-animateonscroll>` — AnimateOnScroll

> Parity benchmark: PrimeNG 22.1.1 `pAnimateOnScroll` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Spec seed: doc 26 §5 (B5) — "directive: enter/leave animation classes; threshold; once vs
> repeat", a11y note "`prefers-reduced-motion` disables; content never hidden pre-animation
> (CLS/SR)", mobile disposition "Web-only."
> Full Definition-of-Done disposition: `web/src/app/components/animateonscroll/SPEC.md`.

A **behaviour-only primitive**. It renders no box, no background, no border, and paints nothing of
its own — it watches its host with `IntersectionObserver` and applies caller-supplied CSS classes
when the host enters or leaves the viewport during scrolling. Every visual belongs to the caller's
enter/leave classes.

Its design centre is a deliberate inversion of the PrimeNG trade-off: `pAnimateOnScroll` pre-hides
its host (`opacity: 0`) until the first intersection, which costs a screen-reader, reader-mode,
find-in-page or SSR user the content entirely whenever the observer never fires, and makes first
paint a layout-shift hazard. This directive **never sets a style on its host**. Before the first
intersection the content is fully visible in its natural CSS state; the hiding, when it happens,
is done by the enter class's own keyframe `from` pose, for the animation's duration only.

---

## Two forms, one implementation

| Form | Use it when |
|---|---|
| `[inoAnimateOnScroll]` **directive** | You already own the element to animate — a section, a card, a figure. Preferred; this is the common case. |
| `<ino-animateonscroll>` **component** | You want to wrap a block of projected content and animate it as one unit (`display: block` host). |

The component applies the directive through `hostDirectives`, so it introduces **no wrapper node**
— the directive operates on the `<ino-animateonscroll>` host itself and the two forms cannot
drift, because there is only one implementation behind them. Same shape as `[inoAutofocus]` /
`<ino-autofocus>`.

```ts
import { InoAnimateOnScrollDirective } from './components/animateonscroll/ino-animateonscroll.directive';
// or
import { InoAnimateonscrollComponent } from './components/animateonscroll/ino-animateonscroll.component';
```

There is no barrel file; import by path, as with the other components in `web/src/app/components/`.

```html
<!-- Directive form: the host you already own -->
<section
  inoAnimateOnScroll
  inoAnimateOnScrollEnterClass="reveal-rise"
  [inoAnimateOnScrollThreshold]="0.25"
  inoAnimateOnScrollOnce
>
  …
</section>

<!-- Element form: wrap projected content -->
<ino-animateonscroll enterClass="reveal-rise" leaveClass="reveal-fall">
  <app-stat-card></app-stat-card>
</ino-animateonscroll>
```

**Author enter classes as CSS keyframe animations** whose `from` pose carries the hidden/offset
state (`@keyframes` from `opacity: 0` / `transform: translateY(…)`), animating `opacity`/
`transform` only — both compositor-side, so CLS is zero by construction. Never pre-hide the host
with a static `opacity: 0`; that reintroduces exactly the failure this directive exists to avoid.
The live demo's `aos-rise`/`aos-fall` classes are the copyable baseline.

---

## API

| Input (directive) | Component alias | Type | Default | Behaviour |
|---|---|---|---|---|
| `inoAnimateOnScroll` | `enabled` | `boolean` | `true` | Selector and on/off switch in one — the bare attribute defaults `true`. Set `false` to suppress a single instance of a shared template without restructuring it. |
| `inoAnimateOnScrollEnterClass` | `enterClass` | `string` | `''` | Space-separated class(es) applied on viewport enter. Author as keyframe animations (above). |
| `inoAnimateOnScrollLeaveClass` | `leaveClass` | `string` | `''` | Space-separated class(es) applied on viewport leave, only after the host has entered at least once. Optional — omit it and the enter classes are simply removed on leave, re-arming the enter animation. |
| `inoAnimateOnScrollThreshold` | `threshold` | `number` | `0.1` | `IntersectionObserver` threshold (0–1): how much of the host must be visible before enter fires. |
| `inoAnimateOnScrollRootMargin` | `rootMargin` | `string` | `'0px'` | `IntersectionObserver` rootMargin, verbatim. Positive margins start the animation before the host arrives; negative ones delay it until the host is well inside. |
| `inoAnimateOnScrollOnce` | `once` | `boolean` | `false` | `true` = animate on first enter only, then disconnect (enter classes stay; no leave ever runs). `false` = repeat on every cycle. The seed row's "once vs repeat" axis. |

| Output (directive) | Component alias | Payload | Fires |
|---|---|---|---|
| `inoAnimateOnScrollEnter` | `enter` | `void` | Each time the enter classes are applied. |
| `inoAnimateOnScrollLeave` | `leave` | `void` | Each time the leave classes are applied. |

The two boolean inputs use Angular's `booleanAttribute` transform and the threshold uses
`numberAttribute`, so the bare-attribute and bound forms behave alike. Changing `threshold` or
`rootMargin` after init rebuilds the observer — they are constructor options an existing
`IntersectionObserver` cannot adopt.

### Variants

PrimeNG's `pAnimateOnScroll` ships enter/leave class options and nothing else; the seed row's
three axes — enter/leave classes, threshold (plus rootMargin), once vs repeat — are the variant
surface here, each demonstrated live in its own demo section.

---

## States

The §2 standard state set is **n/a (directive)** per the seed row — a behaviour-only primitive has
no hover / focus-visible / active / disabled / readonly / invalid / loading / empty state of its
own; every one belongs to the host element the caller owns. The directive's own lifecycle modes
are what the demo shows live:

| Mode | Meaning | Observable |
|---|---|---|
| **idle** | Host not yet intersecting (or intersecting below threshold). Natural, fully-visible CSS state — nothing applied, nothing hidden. | No `aos-*` class on the host. |
| **entered** | Host crossed the threshold: leave classes removed, enter classes applied, `enter` emitted. | Enter keyframe plays; counter increments. |
| **left** (repeat mode only, after a prior enter) | Host stopped intersecting: enter classes removed, leave classes (if any) applied, `leave` emitted. | Leave keyframe plays; counter increments. |
| **disconnected** (`once`) | First enter happened with `once` set: observer disconnected, enter classes permanent. | Counter frozen at 1. |

A host that starts below the fold never runs its leave animation at page load — leave is gated on
a prior enter.

---

## Accessibility contract

**Content is never hidden pre-animation (CLS/SR).** The directive never sets a style on its host —
no `opacity`, no `visibility`, no inline anything. Before the first intersection the host renders
exactly as if the directive were absent: fully visible, occupying its final layout box. Screen
readers, reader mode, find-in-page, print and SSR all see the full content unconditionally. The
hiding lives in the enter class's keyframe `from` pose and lasts only as long as the animation
runs. Keyframes should animate `opacity`/`transform` only, so the layout box never changes and
CLS is zero by construction.

**`prefers-reduced-motion: reduce` disables the directive.** The preference is read **live at
every observer callback** (`MediaQueryList.matches`), not cached at init — flipping the OS setting
mid-session takes effect on the next scroll. Under reduced motion no class is applied and no event
is emitted; classes already applied are left alone (removing an applied enter class could snap
content the user is reading back to a keyframe's hidden pose — a worse motion event than doing
nothing). Combined with the no-pre-hide guarantee, a reduced-motion user simply sees the content,
static, where it would have animated to. WCAG 2.2 SC 2.3.3 (Animation from Interactions, AAA) is
satisfied even though only AA is required.

**Degradation without `IntersectionObserver`.** SSR and jsdom have no `IntersectionObserver`; the
directive is a silent no-op there — no observer, no classes, no events, host fully visible. The
behaviour degrades to "no animation", never to "no content". No polyfill is loaded and none is
required.

**Events mirror classes exactly.** `enter`/`leave` emit **iff** their classes were applied in that
callback. A caller wiring an analytics ping or lazy-load to `enter` can never observe an event for
a reveal the user didn't get (reduced motion, disabled, no observer).

**Role / ARIA, focus, contrast, RTL.** Nothing to manage: the directive never moves focus, sets no
ARIA attributes, and paints no text or non-text content — there is no contrast pair of its own to
audit; the animated content keeps its own themed colours, which the theme gates audit on the host
component. Nothing positioned or directional exists to get RTL-wrong; logical/physical property
concerns live in the caller's keyframes.

---

## Deliberate omissions

States, sizing and labels — n/a (directive).

Recorded, not omitted (doc 26 §2 rows 2–4; full per-row reasoning in `SPEC.md` §2). This is a
behaviour-only primitive with no state set of its own (see States above), no intrinsic size — the
host owns its box, and a `size` input would be a typed input that changes nothing observable (the
`ino-dragdrop` precedent) — and no label/help/error text; the host keeps whatever labelling it
has. Same disposition `[inoAutofocus]`, `[inoFocusTrap]` and `[inoKeyfilter]` record.

Also out of scope, recorded in `SPEC.md` §7: scroll-linked (scrubbed) animation — progress tied to
scroll position is a different primitive (CSS scroll-driven animations / `ScrollTimeline`), not an
enter/leave class swap — and stagger orchestration across siblings, which callers compose today
with per-item `animation-delay`.

---

## Mobile parity

**Deliberately omitted — the seed row names "Web-only."** `IntersectionObserver` and CSS classes
are web platform primitives with no directive-shaped equivalent on either mobile platform;
scroll-reveal on React Native (`Animated` + scroll events) or Flutter (explicit animation
controllers keyed to scroll position) is an animation-API product decision per surface, not a port
of this contract. Full reasoning: `SPEC.md` §2 row 7. Compare `[inoAutofocus]`, which did port,
because both platforms have an idiomatic non-visual focus-placement primitive.

---

## Verification

| Gate | Result |
|---|---|
| `npx ng test --watch=false` (this directory's spec) | 13/13 pass (12 directive + 1 element form) |
| `node scripts/check-ds-adherence.mjs --json` | zero violations under `animateonscroll/` |
| `node scripts/check-theme-parity.mjs` | clean — no colour role read here |
| `node scripts/check-spec-citations.mjs` | clean — all files cited by `SPEC.md` exist |
| `node scripts/check-docs-completeness.mjs` | clean for `animateonscroll` |
