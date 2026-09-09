import { Injectable, signal } from '@angular/core';

import { InoAlertStatus } from '../components/alert/ino-alert.component';

export interface InoToastConfig {
  status?: InoAlertStatus;
  heading?: string;
  message: string;
  /** ms before auto-dismiss; 0 disables auto-dismiss. Default 5000. */
  durationMs?: number;
}

export interface InoToastItem {
  id: number;
  status: InoAlertStatus;
  heading?: string;
  message: string;
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
    const item: InoToastItem = {
      id,
      status: config.status ?? 'success',
      heading: config.heading,
      message: config.message,
    };
    this.toasts.update((list) => [...list, item]);

    const duration = config.durationMs ?? 5000;
    if (typeof window !== 'undefined' && duration > 0) {
      window.setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
