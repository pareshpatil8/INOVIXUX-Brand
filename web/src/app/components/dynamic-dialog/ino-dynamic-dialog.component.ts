import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoModalComponent } from '../modal/ino-modal.component';
import {
  INO_DYNAMIC_DIALOG_DATA,
  InoDynamicDialogRef,
  InoDynamicDialogService,
} from '../../services/dynamic-dialog.service';

/**
 * `<ino-dynamic-dialog>` — mount once wherever a caller needs it (same contract as
 * `<ino-toast-container>`): this component has no `@Input`/`@Output` of its own, it is a slot
 * that renders whatever `InoDynamicDialogService.open()` queued. Doc 26 §5 row `ino-dynamic-dialog`:
 * "service-opened dialog reusing `ino-modal`; config API, result promise."
 *
 * The entire visual surface is `<ino-modal>` — every size/maximize/drag/close/focus-trap/theme
 * behavior documented in `../modal/SPEC.md` applies unchanged, which is why this component carries
 * no stylesheet of its own (see SPEC.md §1). The opened component is instantiated with
 * `NgComponentOutlet`, not a hand-rolled `ViewContainerRef.createComponent()` call, because a
 * template already exists here to host it declaratively — see SPEC.md §2 for why that is the
 * simpler, OnPush/zoneless-compatible choice over the imperative `ComponentRef` pattern
 * `[inoTooltip]`/`[inoContextMenu]` use from directives with no template of their own.
 *
 * Focus-return for the service flow (doc 26 §5 row's explicit a11y note) needs no code here:
 * `[inoFocusTrap]` on `<ino-modal>`'s panel captures `document.activeElement` the instant the
 * panel mounts, which is still whatever control called `dialogService.open(...)` — the same
 * guarantee a declarative `[(open)]="flag"` caller already relies on. Full reasoning: SPEC.md §3.
 */
@Component({
  selector: 'ino-dynamic-dialog',
  standalone: true,
  imports: [CommonModule, InoModalComponent],
  templateUrl: './ino-dynamic-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoDynamicDialogComponent {
  private readonly service = inject(InoDynamicDialogService);
  private readonly parentInjector = inject(Injector);

  protected readonly entry = this.service.current;

  protected readonly contentInjector = computed(() => {
    const entry = this.entry();
    if (!entry) {
      return null;
    }
    return Injector.create({
      parent: this.parentInjector,
      providers: [
        { provide: InoDynamicDialogRef, useValue: entry.ref },
        { provide: INO_DYNAMIC_DIALOG_DATA, useValue: entry.config.data },
      ],
    });
  });

  protected onModalClosed(): void {
    this.service.dismiss();
  }
}
