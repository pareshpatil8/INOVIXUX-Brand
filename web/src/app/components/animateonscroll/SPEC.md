# AnimateOnScroll — INO-31 B5 / INO-501 component spec

Parity benchmark: PrimeNG 22.1.1 `pAnimateOnScroll` ("AnimateOnScroll is used to apply
animations to elements when entering or leaving the viewport during scrolling",
`specs/primeng/llms-22.1.1.txt`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
in this directory imports it.

Spec seed: doc 26 §5 row "ino-animateonscroll" — directive: enter/leave animation classes;
threshold; once vs repeat; states/sizing/labels "n/a (directive)"; a11y note
"`prefers-reduced-motion` disables; content never hidden pre-animation (CLS/SR)"; mobile
disposition "Web-only." This file, `docs/brand/06-angular-components/animateonscroll.md`, and
the two a11y guarantees below are the deliverables that row requires. No mobile ports.

---

## 1. What this component is

A **behaviour-only primitive**: an attribute directive (`[inoAnimateOnScroll]`, plus an element
form `<ino-animateonscroll>` backed by the same implementation via `hostDirectives`, the
`[inoAutofocus]` / `<ino-autofocus>` shape — `web/src/app/components/autofocus/SPEC.md`) that
watches its host with `IntersectionObserver` and applies caller-supplied CSS classes when the
host enters or leaves the viewport. The directive paints nothing: every visual belongs to the
caller's enter/leave classes.

The design centre is the two a11y guarantees, which together invert PrimeNG's trade-off:

1. **Content is never hidden pre-animation.** PrimeNG's `pAnimateOnScroll` sets `opacity: 0` on
   its host until the first intersection. That costs a screen-reader or find-in-page user the
   content entirely whenever the observer never fires, and makes first paint a CLS hazard. Here
   the host stays in its natural, fully-visible CSS state until (and unless) an enter class is
   applied — and the enter class is documented as a *keyframe animation* whose `from` pose holds
   the hidden/offset state, so it hides the element only for the animation's own duration.
2. **`prefers-reduced-motion: reduce` disables the directive**, read live at every observer
   callback. Combined with guarantee 1, a reduced-motion user simply sees the content, static,
   where it would have animated to. No class ⇒ no event either — the enter/leave emitters fire
   only when their classes are actually applied, so callers cannot desync visual and
   programmatic reactions.

---

## 2. Definition-of-Done disposition (doc 26 §2, all eight points)

| # | Row | Disposition |
|---|---|---|
| 1 | Variants/Structure | **Satisfied, per the spec seed's own row.** The row's three axes ship as inputs, each with a live docs demo: enter/leave animation classes (`inoAnimateOnScrollEnterClass` / `inoAnimateOnScrollLeaveClass`), `threshold` (plus `rootMargin`), and once vs repeat (`inoAnimateOnScrollOnce`). Two forms, one implementation: `[inoAnimateOnScroll]` directive and `<ino-animateonscroll>` element wrapper via `hostDirectives`. |
| 2 | States | **Deliberate omission, recorded per row 6 — "n/a (directive)" in the seed row.** A behaviour-only primitive has no hover / focus-visible / active / disabled / readonly / invalid / loading / empty state of its own; every one belongs to the host element the caller owns. The directive's own two *modes* (idle / entered) are demonstrated live on the docs page. Same disposition `[inoAutofocus]` and `[inoFocusTrap]` record. |
| 3 | Sizing (sm/md/lg + dense/fluid) | **Deliberate omission, recorded per row 6.** The directive has no intrinsic size — the host owns its box. A size input would be a typed input that changes nothing observable (the `ino-dragdrop` precedent, `web/src/app/components/dragdrop/SPEC.md` §2 row 3). |
| 4 | Labels | **Deliberate omission.** No label, help text or error text of its own; the host keeps whatever labelling it has. The directive never touches ARIA attributes. |
| 5 | a11y | **Satisfied — this row is the design centre.** Full contract in §3: the never-hidden-pre-animation guarantee (CLS/SR), live `prefers-reduced-motion` handling, no-`IntersectionObserver` degradation to "no animation, full content", and the no-class ⇒ no-event rule. WCAG 2.2 AA: the directive paints no text or non-text content, so there is no contrast pair of its own to audit; motion is additive and disableable (SC 2.3.3 Animation from Interactions, level AAA, satisfied anyway via reduced-motion). |
| 6 | Notes | **Satisfied by this document.** States/sizing/labels omissions recorded here rather than dropped silently. PrimeNG mapping and the deliberate divergence (no pre-hide) in §1 and §4. Web-only disposition in row 7. |
| 7 | Mobile | **Deliberately omitted — the seed row names "Web-only."** `IntersectionObserver` and CSS classes are web platform primitives; scroll-reveal on RN/Flutter is an animation-API product decision per surface, not a port of this contract. |
| 8 | QA sign-off | Tracked on the gate subtask of INO-501, assigned to QALead per doc 26 §2.1 — not closed by this directory's builder. |

---

## 3. Accessibility contract (binding)

### 3.1 Content is never hidden pre-animation (CLS / SR)

- The directive **never sets a style** on its host — no `opacity`, no `visibility`, no inline
  anything. Before the first intersection the host renders exactly as if the directive were
  absent: fully visible, occupying its final layout box. Screen readers, reader mode,
  find-in-page, print and SSR all see the full content unconditionally.
- The enter class must be authored as a **CSS keyframe animation** whose `from` pose carries the
  hidden/offset state (`@keyframes` from `opacity: 0` / `transform: translateY(…)`). A keyframe
  hides the element only while the animation runs; a static `opacity: 0` on the host pre-hides
  it for every user the observer never reaches, which is exactly the PrimeNG failure this
  directive exists to avoid. The docs page demos ship this pattern as the copyable baseline.
- Keyframes should animate `opacity` / `transform` only — both are compositor-side and cause no
  layout shift. The host's layout box never changes, so CLS is zero by construction.

### 3.2 `prefers-reduced-motion: reduce` disables the directive

- The preference is read **live at every observer callback** (`MediaQueryList.matches`), not
  cached at init — flipping the OS setting mid-session takes effect on the next scroll event.
- Under reduced motion: no class is applied, no event is emitted, and classes already applied
  are left alone (removing an applied enter class could snap content the user is reading back to
  a keyframe's hidden pose — a worse motion event than doing nothing).
- Where `matchMedia` does not exist (SSR, jsdom), the preference reads as "no reduction
  requested" — and the observer guard below already makes those environments a no-op.

### 3.3 Degradation without `IntersectionObserver`

SSR and jsdom have no `IntersectionObserver`. The directive is a silent no-op there: no observer,
no classes, no events, host fully visible. The behaviour degrades to "no animation", never to
"no content". No polyfill is loaded and none is required.

### 3.4 Events mirror classes exactly

`inoAnimateOnScrollEnter` / `inoAnimateOnScrollLeave` emit **iff** their classes were applied in
that callback. A caller wiring an analytics ping or a lazy-load to the enter event can never
observe an event for a reveal the user didn't get (reduced motion, disabled, no observer).

### 3.5 Focus, roles, contrast, RTL

Nothing to manage: the directive never moves focus, sets no ARIA attributes, paints no content
(no contrast pair of its own — the caller's animated content keeps its own themed colours, which
the existing theme gates audit on the host component), and has no positioned or directional
output to get RTL-wrong. Logical/physical property concerns live in the caller's keyframes.

---

## 4. API

### 4.1 `[inoAnimateOnScroll]` — directive form

| Input | Type | Default | Behaviour |
|---|---|---|---|
| `inoAnimateOnScroll` | `boolean` (`booleanAttribute`) | `true` | Selector and on/off switch in one; the bare attribute is enabled. Set `false` to suppress one instance of a shared template. |
| `inoAnimateOnScrollEnterClass` | `string` | `''` | Space-separated class(es) applied on viewport enter. Author as keyframe animations (§3.1). |
| `inoAnimateOnScrollLeaveClass` | `string` | `''` | Space-separated class(es) applied on viewport leave, only after the host has entered at least once. Optional. |
| `inoAnimateOnScrollThreshold` | `number` (`numberAttribute`) | `0.1` | `IntersectionObserver` threshold (0–1): how much of the host must be visible before enter fires. |
| `inoAnimateOnScrollRootMargin` | `string` | `'0px'` | `IntersectionObserver` rootMargin, verbatim. |
| `inoAnimateOnScrollOnce` | `boolean` (`booleanAttribute`) | `false` | `true` = animate on first enter only, then disconnect (enter classes stay; no leave ever runs). `false` = repeat on every cycle. The seed row's "once vs repeat" axis. |

| Output | Payload | Fires |
|---|---|---|
| `inoAnimateOnScrollEnter` | `void` | Each time the enter classes are applied. |
| `inoAnimateOnScrollLeave` | `void` | Each time the leave classes are applied. |

**Leave is gated on a prior enter.** A host that starts below the fold must not run its leave
animation at page load, before the user has ever seen it; the first observer callback for an
off-screen host is therefore ignored.

**Input changes after init rebuild the observer** — `threshold` and `rootMargin` are
constructor options an existing `IntersectionObserver` cannot adopt.

### 4.2 `<ino-animateonscroll>` — element form

Same implementation via `hostDirectives`; inputs re-aliased to `enabled`, `enterClass`,
`leaveClass`, `threshold`, `rootMargin`, `once`; outputs to `enter`, `leave`. The classes apply
to the component's own host (`display: block`), so projected content animates as one block.

```html
<!-- Directive form: the host you already own -->
<section
  inoAnimateOnScroll
  inoAnimateOnScrollEnterClass="ino-reveal-rise"
  [inoAnimateOnScrollThreshold]="0.25"
  inoAnimateOnScrollOnce
>
  …
</section>

<!-- Element form: wrap projected content -->
<ino-animateonscroll enterClass="ino-reveal-rise" leaveClass="ino-reveal-fall">
  <app-stat-card></app-stat-card>
</ino-animateonscroll>
```

The enter/leave class names above are demo styles owned by the docs demo, not shipped tokens —
the directive ships **no** CSS classes of its own.

---

## 5. Implementation notes

- One `IntersectionObserver` per directive instance, observing only its host. A shared
  module-level observer keyed by options was considered and rejected: the fleet-wide usage is a
  handful of hosts per page, and per-instance observers keep `once`-disconnect and input-rebuild
  trivially correct (Ponytail rung: the one-liner wins over the new registry artifact).
- Class strings are split on whitespace and applied via `classList` per token —
  `classList.add('')` throws, so the empty defaults are tolerated by construction.
- `ngOnChanges` before init is ignored (init owns the first connection); after init any change
  disconnects and reconnects — the `[inoAutofocus]` guard, for the identical reason.
- `ngOnDestroy` disconnects unconditionally.

---

## 6. Verification

| Gate | Result | Evidence |
|---|---|---|
| Unit spec (this directory) | Must pass | Enter/leave class swap, leave gated on first enter, once-disconnect, reduced-motion no-op, no-`IntersectionObserver` no-op (jsdom native state), input rebuild, element-form aliases, event/class agreement. |
| `node scripts/check-ds-adherence.mjs` | Zero violations under `animateonscroll/` | No colour/spacing literals exist here. |
| `node scripts/check-theme-parity.mjs` | Clean | No colour role read. |
| `node scripts/check-spec-citations.mjs` | Clean | Citations resolve on this branch. |
| Docs page (portal v2 anatomy) | Renders with live demos | `docs/brand/06-angular-components/animateonscroll.md` + `CUSTOM_DEMOS` entry (the generic renderer cannot demonstrate a scroll behaviour — doc 26 §2.1 point 3's INO-810 lesson). |

---

## 7. Out-of-scope / future work

- **Mobile ports** — seed row says Web-only (§2 row 7).
- **Scroll-linked (scrubbed) animation** — progress tied to scroll position is a different
  primitive (CSS scroll-driven animations / `ScrollTimeline`), not an enter/leave class swap.
- **Stagger orchestration across siblings** — callers can stagger with per-item
  `animation-delay`; a coordinator API is not justified by current usage.
