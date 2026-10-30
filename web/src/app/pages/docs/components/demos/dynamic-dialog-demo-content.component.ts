import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoButtonComponent } from '../../../../components/button/ino-button.component';
import {
  INO_DYNAMIC_DIALOG_DATA,
  InoDynamicDialogRef,
} from '../../../../services/dynamic-dialog.service';

/**
 * The component `InoDynamicDialogService.open()` mounts for the `ino-dynamic-dialog` docs demo
 * (`dynamic-dialog-demo.component.ts`, registered via `CUSTOM_DEMOS`). Stands in for "any
 * caller-supplied component" — reads `INO_DYNAMIC_DIALOG_DATA` to show the config its opener
 * passed, and calls `InoDynamicDialogRef.close(result)` itself rather than going through
 * `<ino-modal>`, demonstrating the DI surface documented in `../../../../components/dynamic-dialog/SPEC.md` §3.
 */
@Component({
  selector: 'app-dynamic-dialog-demo-content',
  standalone: true,
  imports: [CommonModule, InoButtonComponent],
  template: `
    <p class="demo-dialog-content__data">Opened with data: <code>{{ data | json }}</code></p>
    <div class="demo-dialog-content__actions">
      <button ino-button variant="secondary" size="default" (click)="ref.close()">Cancel</button>
      <button ino-button variant="primary" size="default" (click)="ref.close({ confirmed: true })">
        Confirm
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .demo-dialog-content__data {
        margin: 0 0 var(--ino-space-4);
      }
      .demo-dialog-content__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--ino-space-3);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicDialogDemoContentComponent {
  protected readonly ref = inject(InoDynamicDialogRef);
  protected readonly data = inject(INO_DYNAMIC_DIALOG_DATA);
}
