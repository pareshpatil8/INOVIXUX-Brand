# `<ino-scrolltop>` — ScrollTop

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B4 row
> `ino-scrolltop` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-464](/INO/issues/INO-464).
> Parity benchmark: PrimeNG 22.1.1 `ScrollTop` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/scrolltop/SPEC.md`.

A floating button that appears once the page — or, with `target="parent"`, its own host
parent — has scrolled past `threshold`, and scrolls back to the top on activation. Web-only
(doc 26 §5 row); no mobile port.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `target` | `'window' \| 'parent'` | `'window'` | `window` fixes to the viewport and tracks page scroll; `parent` absolute-positions against the host's own DOM parent and tracks that element's scroll — see [Variants / Structure](#variants--structure) |
| `threshold` | `number` | `400` | Scroll distance (px) past which the button becomes visible |
| `behavior` | `'smooth' \| 'auto'` | `'smooth'` | `smooth` downgrades to an instant jump under `prefers-reduced-motion: reduce` — see [Accessibility contract](#accessibility-contract) |
| `ariaLabel` | `string` | `'Scroll to top'` | Accessible name for the button — see [Labels](#labels) |
| `focusTarget` | `string \| null` | `null` | CSS selector focus moves to on activate; `null` = `<body>` — see [Accessibility contract](#accessibility-contract) |

No outputs.

### Variants / Structure

Two scroll targets (doc 26 §5 row: "window/parent target"):

- **`window`** (default) — `position: fixed` to the viewport, tracks `window` scroll. The usual
  page-level "back to top."
- **`parent`** — `position: absolute` against the component's own DOM parent, tracks that
  element's own `scroll` event instead of the page's. The parent must itself be the scrolling
  container and a positioned ancestor for the absolute placement to land correctly — the same
  "caller-owned sized/positioned ancestor" contract `ino-divider`'s vertical orientation
  documents for its own layout dependency. Full reasoning: `SPEC.md` §1.

Activation performs a smooth (or, under reduced motion, instant) scroll to the top of whichever
target is in play — doc 26 §5's "smooth scroll."

### Sizing

One size (doc 26 §5 row: "one size") — a fixed `--ino-control-height-default` (44px) circular
button. There is no `size` input. Full reasoning: `SPEC.md` §5.

### Labels

`ariaLabel` (default `'Scroll to top'`) is the button's accessible name — there is no visible
text label on this control (an icon-only floating action), so the caller-overridable
`aria-label` is the only label surface. See [Accessibility contract](#accessibility-contract).

### States

Doc 26 §5's own state row is `visible`/`hidden`, layered on top of the §2 standard set. Only
`default`/`hover`/`focus-visible`/`active` from that standard set apply — there is no
`disabled`/`readonly`/`invalid`/`loading`/`empty` state for a stateless "jump to top" button.

The button node stays permanently mounted; `visible`/`hidden` toggles `visibility`/`opacity` plus
`aria-hidden`/`tabindex` rather than adding/removing the element, so hover/focus-visible/active
and the visible/hidden axis are independent of each other. Full reasoning: `SPEC.md` §2.

---

## Accessibility contract

**Role / ARIA** — a native `<button type="button">`, so it carries the implicit `button` role
and all native keyboard activation (<kbd>Enter</kbd>/<kbd>Space</kbd>) for free. While hidden it
carries `aria-hidden="true"` and `tabindex="-1"`, removing it from both the accessibility tree and
the tab order — a transparent button a sighted user cannot see must not still be reachable by
keyboard. `aria-label` is required reading for screen reader users since there is no visible text.

**Keyboard** — <kbd>Tab</kbd> reaches the button only while visible (per the `tabindex` toggle
above); <kbd>Enter</kbd> or <kbd>Space</kbd> activates it, same as any native button.

**Focus handling on activate** (doc 26 §5 a11y row, named explicitly) — after scrolling the
target to 0, focus moves to `focusTarget` (a caller-supplied CSS selector — typically the page's
`<h1>` or a `#main` skip-link destination) when set, or to `<body>` otherwise. This follows the
WAI "back to top" pattern: a scrolltop button routinely re-hides itself the instant it is
activated (the scroll it just performed can drop the page back under `threshold`), so leaving
focus on the pressed button would strand a keyboard/SR user on a node no longer meaningfully in
the accessible flow. Full reasoning: `SPEC.md` §3.

**`prefers-reduced-motion`** (doc 26 §5 a11y row, named explicitly) — `behavior="smooth"` (the
default) is downgraded to an instant jump whenever the OS reduced-motion setting is active, even
though the caller asked for `smooth`; `behavior="auto"` is unaffected either way. The separate
show/hide CSS transition also drops its translate under the same media query, keeping a linear
opacity fade only. Full reasoning: `SPEC.md` §4.

**Contrast** — the button's border/icon/fill resolve through `--ino-color-border` /
`--ino-color-on-surface-muted` / `--ino-color-surface-raised`, audited across all three themes by
`node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`inset-inline-end`, `inset-block-end`); no `top`/`left`/
`right`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

**No visible-label/icon customization.** Doc 26 §5's row calls for "window/parent target;
threshold; smooth scroll" — no icon-swap or label-slot variant. The button renders a single
fixed up-arrow glyph; add a template-projection API on a real consumer need, not speculatively.

**`focusTarget` is an addition beyond the literal spec row,** directly implementing the a11y
row's named "focus handling on activate" requirement rather than scope creep — see
`SPEC.md` §3.

---

## Mobile parity

**Web-only** (doc 26 §5 row) — no React Native or Flutter port. A native "scroll to top"
affordance on mobile is typically the status-bar-tap gesture (iOS) or simply unnecessary given
shorter scroll distances on a phone viewport. Full reasoning: `SPEC.md` §6.
