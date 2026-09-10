import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoModalComponent } from '@web-app/components/modal/ino-modal.component';
import { InoButtonComponent } from '@web-app/components/button/ino-button.component';

/**
 * `<ino-confirm-action-sheet>` — Modal / bottom-sheet template (`13-mobile-app-patterns.md` §2,
 * inventory row 11 — confirm/delete, quick-create). Not a nav destination — an overlay, always
 * dismissed back to whatever screen presented it, never pushed onto the stack (`app.routes.ts`
 * has no route for this).
 *
 * Thin wrapper around `<ino-modal>` (already `variant="overlay"` +
 * `--ino-color-overlay-scrim`, per that component's own doc comment) rather than a new sheet
 * primitive — the token pairing the pattern doc calls for already exists on `web/`'s modal, so
 * this only adds the confirm/cancel action-row convention on top of it.
 */
@Component({
  selector: 'ino-confirm-action-sheet',
  standalone: true,
  imports: [CommonModule, InoModalComponent, InoButtonComponent],
  templateUrl: './ino-confirm-action-sheet.component.html',
  styleUrl: './ino-confirm-action-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoConfirmActionSheetComponent {
  @Input() open = false;
  @Input() heading = '';
  @Input() body = '';
  @Input() confirmLabel = 'Delete';
  @Input() cancelLabel = 'Cancel';
  /** Destructive actions render the confirm button as `variant="primary"` with the danger token
   * applied at the host level below — no separate "danger" variant exists on `ino-button` yet. */
  @Input() destructive = true;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();

  protected close(): void {
    this.open = false;
    this.openChange.emit(false);
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.close();
  }
}
