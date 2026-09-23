# `<ino-modal>` — Modal / Dialog

> Parity benchmark: PrimeNG 22.1.1 `Dialog` (`specs/primeng/llms-22.1.1.txt`, line 53).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes the Dialog row in
> `docs/brand/16-design-system-parity-vs-echeque-reference.md` ("⚠️ centred only; no
> maximize/drag/size") and pending item **P-1** (modal focus trap, WCAG 2.1.2).
> Preview: [`previews/modal.html`](previews/modal.html).
> Decisions record: `web/src/app/components/modal/SPEC.md`.

Dialog / bottom-sheet shell. Composes `<ino-card variant="overlay">` for the panel plus its own
scrim, and delegates all Tab-containment/focus-restore to `[inoFocusTrap]` (T-11) rather than
hand-rolling it.

---

## API

### Behavior

| Input | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | `false` | Two-way: `[(open)]="flag"`. A one-way `[open]` binding re-opens the modal from a stale parent value on the next change-detection pass if the caller doesn't also handle `openChange` — same contract as any other two-way-bindable Angular component |
| `heading` | `string` | `''` | Sets `aria-labelledby`; omit for a dialog whose accessible name comes from elsewhere (e.g. a projected heading with its own `id`) |
| `closeOnBackdrop` | `boolean` | `true` | Scrim click closes |
| `closeOnEscape` | `boolean` | `true` | `Escape` closes. Owned here, not by the focus trap — see Accessibility below |

### Presentation

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Drives the header icon-button box off the Wave 0 control-height scale (`--ino-control-height`/`--ino-control-icon-size`) and the panel's max-width (360 / 480 / 720px — a component-owned constant, not a token; width isn't one of the six control-scale fields, see SPEC.md §2 row 3) |

### Maximize

| Input / Output | Type | Default | Notes |
|---|---|---|---|
| `maximizable` | `boolean` | `false` | Shows the maximize/restore toggle in the header |
| `maximized` | `boolean` | `false` | Two-way: `[(maximized)]`. Ignored while `maximizable` is `false` |
| `maximizedChange` | `EventEmitter<boolean>` | — | Fires on every toggle |

Maximized fills the viewport (`inset: var(--ino-space-4)` gutter — see SPEC.md §2 row 3 for why
it isn't flush edge-to-edge), suspends drag, and resets any drag offset.

### Drag

| Input | Type | Default | Notes |
|---|---|---|---|
| `draggable` | `boolean` | `false` | Repositions the panel by dragging its header (excluding the close/maximize buttons). Suspended while `maximized`. Clamped so at least 80px of the panel stays reachable on every edge (SPEC.md §3). No keyboard equivalent — deliberate, see Accessibility below |

### Outputs

| Output | Type | Fires when |
|---|---|---|
| `openChange` | `boolean` | Backdrop click, `Escape`, or the close button dismiss the dialog |
| `closed` | `void` | Same triggers as `openChange(false)` |
| `maximizedChange` | `boolean` | The maximize/restore button toggles |

### Content projection

| Slot | Notes |
|---|---|
| Default | Dialog body |
| `[ino-modal-footer]` | Action row (buttons), right-aligned |

---

## States

| State | Signal |
|---|---|
| default | `--ino-color-surface-raised` panel, `--ino-color-overlay-scrim` backdrop |
| hover | Close/maximize buttons: `--ino-color-surface-sunken` fill |
| active / pressed | Close/maximize buttons: `--ino-color-accent-active` on-colour |
| focus-visible | Close/maximize buttons: `--ino-focus-ring` + `--ino-focus-ring-offset`, never hand-rolled |
| disabled | Carried on the icon-button pair for consistency with every other icon control in the system; unused by this component's own logic today |
| readonly / invalid | N/A — a dialog is a container, not a form control (SPEC.md §2 row 5) |
| loading / busy | N/A — a caller's own async state lives in the projected body, same as any other `ng-content` consumer |

---

## Accessibility contract

`role="dialog"` + `aria-modal="true"` on the panel. `aria-labelledby` when `heading` is set.

**Focus** is entirely `[inoFocusTrap]`'s (T-11): initial focus lands inside on open, `Tab`/`Shift+Tab`
are contained, and focus restores to whatever opened the dialog on close — this component no
longer touches `document.activeElement` itself. Full contract:
[`focus-trap.md`](focus-trap.md).

**Keyboard map.** `Tab`/`Shift+Tab` per the trap above. `Escape` closes when `closeOnEscape` — kept
in this component because only the dialog knows whether dismissal is currently allowed (the trap
deliberately owns no dismissal keys). Close/maximize buttons are native `<button>`s — `Enter`/`Space`
activate them for free.

**Drag has no keyboard equivalent, by design, not by gap.** SC 2.5.7 (Dragging Movements) requires
a non-drag alternative for anything a drag gesture is the *only* way to accomplish. Nothing here is
drag-only: the dialog is fully usable, including moving it clear of content it might occlude,
without ever touching the header — closing/reopening or maximizing are always available. Dragging
only repositions a surface that already has a complete non-drag task path.

**Target size.** Close/maximize buttons are `--ino-control-height` square (36/44/52px across
sm/default/lg) — above the 24px SC 2.5.8 floor at every size, at/above the 44px comfortable target
at `default`/`lg`.

**RTL.** No physical `left`/`right`/`top`/`bottom`. The drag transform is computed from raw pointer
deltas in viewport pixels — correct in both directions by construction, since a drag gesture
follows the pointer rather than mirroring (SPEC.md §2 row 8).

---

## Motion

- Scrim fade + panel rise: `--ino-motion-duration-base` / `--ino-motion-easing-standard` /
  `--ino-motion-easing-decelerate`, gated on `prefers-reduced-motion: no-preference`.
- The rise entrance is skipped for a maximized panel — a maximize/restore toggle is a state change
  on an already-open dialog, not an entrance.
- Maximize/restore itself is not animated, matching PrimeNG's own Dialog and native OS window
  managers — a large-area resize animation is exactly the kind of motion reduced-motion readers are
  most sensitive to, with no accessibility requirement forcing it.
- Drag has no motion of its own: the panel tracks the pointer 1:1.

---

## Mobile parity

**All three tracks**, per the issue (overrides the general Wave-2 porting-rule table, which is
scoped to Tier-1 components):

- **Capacitor** — not a port. `mobile/capacitor/app`'s `ino-confirm-action-sheet` already wraps
  `<ino-modal>` directly, so this track gets the full size/maximize/drag surface for free.
- **React Native** — `mobile/react-native/src/components/InoModal.tsx`. Real port: `size` +
  backdrop/hardware-back dismissal. No `maximizable`/`draggable` — both are desktop-idiom
  affordances with no mobile counterpart (SPEC.md §4).
- **Flutter** — `mobile/flutter/lib/widgets/ino_modal.dart` (`showInoModal`). Same scope as the RN
  port; `InoModalSize.standard` is the Dart rename of `size="default"` (`default` is a reserved
  word), the one place this API's names diverge across platforms.

---

## Usage

```html
<ino-modal
  [(open)]="exportOpen"
  heading="Confirm export"
  size="default"
>
  This exports {{ count }} KYB records as a signed PDF. The file expires after 7 days.

  <div ino-modal-footer>
    <button ino-button variant="ghost" (click)="exportOpen = false">Cancel</button>
    <button ino-button variant="primary" (click)="onExport()">Export</button>
  </div>
</ino-modal>
```

Maximizable + draggable (e.g. an applicant-detail dialog with a lot of content):

```html
<ino-modal
  [(open)]="detailOpen"
  [(maximized)]="detailMaximized"
  heading="Applicant detail"
  maximizable
  draggable
  size="lg"
>
  <app-applicant-detail [applicant]="selected" />
</ino-modal>
```

Import by path — there is no barrel file:

```ts
import { InoModalComponent } from './components/modal/ino-modal.component';
```
