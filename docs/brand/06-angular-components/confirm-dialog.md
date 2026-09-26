# `<ino-confirm-dialog>` — ConfirmDialog

> Parity benchmark: PrimeNG 22.1.1 `ConfirmDialog` (`specs/primeng/llms-22.1.1.txt`, line 48).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/confirm-dialog.html`](previews/confirm-dialog.html).
> Full Definition-of-Done disposition: `web/src/app/components/confirm-dialog/SPEC.md`.

Centered, backdrop-modal confirm/cancel prompt (INO-31 T-25 / INO-148) — a smaller, opinionated
sibling of `<ino-modal>`: heading + message + exactly two actions, not a generic content shell.
Reuses `<ino-card variant="overlay">` for the panel and `[inoFocusTrap]` (INO-130) for keyboard
containment instead of re-implementing either.

```html
<ino-confirm-dialog
  [(open)]="showDelete"
  heading="Delete this record?"
  message="This action cannot be undone."
  severity="danger"
  confirmLabel="Delete"
  [loading]="deleting"
  (confirmed)="onDelete()"
  (cancelled)="showDelete = false"
/>
```

There is no barrel file; import by path: `./components/confirm-dialog/ino-confirm-dialog.component`.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | `false` | Two-way (`[(open)]`), same contract as `<ino-modal>` |
| `heading` | `string` | `''` | Optional; sets `aria-labelledby` when present |
| `message` | `string` | `''` | Optional; sets `aria-describedby` when present. For richer content, project via the unnamed `<ng-content>` slot instead — see [Accessibility](#accessibility-contract) for why `aria-describedby` isn't auto-wired to projected content |
| `confirmLabel` | `string` | `'Confirm'` | |
| `cancelLabel` | `string` | `'Cancel'` | |
| `severity` | `'default' \| 'danger'` | `'default'` | Maps to `<ino-button variant="primary"\|"danger">` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Forwarded to both action buttons |
| `loading` | `boolean` | `false` | Confirm button becomes busy (spinner + `aria-busy`); Escape/backdrop/Cancel are all suppressed while `true` |
| `closeOnEscape` | `boolean` | `true` | |
| `closeOnBackdrop` | `boolean` | `true` | |

| Output | Payload | Fires when |
|---|---|---|
| `confirmed` | `void` | Confirm button clicked (and not `loading`) |
| `cancelled` | `void` | Cancel clicked, Escape pressed, or backdrop clicked |
| `openChange` | `boolean` | Any time `open` changes locally (two-way binding partner) |

---

## Variants

| Axis | Values | Notes |
|---|---|---|
| `severity` | `default` (primary accent) / `danger` (destructive) | Reuses `<ino-button>`'s existing audited variants — no new color pairing |

Icon slot and a `ConfirmationService`-style imperative/injectable API were both considered and
**deliberately not built** — see SPEC.md §3 for the reasoning (this repo's icon-as-wrapper
convention, and no existing precedent for a singleton confirm-flow service to extend).

---

## States

| State | Trigger | Notes |
|---|---|---|
| Default | — | |
| Hover / Active / Focus-visible | `:hover` / `:active` / `:focus-visible` on either button | Owned entirely by `<ino-button>` — not re-implemented here |
| Disabled | Cancel button, while `loading` | Prevents cancelling out from under an in-flight confirm handler |
| Readonly / Invalid | — | N/A — a confirm dialog holds no editable value |
| Loading/busy | `loading` input | Confirm button shows an inert spinner + `aria-busy`; the whole surface resists Escape/backdrop dismissal too |

---

## Motion

Enter: `--ino-motion-duration-base` + `--ino-motion-easing-decelerate` (panel), `-easing-standard`
(scrim) — identical to `<ino-modal>`'s existing motion, so the two overlays feel the same weight.
`@media (prefers-reduced-motion: reduce)` collapses both to an instant, unanimated open.

---

## Accessibility contract

**Role.** `role="alertdialog"`, not `role="dialog"` — the WAI-ARIA APG reserves `alertdialog` for a
modal that interrupts the user to demand a response, which is exactly what a confirm prompt always
is. `aria-modal="true"` (the backdrop genuinely blocks the rest of the page).

**Keyboard.** `Tab`/`Shift+Tab` wrap via `[inoFocusTrap]` on the panel; `Escape` cancels
(`closeOnEscape`, suppressed while `loading`); `Enter`/`Space` activate the focused button natively.

**Focus.** Captured, contained, and restored entirely by `[inoFocusTrap]` — this component adds no
duplicate focus-management code. Initial focus lands on Cancel (the trap's default: first tabbable
element).

**Contrast.** Heading (`--ino-color-on-surface`) and message (`--ino-color-on-surface-muted`) are
both audited text roles against the overlay panel's `--ino-color-surface-raised` fill in all three
themes. Buttons inherit `<ino-button>`'s own audited pairs.

**Target size.** Both actions floor at 36px (`size="sm"`) and reach 44px/52px at `default`/`lg` —
above the SC 2.5.8 24px minimum at every rung, and at/above the 44px comfortable recommendation for
the two larger rungs.

**RTL.** No physical `left`/`right`/`top`/`bottom` values anywhere in the stylesheet.

---

## Deliberate omissions

- **Density / `--ino-row-min-height`.** Not applicable — a centered overlay has no ambient row to
  fill or clear; density still reaches the action buttons through the size API.
- **Icon slot as an `@Input()`.** Use the unnamed `<ng-content>` slot to project an icon alongside
  custom body content instead — matches this repo's existing icon-as-wrapper convention (see
  `ino-input`'s docs for the same rule applied to form controls).
- **`ConfirmationService`-style imperative API.** `[(open)]` + `@Output()`s only, matching
  `<ino-modal>`'s existing, already-adopted contract. A shared confirm-flow service is a reasonable
  future addition once a second real consumer needs one.

## Mobile parity

**Web-only.** Mobile platforms have their own native confirmation idiom — a bottom-anchored action
sheet, not a centered card-with-scrim — which is out of scope for this issue and would need its own
API as a future `ino-confirm-action-sheet` component, per the porting rule in INO-31 plan rev 9 §5.
Full reasoning: `web/src/app/components/confirm-dialog/SPEC.md` §5.
