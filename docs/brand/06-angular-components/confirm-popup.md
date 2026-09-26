# `<ino-confirm-popup>` — ConfirmPopup

> Parity benchmark: PrimeNG 22.1.1 `ConfirmPopup` (`specs/primeng/llms-22.1.1.txt`, line 49).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/confirm-popup.html`](previews/confirm-popup.html).
> Full Definition-of-Done disposition: `web/src/app/components/confirm-popup/SPEC.md`.

Inline confirm/cancel prompt anchored next to a trigger element (INO-31 T-25 / INO-148) — no scrim,
no centered panel. Shares its confirm/cancel action contract and `severity` axis with
`<ino-confirm-dialog>`, but is a genuinely different, non-modal surface positioned relative to an
anchor via a small shared helper (`overlay-position.ts`, promoted to `../overlay/` in INO-271) also
used by Tooltip (T-22) and Popover (T-23).

```html
<button #del type="button" (click)="popup.toggle($event)">Delete</button>
<ino-confirm-popup #popup message="Delete this item?" (confirmed)="onDelete()" />
```

There is no barrel file; import by path: `./components/confirm-popup/ino-confirm-popup.component`.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | `false` | Two-way (`[(open)]`) |
| `target` | `HTMLElement \| ElementRef<HTMLElement> \| null` | `null` | Explicit anchor, for driving `[(open)]` directly instead of `toggle()` |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Preferred side; flips once to the opposite side if it doesn't fit the viewport, then clamps |
| `heading` | `string` | `''` | Optional |
| `message` | `string` | `''` | Optional |
| `confirmLabel` | `string` | `'Confirm'` | |
| `cancelLabel` | `string` | `'Cancel'` | |
| `severity` | `'default' \| 'danger'` | `'default'` | Same `InoConfirmSeverity` type as `<ino-confirm-dialog>` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Forwarded to both action buttons |
| `loading` | `boolean` | `false` | Same contract as `<ino-confirm-dialog>` |
| `closeOnEscape` | `boolean` | `true` | |

| Output | Payload | Fires when |
|---|---|---|
| `confirmed` | `void` | Confirm clicked (and not `loading`) |
| `cancelled` | `void` | Cancel clicked, Escape pressed, or a pointerdown outside the popup + anchor |
| `openChange` | `boolean` | Any time `open` changes locally |

| Method | Notes |
|---|---|
| `toggle(event?, anchor?)` | PrimeNG-style convenience entry point — infers the anchor from `event.currentTarget` if `anchor` isn't passed, so a trigger button only needs `(click)="popup.toggle($event)"` |

---

## Positioning

`overlay-position.ts` exports `computeOverlayPlacement(anchorRect, popupSize, preferred, viewport,
gap)` — a pure function, not a class or an injectable service, kept intentionally small (one flip to
the opposite side, then a viewport clamp; no full auto-placement engine). See SPEC.md §2 for why the
computed position is applied via physical `top`/`left` rather than logical `inset-inline-start` /
`inset-block-start` — it is the RTL-*correct* choice for a `getBoundingClientRect()`-derived
coordinate, not an exception to the logical-properties rule.

---

## Variants

| Axis | Values |
|---|---|
| `position` | `top` / `bottom` / `left` / `right` — matches PrimeNG ConfirmPopup's four cardinal directions |
| `severity` | `default` / `danger`, identical to `<ino-confirm-dialog>` |

---

## States

Identical disposition to `<ino-confirm-dialog>`'s docs above — hover/active/focus-visible/disabled/
loading all live on the two `<ino-button>` actions; readonly/invalid are N/A (no editable value).

---

## Motion

A single `--ino-motion-duration-fast` + `-easing-decelerate` opacity/scale fade — faster than the
dialog's, matching the menu/popover weight class, and with no directional slide, so there is nothing
to re-mirror per `position` or under `dir="rtl"`. Collapses to none under
`prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role, without `aria-modal`.** `role="alertdialog"` (same reasoning as the dialog — this is still
an interruption demanding a response), but **no** `aria-modal`: the page behind the popup stays
visible and mouse-operable, so asserting `aria-modal="true"` would misdescribe it to assistive tech.

**Focus is still trapped for keyboard users.** `[inoFocusTrap]` confines `Tab`/`Shift+Tab` while
open even though the surface isn't ARIA-modal — a deliberate, narrower guarantee than `aria-modal`
implies (pointer users can still reach the rest of the page; keyboard users don't get walked into
now-partially-obscured content). `restoreFocus` returns focus to the anchor on close.

**Dismissal.** `Escape`, the `Cancel` button, or a pointerdown outside both the panel and the anchor
— the outside-pointerdown listener is registered on the next macrotask after opening specifically so
the click that opened the popup doesn't also close it.

**Contrast, target size, RTL.** Identical to `<ino-confirm-dialog>`'s docs above.

---

## Deliberate omissions

Same as `<ino-confirm-dialog>` (icon slot as an `@Input()`, a `ConfirmationService`-style imperative
API) plus:

- **Full auto-placement (flip-to-any-side, cross-axis `start`/`end` variants).** One opposite-side
  flip and a clamp is the deliberate stopping point — matches PrimeNG's own four-direction
  ConfirmPopup rather than a general-purpose popover engine, which is explicitly Popover's (T-23)
  problem to solve, not this issue's.

## Mobile parity

**Web-only**, same reasoning as `<ino-confirm-dialog>` — full detail:
`web/src/app/components/confirm-popup/SPEC.md` §5.
