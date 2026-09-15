# `<ino-alert>` / `<ino-toast-container>` — Message & Toast

> Parity benchmark: PrimeNG 22.1.1 `Message` + `Toast` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes **N-8** and **P-3** in
> `docs/brand/16-design-system-parity-vs-echeque-reference.md` (INO-163 — toast `position` +
> sticky/persistent mode; see `../../../web/src/app/components/toast-container/SPEC.md` for the
> decisions behind both).
> Preview: [`previews/alert.html`](previews/alert.html).

One component backs all three shapes PrimeNG splits across `Message` and `Toast`. `variant` changes
layout only (radius / max-width / shadow); it never changes colour logic, so the three shapes cannot
drift into three differently-audited contrast stories.

---

## Severity tiers

| `status` | Fill / text roles | Live-region role | Use it for |
|---|---|---|---|
| `info` | `--ino-color-info` / `--ino-color-on-info` | `status` (polite) | A fact the reviewer should know that implies **no action** — "screening re-runs nightly", "3 documents pending upload" |
| `success` | `--ino-color-success` / `--ino-color-on-success` | `status` (polite) | A completed action — "Changes saved", "Entity verified" |
| `warning` | `--ino-color-warning` / `--ino-color-on-warning` | `status` (polite) | Something needs a human decision — "GSTIN mismatch", "needs a second reviewer" |
| `danger` | `--ino-color-danger` / `--ino-color-on-danger` | `alert` (assertive) | A failure or escalation — "could not reach the verification service" |

The union is ordered low → high severity in source, and it is **closed**: an unlisted string is a
compile error, not a silently-unstyled alert.

### Why `info` exists (INO-128)

Before this, the union was `success | warning | danger` and every neutral statement had to be
dressed as a `warning`. In a KYB console that is not a cosmetic problem — it is the mechanism by
which reviewers learn to skim past amber. `info` gives neutral statements a register of their own so
`warning` keeps meaning *"you need to decide something."*

`info` is deliberately **not** the accent violet/indigo. An informational notice that looks like the
primary call-to-action reads as something to click, which is precisely wrong.

---

## API

### `<ino-alert>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `status` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'success'` | Drives fill, icon, SR status word, and live-region politeness |
| `variant` | `'inline' \| 'banner' \| 'toast'` | `'inline'` | Layout only — see below |
| `heading` | `string` | `''` | Optional bold first line; omitted from the DOM when empty |
| `dismissible` | `boolean` | `false` | Renders the close button |

| Output | Type | Fires when |
|---|---|---|
| `dismissed` | `void` | The close button is activated (click or keyboard) |

Message body is projected via `<ng-content>`.

### Variants

| `variant` | Difference from `inline` |
|---|---|
| `inline` | Baseline: `--ino-radius-lg`, no shadow, flows in content |
| `banner` | `border-radius: 0`, wider inline padding (`--ino-space-7`) — full-bleed page-top strip |
| `toast` | `max-width: 360px` + `--ino-elevation-2`, stacked by `<ino-toast-container>` |

### `<ino-toast-container>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `position` | `'top-start' \| 'top-center' \| 'top-end' \| 'bottom-start' \| 'bottom-center' \| 'bottom-end'` | `'bottom-end'` | Anchors the whole stack (INO-163). No `center` — see deliberate omissions below. |

### `ToastService`

```ts
toastService.show({ status: 'info', message: 'Screening re-runs nightly at 02:00 IST.' });
toastService.show({ status: 'warning', heading: 'Approval needed', message: 'Confirm the wire before it releases.', sticky: true }); // approval-blocking, no auto-dismiss, no close button
```

| Field | Type | Default |
|---|---|---|
| `status` | `InoAlertStatus` | `'success'` |
| `heading` | `string?` | — |
| `message` | `string` | *(required)* |
| `durationMs` | `number` | `5000`; `0` disables auto-dismiss; ignored when `sticky` is `true` |
| `sticky` | `boolean` | `false` — INO-163. No auto-dismiss timer, and the rendered toast has no dismiss button. For approval-blocking messages in a human-in-the-loop flow: only `dismiss(id)` (called from the code path that resolves the approval) can remove it, so a reviewer can't click it away without deciding. |

`show()` returns the toast id; `dismiss(id)` removes it early (the only way to clear a `sticky`
toast). Mount exactly one `<ino-toast-container>` near the app root — the service is
`providedIn: 'root'`, so the queue is shared regardless of how many places call `show()`.

---

## Motion

Only the **toast** shape animates. `inline` and `banner` are laid out in the document flow, where an
alert arriving is usually the result of the page itself changing; animating them would animate the
content around them too.

| Phase | Duration token | Easing token | Movement (`bottom-*`) | Movement (`top-*`) |
|---|---|---|---|---|
| Enter | `--ino-motion-duration-base` (200ms) | `--ino-motion-easing-decelerate` | fade in + `translateY(12px)` → 0 | fade in + `translateY(-12px)` → 0 |
| Exit | `--ino-motion-duration-fast` (120ms) | `--ino-motion-easing-accelerate` | fade out + 0 → `translateY(8px)` | fade out + 0 → `translateY(-8px)` |

Exit is the *fast* step and *accelerate*; enter is *base* and *decelerate*. A toast leaving should
get out of the reviewer's way, while a toast arriving has to be on screen long enough to be noticed
at all. The Y direction flips for `top-*` positions (INO-163) so a toast always visibly emerges from
— and retreats toward — the edge it is anchored to, never the opposite one.

Both are plain CSS keyframes bound through Angular's built-in `animate.enter` / `animate.leave`
class bindings in `<ino-toast-container>`. That choice matters: `ToastService` removes a toast on
its own auto-dismiss timer as well as via `dismiss(id)`, and `animate.leave` holds the element in
the DOM until the animation finishes **whichever path removed it** — so an auto-dismissing toast and
a user-closed one animate out identically, without the container having to be the only removal
route. No `@angular/animations` dependency is involved.

Neither keyframe uses `translateX`, so there is nothing to mirror under `dir="rtl"`.

**Reduced motion** — both rules sit inside `@media (prefers-reduced-motion: no-preference)`. Under
`reduce` the classes resolve to no animation; Angular measures the leaving element, finds none, and
removes it on the next frame. Toasts therefore still dismiss promptly — and still dismiss *at all* —
with motion switched off, which is the failure mode a naive `animationend` wait would introduce.

---

## Accessibility contract

**Role / ARIA**

- `role="alert"` (assertive) for `danger` only; `role="status"` (polite) for `info`, `success`, and
  `warning`. Interrupting a screen-reader user mid-sentence is justified by a failure, not by an
  informational notice.
- The status word (`Information:` / `Success:` / `Warning:` / `Error:`) is rendered
  screen-reader-only **ahead of** the message, so severity never depends on colour or on the icon.
- The icon glyph is `aria-hidden="true"` — it is decorative reinforcement, never the sole carrier of
  meaning (WCAG 2.2 SC 1.4.1).
- `<ino-toast-container>` carries `aria-live="polite" aria-atomic="false"` on the stack rather than
  per toast, so newly-queued toasts are announced without moving focus.

**Keyboard**

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Moves to/from the dismiss button (the only focusable element) |
| `Enter` / `Space` | Activates dismiss — native `<button>` behaviour, not re-implemented |

A non-dismissible alert has no focusable content by design: it is a live region, not a widget, and
adding a tab stop to a static notice is a navigation cost with no benefit. A `sticky` toast
(INO-163) follows the same rule for a different reason: it renders with `dismissible=false` so
there is nothing for the reviewer to activate that would clear an approval-blocking message without
resolving it.

**Contrast (WCAG 2.2 AA text + SC 1.4.11 non-text)** — all measured, not assumed; full tables in
`docs/brand/02-design-tokens/README.md` §Contrast:

| Theme | `on-info` on `info` fill | `info` on `surface` |
|---|---|---|
| dark (`:root`) | 6.04:1 | 5.70:1 |
| light | 6.40:1 | 6.14:1 |
| high-contrast | 9.76:1 (AAA) | 9.76:1 (AAA) |

`node scripts/check-theme-parity.mjs` asserts the high-contrast pairs (≥7:1) on every run.

**Targets** — the dismiss button is `--ino-target-comfortable` (44px), above both the 24px SC 2.5.8
minimum and the 44px comfortable guidance.

**RTL** — the alert body is flex-ordered and uses logical spacing throughout. All six toast
`position`s use only `inset-inline-{start,end}` / `inset-block-{start,end}` / `inset-inline`
(never `left`/`right`/`top`/`bottom`), so every position mirrors correctly under `dir="rtl"` without
a second stylesheet — a `*-end` toast in LTR renders on the same physical edge a `*-start` toast
would in RTL.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6):

- **Toast `position="center"`.** PrimeNG's `Toast` has a 7th position, dead-center. We ship the six
  named corners/edges (INO-163) and deliberately omit `center`: a toast is a transient,
  dismissible-by-default notice, and putting one in the middle of the viewport occludes whatever
  the reviewer was looking at — the exact interaction a toast (as opposed to a modal) exists to
  avoid. See `../../../web/src/app/components/toast-container/SPEC.md` §2.
- **Tinted / outlined severity styles.** PrimeNG's `Message` has `variant="outlined" | "simple"`.
  Ours fills solidly so the audited `--ino-color-*` / `--ino-color-on-*` pairs apply unmodified; a
  tinted background would need a new token per severity per theme, and `web/src/tokens.css` is
  frozen after Wave 0.
- **Size API (`sm` / `default` / `lg`).** Not applicable to this component in the Wave 0 pass: an
  alert is a content block sized by its message, not a control on the control-height scale. Revisit
  only if a compact in-table variant is actually specified.

## Mobile parity

Both mobile tracks carry the `info` / `onInfo` roles in their palettes —
`mobile/react-native/src/theme/tokens.ts` and `mobile/flutter/lib/theme/tokens.dart`, all three
themes, byte-verified against `tokens.css` by `scripts/check-theme-parity.mjs`. The Capacitor track
imports `web/src/tokens.css` directly and therefore picks up the roles with no port step.
