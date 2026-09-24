import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoAlertComponent } from '../alert/ino-alert.component';
import { ToastService } from '../../services/toast.service';

/** The 6 standard corners/edges (INO-163 / N-8). No `center` option — see SPEC.md §1. */
export type InoToastPosition =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

/**
 * `<ino-toast-container>` — mount once near the app root. Renders `ToastService`'s queue as a
 * fixed stack of `<ino-alert variant="toast">`s anchored to `position` (default `bottom-end`,
 * the pre-INO-163 fixed placement), clear of the mobile safe-area insets
 * (`--ino-safe-area-{top,bottom}`, tokens.css §11). `aria-live="polite"` on the stack (not
 * per-toast) so screen readers announce new toasts without needing focus moved to them.
 *
 * A `sticky` toast (`ToastService`'s `sticky` config, INO-163 / P-3) renders without a dismiss
 * button — only the code path that resolves the underlying approval may remove it via
 * `dismiss(id)`. That is the persistence mechanism, not a visual-only flag: a reviewer must not be
 * able to click an approval-blocking notice away.
 *
 * Enter/exit motion uses Angular's built-in `animate.enter` / `animate.leave` class bindings
 * (no `@angular/animations` dependency). Deliberately not a local "leaving" flag: `ToastService`
 * also removes toasts on its own auto-dismiss timer, and `animate.leave` keeps the node alive for
 * the exit animation no matter which path removed it, so this container never has to be the only
 * removal route. Keyframes (including the top-anchored reverse direction) and the
 * `prefers-reduced-motion` branch live in the stylesheet.
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

  @Input() position: InoToastPosition = 'bottom-end';

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
