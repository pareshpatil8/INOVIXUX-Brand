import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoAlertComponent } from '../alert/ino-alert.component';
import { ToastService } from '../../services/toast.service';

/**
 * `<ino-toast-container>` — mount once near the app root. Renders `ToastService`'s queue as a
 * fixed bottom-right stack of dismissible `<ino-alert variant="toast">`s, positioned clear of the
 * mobile safe-area inset (`--ino-safe-area-bottom`, tokens.css §11). `aria-live="polite"` on the
 * stack (not per-toast) so screen readers announce new toasts without needing focus moved to them.
 *
 * Enter/exit motion uses Angular's built-in `animate.enter` / `animate.leave` class bindings
 * (no `@angular/animations` dependency). Deliberately not a local "leaving" flag: `ToastService`
 * also removes toasts on its own auto-dismiss timer, and `animate.leave` keeps the node alive for
 * the exit animation no matter which path removed it, so this container never has to be the only
 * removal route. Keyframes and the `prefers-reduced-motion` branch live in the stylesheet.
 */
@Component({
  selector: 'ino-toast-container',
  standalone: true,
  imports: [CommonModule, InoAlertComponent],
  templateUrl: './ino-toast-container.component.html',
  styleUrl: './ino-toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoToastContainerComponent {
  private readonly toastService = inject(ToastService);
  protected readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
