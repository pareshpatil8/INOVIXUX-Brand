import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';
import { InoCardComponent } from '../card/ino-card.component';
import { InoButtonComponent } from '../button/ino-button.component';
import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';

let dialogIdCounter = 0;

export type InoConfirmSeverity = 'default' | 'danger';

/**
 * `<ino-confirm-dialog>` — centered, backdrop-modal confirm/cancel prompt. Contract: INO-31 T-25 /
 * INO-148. Parity benchmark: PrimeNG 22.1.1 `ConfirmDialog` (`specs/primeng/llms-22.1.1.txt`) — a
 * benchmark only, nothing here imports it.
 *
 * A smaller, opinionated sibling of `<ino-modal>` (INO-83/U-7), not a re-implementation: it reuses
 * `<ino-card variant="overlay">` for the panel, the same scrim-div-over-`--ino-color-overlay-scrim`
 * pairing, and `[inoFocusTrap]` (INO-130/T-11) instead of hand-rolling tab containment a second
 * time. What's different is the footer — this component owns exactly two actions (confirm/cancel)
 * rendered as `<button ino-button>`, not a generic content projector for arbitrary footers.
 *
 * `role="alertdialog"`, not `role="dialog"` (DoD row 8): the WAI-ARIA APG reserves `alertdialog`
 * for a modal that interrupts the user to demand a response before anything else can proceed,
 * which is exactly what a confirm prompt is — `dialog` is for a modal that merely contains
 * unrelated content. `aria-describedby` targets the message when `message` is set; a projected
 * custom body has unknown structure to point at, so that case is left to the caller (see SPEC.md).
 *
 * `[(open)]="flag"` two-way binding contract, matching `<ino-modal>`: Escape/backdrop-click/Cancel
 * all flip `open` to `false` locally and emit `openChange`/`cancelled`. Both dismissal routes are
 * suppressed while `loading` — an in-flight confirm handler must run to completion or throw before
 * the surface can be dismissed out from under it.
 *
 * Focus capture/restore/initial-focus is entirely `[inoFocusTrap]`'s job, not re-implemented here:
 * the panel is only present in the DOM while `open`, so the directive's own `ngOnInit`/`ngOnDestroy`
 * line up exactly with this component's open/close transitions.
 */
@Component({
  selector: 'ino-confirm-dialog',
  standalone: true,
  imports: [CommonModule, InoCardComponent, InoButtonComponent, InoFocusTrapDirective],
  templateUrl: './ino-confirm-dialog.component.html',
  styleUrl: './ino-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size',
  },
})
export class InoConfirmDialogComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() heading = '';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() severity: InoConfirmSeverity = 'default';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) closeOnEscape = true;
  @Input({ transform: booleanAttribute }) closeOnBackdrop = true;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() openChange = new EventEmitter<boolean>();

  protected readonly headingId = `ino-confirm-dialog-heading-${++dialogIdCounter}`;
  protected readonly messageId = `ino-confirm-dialog-message-${dialogIdCounter}`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && typeof document !== 'undefined') {
      document.body.style.overflow = this.open ? 'hidden' : '';
    }
  }

  ngOnDestroy(): void {
    if (this.open && typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape && !this.loading) {
      event.stopPropagation();
      this.requestCancel();
    }
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop && !this.loading) {
      this.requestCancel();
    }
  }

  onConfirm(): void {
    if (this.loading) {
      return;
    }
    this.confirmed.emit();
  }

  requestCancel(): void {
    if (!this.open || this.loading) {
      return;
    }
    this.open = false;
    this.openChange.emit(false);
    this.cancelled.emit();
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}
