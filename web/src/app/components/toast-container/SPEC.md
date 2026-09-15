# `<ino-toast-container>` + `ToastService` — component spec addendum

**Issue:** INO-163 (INO-31 U-8, Messages group)
**Resolves:** **N-8** (toast `position`, 6 standard corners/edges) and **P-3** (sticky/persistent
mode) in `docs/brand/16-design-system-parity-vs-echeque-reference.md`.
**Depends on:** W0-6 (INO-128, `info` severity tier) — merged (`done`) before this issue started.
**Prior art:** `docs/brand/06-angular-components/alert.md` documents the base
`ino-alert` / `ino-toast-container` / `ToastService` contract shipped with W0-6. This file records
only the decisions this issue adds on top of that — it is an addendum, not a rewrite.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. `position` lives on the container, not on `InoToastConfig`

`ToastService.show()` feeds one shared queue (`providedIn: 'root'`), and an app mounts exactly one
`<ino-toast-container>` near its root — `ino-toast-container.component.html` already renders that
queue as a single flat stack. PrimeNG's `Toast` supports per-call positioning via a `key` routed to
one of several mounted `<p-toast>` instances; we deliberately don't reproduce that here; `position`
is a `@Input` on `<ino-toast-container>` (default `bottom-end`, the pre-INO-163 fixed placement),
so every toast in the one shared stack shares one anchor point.

A future need for two simultaneously-visible anchor points is a second `<ino-toast-container>` +
some way to route `show()` calls between them — out of scope here and not designed against a
hypothetical that doesn't have a caller yet.

## 2. Six positions, no `center`

The issue asks for "the 6 standard corners/edges." PrimeNG's own `Toast` position enum has a 7th,
`center`. We ship the six INO-163 names — `top-start`, `top-center`, `top-end`, `bottom-start`,
`bottom-center`, `bottom-end` — and omit `center`: a toast is a transient, dismissible-by-default
notice; putting one in the middle of the viewport occludes whatever the reviewer was just looking
at, which is the interaction a toast (as opposed to a modal) exists to avoid. `-start`/`-end` name
the inline-axis anchor (not `-left`/`-right`) so the API itself states the RTL contract instead of
leaving it to the CSS alone.

## 3. Logical properties for every position, including the centered ones

DoD row 8 requires CSS logical properties only. The four corner positions use a single
`inset-inline-{start,end}` + `inset-block-{start,end}` pair each — direct carry-forward of the
existing `bottom-end` rule, just parameterised. The two centered positions (`top-center`,
`bottom-center`) are the part worth writing down: the physical idiom for centering a
fixed-position element is `left: 50%; transform: translateX(-50%)`, which is explicitly the kind of
physical, non-logical positioning DoD row 8 rules out. Instead they set `inset-inline: <space>`
(both logical inline insets to the same value, which is what the existing mobile breakpoint already
did for a different reason) plus `align-items: center` on the flex container, so every toast in the
stack centers itself without a transform. This composes cleanly with the existing mobile breakpoint,
which now also resets `align-items: stretch` so all six positions converge on the same full-bleed
mobile behaviour that shipped in W0-6 — position is a desktop-viewport concern.

## 4. Enter/exit direction now depends on position

The W0-6 motion (`ino-toast-in`/`ino-toast-out`, `translateY` only) assumed the only anchor was
`bottom-end` — a toast should visibly emerge from the edge it lives on, not slide in from the
opposite side of the screen. Rather than branching the whole `animation` shorthand per position
(duplicating duration/easing/fill-mode six times), the three top-anchored position classes override
just `animation-name` to the new `ino-toast-in-top` / `ino-toast-out-top` keyframes (mirrored
`translateY` sign) via a descendant selector — `animation-name` is a longhand of the `animation`
shorthand set on `.ino-toast-enter`/`.ino-toast-leave`, so duration/easing/`forwards` carry over
unchanged. Both new keyframes stay inside the existing `prefers-reduced-motion: no-preference`
block; under `reduce` every position still resolves to no animation, same as W0-6.

## 5. Sticky removes the dismiss button, not just the auto-dismiss timer

`durationMs: 0` already existed as a way to disable auto-dismiss (see `alert.md`'s `ToastService`
example, marked `// sticky` in a comment even before this issue). INO-163 promotes that to a named
`sticky?: boolean` on `InoToastConfig` for two reasons:

1. **Self-documenting call sites.** `show({ ..., durationMs: 0 })` reads as "no timeout," not as "
   this message blocks an approval and must survive user interaction." A named field carries that
   intent at the call site instead of requiring the reader to know the `0` convention.
2. **The dismiss button is removed, not just inert.** `<ino-toast-container>` now binds
   `[dismissible]="!toast.sticky"` on the projected `<ino-alert>`. The issue's own justification is
   "required for approval-blocking messages in a human-in-the-loop flow" — a reviewer who can click
   an ✕ to make the approval-blocking notice disappear has, functionally, dismissed the approval
   without deciding it. The only way to clear a sticky toast is the code path that resolves
   whatever it's blocking calling `ToastService.dismiss(id)` (the id `show()` already returned).
   This mirrors `ino-alert.component.html`'s existing rule that a non-dismissible alert has no
   focusable content by design — sticky just gives `ToastService` a first-class way to request that
   same non-dismissible rendering.

**Deliberately unchanged:** `sticky` does not alter the live-region `role` (still `alert` for
`danger`, `status` otherwise) or force a particular `status`. Urgency is still communicated by
`status`, exactly as before; `sticky` only answers "can this be dismissed" (by timer or by the
reviewer), not "how urgent does this read."

## 6. Mobile parity (per plan rev 9 §5)

`<ino-toast-container>` is Capacitor-done for free — same Angular component, same CSS, per DoD row
9's "Capacitor is not a port" rule; the six position classes and the sticky-driven `dismissible`
binding both work unmodified in the Capacitor webview.

React Native and Flutter carry no toast **widget** today: `alert.md`'s existing "Mobile parity"
section already scopes their W0-6 contribution to the `info`/`onInfo` *palette roles* only, verified
by `check-theme-parity.mjs`, not a ported component. `position` and `sticky` are layout/timer
concepts with nothing to attach to on those two tracks yet — this issue doesn't create a new gap,
it leaves the same web-only-widget / tokens-only-port decision already on record for the base
component unchanged.

## 7. Registry finding (recorded per prior precedent)

Same finding as `tag/SPEC.md` §8, `radio-group/SPEC.md` (bottom), and `checkbox/SPEC.md`: DoD row
11 describes "one appended line in the `check-theme-parity.mjs` component registry," but no such
registry exists in the file (confirmed by reading it in full — it is a token-contract audit script,
not a per-component list). Nothing appended here either; `node scripts/check-theme-parity.mjs`
passes unchanged. Component-level token adherence is covered by `check-ds-adherence.mjs`'s
directory-scope walk instead, which was run against `web/src/app/components/{alert,toast-container}`
for this issue with zero new violations.

---

## Files touched

- `web/src/app/services/toast.service.ts` — `sticky` on `InoToastConfig`/`InoToastItem`; timer
  suppressed when `sticky`.
- `web/src/app/components/toast-container/ino-toast-container.component.ts` — `InoToastPosition`
  union + `position` `@Input`.
- `web/src/app/components/toast-container/ino-toast-container.component.html` — position class
  bindings; `[dismissible]="!toast.sticky"`.
- `web/src/app/components/toast-container/ino-toast-container.component.scss` — six position
  variants (logical properties only) + top-anchored motion keyframes.
- `docs/brand/06-angular-components/alert.md` — API tables + the two DoD-row-6 "deliberate
  omissions" entries this issue closes.
- `docs/brand/06-angular-components/previews/alert.html` — position + sticky preview sections.
- This file.

No change to `web/src/tokens.css` (frozen after Wave 0 — every value used here,
`--ino-space-*`, `--ino-safe-area-{top,bottom}`, `--ino-motion-duration-*`,
`--ino-motion-easing-*`, already existed) and no change outside
`web/src/app/components/{alert,toast-container}/**`, `web/src/app/services/toast.service.ts`, and
this issue's own docs/preview files.
