import { Injectable, signal } from '@angular/core';

import { InoAlertStatus } from '../components/alert/ino-alert.component';

export interface InoToastConfig {
  status?: InoAlertStatus;
  heading?: string;
  message: string;
  /** ms before auto-dismiss; 0 disables auto-dismiss. Default 5000 (--ino-dwell-duration-toast,
   *  matching Flutter's InoDwell.toast, INO-174). Ignored when `sticky` is true. */
  durationMs?: number;
  /**
   * Persistent mode (INO-163 / P-3): no auto-dismiss timer is ever set, regardless of `durationMs`,
   * and the rendered toast carries no close button — see `InoToastContainerComponent`. For
   * approval-blocking messages in a human-in-the-loop flow, the reviewer must not be able to make
   * the notice disappear by clicking past it; only the code path that resolves the approval may
   * call `dismiss(id)`. Default `false`.
   */
  sticky?: boolean;
}

export interface InoToastItem {
  id: number;
  status: InoAlertStatus;
  heading?: string;
  message: string;
  sticky: boolean;
}

let idCounter = 0;

/**
 * `ToastService` — the queue/timing half of the toast pattern; `<ino-toast-container>` renders
 * whatever is in `toasts()` as a stack of `<ino-alert variant="toast">`. Mount ONE
 * `<ino-toast-container>` near the app root (this service is `providedIn: 'root'`, so the queue
 * is shared no matter how many places call `show()`).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<InoToastItem[]>([]);

  show(config: InoToastConfig): number {
    const id = ++idCounter;
    const sticky = config.sticky ?? false;
    const item: InoToastItem = {
      id,
      status: config.status ?? 'success',
      heading: config.heading,
      message: config.message,
      sticky,
    };
    this.toasts.update((list) => [...list, item]);

    const duration = config.durationMs ?? 5000;
    if (!sticky && typeof window !== 'undefined' && duration > 0) {
      window.setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
