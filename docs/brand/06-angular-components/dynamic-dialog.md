# `<ino-dynamic-dialog>` — Dynamic Dialog

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-dynamic-dialog` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-447](/INO/issues/INO-447).
> Parity benchmark: PrimeNG 22.1.1 `DynamicDialogModule` / `DialogService`
> (`specs/primeng/llms-22.1.1.txt`) — a benchmark only; nothing here imports it.
> Decisions record: `web/src/app/components/dynamic-dialog/SPEC.md`.

A service-opened dialog that reuses `<ino-modal>` for every visual/behavioural concern (sizing,
maximize, drag, close paths, theme, focus trap) and adds one thing on top: open any
caller-supplied Angular component by type, from code, and get a `Promise` back that resolves with
whatever that component passed to `close()`.

```typescript
import { InoDynamicDialogService } from './services/dynamic-dialog.service';

const ref = this.dialogService.open(MyFormComponent, {
  heading: 'Edit customer',
  data: { customerId },
  size: 'lg',
});
const result = await ref.onClose; // undefined if dismissed, otherwise whatever MyFormComponent passed to ref.close(result)
```

```html
<!-- Mount once, anywhere in the app shell — same contract as <ino-toast-container> -->
<ino-dynamic-dialog></ino-dynamic-dialog>
```

Import by path (no barrel file): service at `./services/dynamic-dialog.service`, component at
`./components/dynamic-dialog/ino-dynamic-dialog.component`.

---

## API

### `InoDynamicDialogService`

| Method | Signature | Notes |
|---|---|---|
| `open` | `open<T, D, R>(component: Type<T>, config?: InoDynamicDialogConfig<D>): InoDynamicDialogRef<R>` | Opens `component` inside the mounted `<ino-dynamic-dialog>`. A second call while one is already open resolves the first's `onClose` with `undefined` before opening the new one — only one dynamic dialog is tracked at a time |
| `dismiss` | `dismiss(): void` | Closes whatever is open, resolving its `onClose` with `undefined`. A no-op when nothing is open |
| `current` | `Signal<InoDynamicDialogEntry \| null>` | Read by `<ino-dynamic-dialog>`; not generally needed by callers |

### `InoDynamicDialogConfig<D>`

| Field | Type | Default | Notes |
|---|---|---|---|
| `heading` | `string` | `undefined` | Forwarded to `<ino-modal [heading]>` |
| `data` | `D` | `undefined` | Provided to the opened component via `INO_DYNAMIC_DIALOG_DATA` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Forwarded to `<ino-modal [size]>` |
| `maximizable` | `boolean` | `false` | Forwarded to `<ino-modal [maximizable]>` |
| `draggable` | `boolean` | `false` | Forwarded to `<ino-modal [draggable]>` |
| `closeOnEscape` | `boolean` | `true` | Forwarded to `<ino-modal [closeOnEscape]>` |
| `closeOnBackdrop` | `boolean` | `true` | Forwarded to `<ino-modal [closeOnBackdrop]>` |

### `InoDynamicDialogRef<R>`

| Member | Type | Notes |
|---|---|---|
| `onClose` | `Promise<R \| undefined>` | Resolves once, when the dialog closes. `undefined` for every dismissal the opened component didn't explicitly resolve (Escape, backdrop, superseded by a second `open()`) |
| `close` | `close(result?: R): void` | Called from inside the opened component to resolve `onClose` and tear the dialog down |

### Injected into the opened component

| Token | Type | Notes |
|---|---|---|
| `InoDynamicDialogRef` | class token | The same instance `open()` returned to the caller |
| `INO_DYNAMIC_DIALOG_DATA` | `InjectionToken<unknown>` | `config.data`; cast to your own data type at the injection site |

`<ino-dynamic-dialog>` itself has no `@Input`/`@Output` — it is a slot, not a configurable
component. Everything above is driven through the service.

---

## Variants

None beyond `InoDynamicDialogConfig`'s fields — every visual variant (`size`, `maximizable`,
`draggable`) is `<ino-modal>`'s own, just reachable through config instead of template bindings.
See `../06-angular-components/modal.md` for the full set.

---

## States

Inherited entirely from `<ino-modal>` — open/closed, maximized, dragging, focus-visible on the
close button, theme/density/RTL. Nothing here adds a state of its own; see `SPEC.md` §1 for why
this component carries no stylesheet.

---

## Sizing

Inherits `<ino-modal>`'s `sm` / `default` / `lg` scale via `InoDynamicDialogConfig.size`, composing
with dense/fluid density the same way a declarative `<ino-modal [size]>` does.

---

## Labels

Inherits `<ino-modal>`'s `heading`/close-button labelling; `heading` is passed through
`InoDynamicDialogConfig.heading`.

---

## Accessibility contract

Inherits the full `<ino-modal>` a11y contract (`role="dialog"`, labelled by `heading`,
`[inoFocusTrap]` keyboard containment, Escape/backdrop dismissal). The one item the doc 26 §5 spec
row calls out explicitly beyond "inherits modal": **focus-return for the service flow**.

No extra code is needed for it. `[inoFocusTrap]`, placed on `<ino-modal>`'s panel, captures
`document.activeElement` the instant the panel mounts — still inside the synchronous continuation
of whatever click/keydown handler called `dialogService.open(...)` — so it captures the control
that triggered the call, exactly the guarantee a declarative `<ino-modal [(open)]="flag">` caller
already relies on. Closing the dialog by any path (`ref.close()` from the opened component,
`<ino-modal>`'s own Escape/backdrop/close-button paths, or a second `open()` superseding it)
restores focus to that same control via the trap's existing teardown. See `SPEC.md` §4 for the full
reasoning.

The opened component receives no implicit a11y wiring beyond what `<ino-modal>` already provides —
if it needs its own `aria-describedby` or form validation messaging, that is the opened component's
own responsibility, same as any content projected into a declarative `<ino-modal>`.

---

## Mobile

Web-only — the doc 26 §5 row disposition. No React Native or Flutter port: a service that opens an
arbitrary component by type, backed by Angular DI and `NgComponentOutlet`, has no analogue in
either mobile stack's navigation model, where the equivalent is presenting a screen/route rather
than opening an overlay component by type. Mirrors `ino-command-menu`/`ino-toolbar`'s web-only
disposition in the same table.

---

## PrimeNG mapping

| PrimeNG | This library |
|---|---|
| `DialogService.open(Component, config)` | `InoDynamicDialogService.open(Component, config)` |
| `DynamicDialogRef` | `InoDynamicDialogRef` |
| `DynamicDialogConfig` | `InoDynamicDialogConfig` + `INO_DYNAMIC_DIALOG_DATA` for `data` |
| `DynamicDialogRef.onClose: Observable` | `InoDynamicDialogRef.onClose: Promise` — opens once, resolves once; no repeat-emission case to justify an `Observable` |
| `<p-dynamicDialog>` | `<ino-dynamic-dialog>` |

---

## Deliberate omissions

- **No dialog stack.** `InoDynamicDialogService` tracks a single `current` entry; a second `open()`
  supersedes the first rather than stacking. A dynamic dialog can still appear over a declarative
  `<ino-modal>` or `<ino-confirm-dialog>` opened independently — `[inoFocusTrap]`'s trap stack
  handles that case by DOM order regardless of which API opened which panel — but two *dynamic*
  dialogs stacked on each other is out of scope for this minimal API layer. See `SPEC.md` §3.
- **No imperative `ViewContainerRef.createComponent()`.** The opened component is mounted via
  `NgComponentOutlet` inside `<ino-dynamic-dialog>`'s existing template, not a hand-rolled
  `ComponentRef` lifecycle — see `SPEC.md` §2 for why that is the simpler, OnPush/zoneless-safe
  choice here.
- **No `@Input` bound to the opened component.** `NgComponentOutlet` has no input-binding surface
  for an arbitrary unknown type; the DI tokens (`InoDynamicDialogRef`, `INO_DYNAMIC_DIALOG_DATA`)
  are the entire data-passing contract, the same two-token shape Angular Material's
  `MatDialogRef`/`MAT_DIALOG_DATA` use.
