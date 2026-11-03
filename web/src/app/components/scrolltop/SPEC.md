# `<ino-scrolltop>` — component spec

**Issue:** [INO-867](/INO/issues/INO-867) (rebuild after lost INO-464 artifact — see §4),
originally [INO-464](/INO/issues/INO-464) (INO-31 Phase B4, doc 26 §5 row `ino-scrolltop`).
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).
**Parity benchmark:** PrimeNG 22.1.1 `ScrollTop` — a benchmark only; nothing in this component
imports it.

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be
written down rather than silently made.

---

## 1. Two targets, two positioning strategies

`target="window"` fixes the host to the viewport (`position: fixed`) and listens to `window`'s
`scroll` event; visibility is driven by `window.scrollY`. `target="parent"` switches the host to
`position: absolute` and listens to the host's own DOM parent element instead — the parent must
establish a positioning context (`position: relative` or similar) for the absolute placement to
resolve against it, the same contract any `position: absolute` child carries. Visibility there is
driven by the parent's own `scrollTop`.

## 2. `prefers-reduced-motion` always wins, and never through the CSSOM `'auto'` ambiguity

`activate()` never calls `scrollTo({ top, left, behavior: 'auto' })` for the instant path. Per the
CSSOM View spec, the options-object `behavior: 'auto'` means "use the scrolling box's *computed*
`scroll-behavior` CSS property," not "instant." `web/src/styles.scss` sets a global
`html { scroll-behavior: smooth }`, so on `target="window"` that options-object form silently
inherits the global rule and animates anyway — confirmed by trusted-click scrollY-trace, not by
source read alone (a source read sees the correct-looking `behavior: 'auto'` argument and moves
on). The two-argument form, `window.scrollTo(0, 0)` / `parentEl.scrollTo(0, 0)`, is always instant
by spec regardless of any `scroll-behavior` CSS in scope, so that is the only form this component
ever uses for an instant jump.

The instant path fires when `matchMedia('(prefers-reduced-motion: reduce)').matches` **or** when
`behavior="auto"` is passed explicitly — reduced motion overrides a `behavior="smooth"` input, but
an explicit `"auto"` input never gets upgraded to smooth. Checked live, not just in Karma: a smooth
scroll is still vestibular motion, same rationale `ino-virtual-scroller`'s `resolveBehavior` and
`ino-tabs`' reduced-motion branch already carry.

## 3. Permanently-mounted node, not `*ngIf`

The button toggles visibility via a `--visible` class plus `[attr.aria-hidden]`/`[attr.tabindex]`
bindings in the template, never `*ngIf`. The WAI "back to top" pattern expects one stable node a
screen reader's accessibility-tree walk can find consistently rather than one that mounts and
unmounts as the page scrolls — the same reasoning a tooltip or a disabled (vs. removed) control
carries elsewhere in this library.

## 4. Audit note — this is a rebuild, not an update

The original [INO-464](/INO/issues/INO-464) build comment and the [INO-465](/INO/issues/INO-465)
QA pass both cite commit `fe9e972` on this branch. That commit does not exist — not in this
worktree, not in `origin`, not as a dangling/unreachable object (`git fsck` confirms), and the
entire `web/src/app/components/scrolltop/` directory was absent from disk before this rebuild.
Both the build and the QA comments describe a real, working implementation in specific detail
(exact scrollY traces, a named `resolveBehavior()` method, a 7/7 Karma pass) consistent with an
isolated execution workspace that was torn down before its commit reached the shared branch —
not a fabricated report. Flagged on both issues; this rebuild reconstructs the same contract from
those comments and bakes the INO-867 QA finding (§2 above) in from the start rather than
reproducing it.

## 5. Sizing and labels

One size only — a 44px circular button, no `size` input, per doc 26 §5. `ariaLabel` input
defaults to `'Scroll to top'`.

## 6. Notes

Web-only (doc 26 §5) — no mobile port. `focusTarget` (CSS selector, optional) moves focus to a
caller-supplied element after activation, falling back to `<body>`; the button routinely re-hides
itself (and goes `tabindex="-1"`) the instant it's clicked once the scroll position crosses back
under `threshold`, so leaving focus on it would strand a keyboard/SR user on a node that just left
the tab order.
