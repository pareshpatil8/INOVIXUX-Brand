import { Injectable, InjectionToken, Type, signal } from '@angular/core';

import { InoControlSize } from '../components/control-size';

/**
 * Config accepted by {@link InoDynamicDialogService.open}. Everything here is a pass-through to
 * the `<ino-modal>` shell `<ino-dynamic-dialog>` renders (INO-31 B2 doc 26 §5 row
 * `ino-dynamic-dialog`: "inherits modal" for sizing/labels/a11y) — this service adds no visual
 * surface or state of its own beyond queuing which component to show. `data` is the one dialog-
 * specific field: it is handed to the opened component via {@link INO_DYNAMIC_DIALOG_DATA}.
 */
export interface InoDynamicDialogConfig<D = unknown> {
  heading?: string;
  data?: D;
  size?: InoControlSize;
  maximizable?: boolean;
  draggable?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

/** Injection token the dynamically-opened component reads `config.data` through. */
export const INO_DYNAMIC_DIALOG_DATA = new InjectionToken<unknown>('INO_DYNAMIC_DIALOG_DATA');

/**
 * Returned by {@link InoDynamicDialogService.open}. `onClose` is a `Promise` (doc 26 §5 row:
 * "result promise"), not an `Observable` — a dynamic dialog opens once and resolves once, so
 * there is no multi-emission case an Observable would earn its keep for. Resolves with
 * `undefined` for every dismissal path the opened component didn't explicitly resolve itself
 * (Escape, backdrop click, the header close button, or a second `open()` call superseding this
 * one) — the same "undefined means cancelled" convention `<ino-confirm-dialog>`'s `cancelled`
 * output uses.
 *
 * The component opened inside the dialog calls `close(result)` to resolve `onClose` with a typed
 * result and tell the host to tear the dialog down; it never touches `<ino-modal>` directly.
 */
export class InoDynamicDialogRef<R = unknown> {
  constructor(
    readonly onClose: Promise<R | undefined>,
    private readonly closeFn: (result?: R) => void,
  ) {}

  close(result?: R): void {
    this.closeFn(result);
  }
}

interface InoDynamicDialogEntry {
  readonly id: number;
  readonly component: Type<unknown>;
  readonly config: InoDynamicDialogConfig<unknown>;
  readonly ref: InoDynamicDialogRef<unknown>;
}

let idCounter = 0;

/**
 * `InoDynamicDialogService` — the queue half of the dynamic-dialog pattern, same split as
 * `ToastService`/`<ino-toast-container>`: this service holds "what to show," `<ino-dynamic-dialog>`
 * (mounted once, wherever a caller needs it) renders `current()` as an `<ino-modal>` hosting the
 * requested component via `NgComponentOutlet`. `providedIn: 'root'`, so every caller and every
 * mounted host share one queue.
 *
 * Only one dynamic dialog is tracked at a time — `open()` while another is already open resolves
 * the previous one's `onClose` with `undefined` before opening the new one, the same "a second
 * confirm supersedes the first" posture a caller would get from any single-slot modal host. A
 * stacked dynamic-dialog-over-dynamic-dialog case is out of scope for this "minimal UI" API layer;
 * `<ino-modal>` itself still composes under `<ino-confirm-dialog>` or another `<ino-modal>` opened
 * declaratively, since `[inoFocusTrap]`'s trap stack (focus-trap/SPEC.md) only cares about DOM
 * order, not which service opened which panel.
 */
@Injectable({ providedIn: 'root' })
export class InoDynamicDialogService {
  private readonly entrySignal = signal<InoDynamicDialogEntry | null>(null);
  readonly current = this.entrySignal.asReadonly();

  open<T, D = unknown, R = unknown>(
    component: Type<T>,
    config: InoDynamicDialogConfig<D> = {},
  ): InoDynamicDialogRef<R> {
    this.dismiss();

    const id = ++idCounter;
    let resolveFn!: (result: R | undefined) => void;
    const onClose = new Promise<R | undefined>((resolve) => {
      resolveFn = resolve;
    });

    const closeFn = (result?: R): void => {
      // Guards against a stale close call from an already-superseded/closed entry (e.g. the
      // opened component's own async handler finishing after a second `open()` already replaced
      // it) resolving or tearing down the *new* dialog instead of a no-op.
      if (this.entrySignal()?.id !== id) {
        return;
      }
      this.entrySignal.set(null);
      resolveFn(result);
    };

    const ref = new InoDynamicDialogRef<R>(onClose, closeFn);
    this.entrySignal.set({
      id,
      component: component as Type<unknown>,
      config: config as InoDynamicDialogConfig<unknown>,
      ref: ref as InoDynamicDialogRef<unknown>,
    });

    return ref;
  }

  /**
   * Closes whatever is currently open, resolving its `onClose` with `undefined`. Called by
   * `<ino-dynamic-dialog>` on every `<ino-modal>` dismissal path (Escape/backdrop/close button)
   * and by `open()` itself to supersede a previous dialog. A no-op when nothing is open.
   */
  dismiss(): void {
    this.entrySignal()?.ref.close();
  }
}
