# `<ino-popover>` — Popover

> Parity benchmark: PrimeNG 22.1.1 `Popover` (`specs/primeng/llms-22.1.1.txt`, line 96).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/popover.html`](previews/popover.html).
> Full Definition-of-Done disposition: `web/src/app/components/popover/SPEC.md`.

Anchored overlay for arbitrary projected content (INO-31 T-23 / INO-150) — a filter form, a short
menu, a preview card. Unlike `<ino-confirm-popup>`'s fixed confirm/cancel shape, Popover has no
opinion about its content; it owns positioning (flip/shift collision handling against the
viewport), focus containment, and dismiss-on-outside-click/Escape.

```html
<button #anchor type="button" (click)="pop.toggle($event)">Filters</button>
<ino-popover #pop heading="Filters">
  <p>Arbitrary projected content goes here.</p>
</ino-popover>
```

There is no barrel file; import by path: `./components/popover/ino-popover.component`.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | `false` | Two-way (`[(open)]`) |
| `target` | `HTMLElement \| ElementRef<HTMLElement> \| null` | `null` | Explicit anchor, for driving `[(open)]` directly instead of `toggle()`/`show()` |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Preferred side; flips once to the opposite side if it doesn't fit the viewport, then clamps (shift) |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Drives panel padding and the optional close button's size |
| `heading` | `string` | `''` | Optional visible header text; also wires `aria-labelledby` |
| `ariaLabel` | `string` | `''` | Optional invisible accessible name, used only when `heading` is empty |
| `dismissable` | `boolean` | `true` | Pointerdown outside the panel + anchor closes it |
| `closeOnEscape` | `boolean` | `true` | |
| `showCloseIcon` | `boolean` | `false` | Renders an explicit close button in the header row |
| `closeLabel` | `string` | `'Close'` | `aria-label` for the close button |

| Output | Payload | Fires when |
|---|---|---|
| `openChange` | `boolean` | Any time `open` changes locally |
| `shown` | `void` | After the panel has been positioned on open |
| `hidden` | `void` | On close, via any dismissal route |

| Method | Notes |
|---|---|
| `show(event?, anchor?)` | Opens; infers the anchor from `event.currentTarget` if `anchor` isn't passed |
| `hide()` | Closes |
| `toggle(event?, anchor?)` | PrimeNG-style convenience entry point — `(click)="pop.toggle($event)"` on a trigger button |

---

## Positioning

`overlay-position.ts` exports `computeOverlayPlacement(anchorRect, panelSize, preferred, viewport,
gap)` — a fork of `<ino-confirm-popup>`'s helper of the same name (see SPEC.md §3 for why it's a
fork rather than a shared import). One flip to the opposite side when the preferred side doesn't
fit, then a viewport-edge clamp — the "flip/shift" the issue asks for, matched to the same
four-cardinal-direction model the PrimeNG benchmark itself ships, not a full auto-placement engine.

---

## Variants

| Axis | Values |
|---|---|
| `position` | `top` / `bottom` / `left` / `right` |
| `size` | `sm` / `default` / `lg` |
| `showCloseIcon` | off by default; explicit third dismiss route alongside Escape and outside-click |

---

## States

The only interactive chrome this component owns is the optional close-icon button, which inherits
hover/active/focus-visible/disabled from `<ino-button>` directly. Readonly/invalid/loading are N/A
— Popover has no editable value and no pending action of its own to represent as busy.

---

## Motion

A single `--ino-motion-duration-fast` + `-easing-decelerate` opacity/scale fade, same weight class
as `<ino-confirm-popup>`. No directional slide, so nothing to re-mirror per `position` or under
`dir="rtl"`. Collapses to none under `prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role, without `aria-modal`.** `role="dialog"` — the page behind the panel stays visible and
mouse-operable, so `aria-modal="true"` would misdescribe it. `dialog` rather than `alertdialog`
(`<ino-confirm-popup>`'s choice): arbitrary projected content isn't inherently an interruption
demanding a response.

**Accessible name is the caller's responsibility.** Pass `heading` or `ariaLabel` — see SPEC.md §4
for why this isn't enforced at compile time.

**Focus is still trapped for keyboard users.** `[inoFocusTrap]` confines `Tab`/`Shift+Tab` while
open even though the surface isn't ARIA-modal. `restoreFocus` returns focus to the anchor on close.

**Dismissal.** `Escape` (`closeOnEscape`), a pointerdown outside both the panel and the anchor
(`dismissable`), and the optional close button (`showCloseIcon`) — three independent routes. The
outside-pointerdown listener is registered on the next macrotask after opening so the click that
opened the popover doesn't also close it.

**Contrast, target size, RTL.** WCAG 2.2 AA text/non-text contrast and 24px/44px target-size floors
via the same tokens every other component reads. Positioning math is RTL-safe by construction
(physical `top`/`left` from `getBoundingClientRect()`, deliberately not re-expressed as logical
properties — see SPEC.md §3); every static style uses logical properties.

---

## Deliberate omissions

- **Typed `heading`/`message`/action inputs**, unlike `<ino-confirm-popup>`. Popover hosts arbitrary
  projected content by design — see SPEC.md §2.
- **Full auto-placement** (cross-axis `start`/`end` variants, 12-way grid). One opposite-side flip
  and a clamp matches the PrimeNG benchmark's own four-direction model — see SPEC.md §3.
- **Nested/cascading popovers.** `[inoFocusTrap]`'s stack supports this mechanically, but this issue
  ships and demonstrates only the single-level case.

## Mobile parity

**Web-only** — explicit decision per the issue description and the plan rev 9 §5 desktop-idiom
porting rule. Full detail: `web/src/app/components/popover/SPEC.md` §5.
