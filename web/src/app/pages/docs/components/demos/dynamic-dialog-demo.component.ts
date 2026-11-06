import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoButtonComponent } from '../../../../components/button/ino-button.component';
import { InoDynamicDialogComponent } from '../../../../components/dynamic-dialog/ino-dynamic-dialog.component';
import { InoDynamicDialogService } from '../../../../services/dynamic-dialog.service';
import { DynamicDialogDemoContentComponent } from './dynamic-dialog-demo-content.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-dynamic-dialog` (INO-447). The generic
 * renderer (`docs-component-detail.component.ts`) mounts a component via `*ngComponentOutlet` with
 * `@Input` bindings only — `<ino-dynamic-dialog>` has none (it is a slot driven entirely by
 * `InoDynamicDialogService`, see `../../../../components/dynamic-dialog/SPEC.md`), so the generic
 * path would render an empty, permanently-closed `<ino-modal>` with nothing to demonstrate.
 * Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * Every "open" button below calls the same `InoDynamicDialogService.open()` the narrative doc's
 * code sample shows, passing `DynamicDialogDemoContentComponent` as the caller-supplied component
 * and reporting the resolved `onClose` result live underneath — the "config API, result promise"
 * contract from the doc 26 §5 spec row.
 */
@Component({
  selector: 'app-dynamic-dialog-demo',
  standalone: true,
  imports: [CommonModule, InoButtonComponent, InoDynamicDialogComponent],
  templateUrl: './dynamic-dialog-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicDialogDemoComponent {
  private readonly dialogService = inject(InoDynamicDialogService);

  protected lastResult = '(none yet)';

  protected async openDefault(): Promise<void> {
    const ref = this.dialogService.open(DynamicDialogDemoContentComponent, {
      heading: 'Confirm action',
      data: { recordId: 'TXN-4471' },
    });
    this.lastResult = this.describe(await ref.onClose);
  }

  protected async openLarge(): Promise<void> {
    const ref = this.dialogService.open(DynamicDialogDemoContentComponent, {
      heading: 'Large, maximizable, draggable',
      size: 'lg',
      maximizable: true,
      draggable: true,
      data: { recordId: 'TXN-9002' },
    });
    this.lastResult = this.describe(await ref.onClose);
  }

  protected async openUndismissable(): Promise<void> {
    const ref = this.dialogService.open(DynamicDialogDemoContentComponent, {
      heading: 'Escape and backdrop disabled',
      closeOnEscape: false,
      closeOnBackdrop: false,
      data: { recordId: 'TXN-1187' },
    });
    this.lastResult = this.describe(await ref.onClose);
  }

  protected openSuperseded(): void {
    this.dialogService.open(DynamicDialogDemoContentComponent, {
      heading: 'First (about to be superseded)',
      data: { recordId: 'TXN-0001' },
    });
    this.dialogService.open(DynamicDialogDemoContentComponent, {
      heading: 'Second — supersedes the first',
      data: { recordId: 'TXN-0002' },
    });
  }

  private describe(result: unknown): string {
    return result === undefined ? 'undefined (dismissed, not confirmed)' : JSON.stringify(result);
  }
}
