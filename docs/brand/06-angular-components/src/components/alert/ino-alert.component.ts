import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type InoAlertStatus = 'success' | 'warning' | 'danger';
export type InoAlertVariant = 'inline' | 'banner' | 'toast';

const STATUS_LABEL: Record<InoAlertStatus, string> = {
  success: 'Success',
  warning: 'Warning',
  danger: 'Error',
};

const STATUS_ICON: Record<InoAlertStatus, string> = {
  success: '✓',
  warning: '!',
  danger: '✕',
};

/**
 * `<ino-alert>` — the shared visual for inline alert, full-width banner, and toast; `variant`
 * only changes layout (border-radius/max-width/shadow), never color logic, so the three named
 * shapes in the issue don't fork into three components with drifting token usage. `status` is a
 * closed union bound to the *existing* `--ino-color-success/-warning/-danger` role pairs
 * (09-design-system-standards.md §5) — filled solidly, not tinted, so the shipped AA contrast
 * pairs apply unmodified; no new "tint" token was invented for this.
 *
 * Renders `role="alert"` (assertive) for `danger`, `role="status"` (polite) otherwise, per the
 * WAI-ARIA live-region severity convention — and a screen-reader-only status word ahead of the
 * message so meaning never depends on color alone.
 *
 * Toast stacking/auto-dismiss timing lives in `ToastService` + `<ino-toast-container>`, not here
 * — this component stays a plain, presentational, reusable-inline-too building block.
 */
@Component({
  selector: 'ino-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-alert.component.html',
  styleUrl: './ino-alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoAlertComponent {
  @Input() status: InoAlertStatus = 'success';
  @Input() variant: InoAlertVariant = 'inline';
  @Input() heading = '';
  @Input() dismissible = false;

  @Output() dismissed = new EventEmitter<void>();

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusIcon = STATUS_ICON;

  protected get role(): 'alert' | 'status' {
    return this.status === 'danger' ? 'alert' : 'status';
  }
}
