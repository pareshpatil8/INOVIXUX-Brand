import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';
import { InoControlSize } from '../control-size';

let drawerIdCounter = 0;

/**
 * `<ino-drawer>` — edge-anchored overlay panel (INO-31 T-24). Parity benchmark: PrimeNG 22.1.1
 * `Drawer` (`specs/primeng/llms-22.1.1.txt` line 57, `https://primeng.dev/drawer`). PrimeNG is a
 * benchmark, not a runtime dependency — nothing here imports it.
 *
 * Adopts `[inoFocusTrap]` (T-11) rather than hand-rolling containment a second time, per the
 * directive's own SPEC.md: `<ino-modal>` is the one remaining hand-rolled implementation, kept
 * as-is because re-plumbing it is out of this issue's scope.
 *
 * Two-way binding: `[(open)]="flag"`. Escape/backdrop-click/the close button all flip `open` to
 * `false` locally and emit `openChange`/`closed` — same contract as `<ino-modal>`.
 */
@Component({
  selector: 'ino-drawer',
  standalone: true,
  imports: [CommonModule, InoFocusTrapDirective],
  templateUrl: './ino-drawer.component.html',
  styleUrl: './ino-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoDrawerComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() position: 'start' | 'end' | 'top' | 'bottom' = 'end';
  @Input() size: InoControlSize = 'default';
  @Input() heading = '';
  /** `false` renders a persistent, non-blocking panel: no scrim, no focus trap, no scroll lock. */
  @Input() modal = true;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  @Input() loading = false;

  @Output() closed = new EventEmitter<void>();
  @Output() openChange = new EventEmitter<boolean>();

  @ViewChild('panel') private panelRef?: ElementRef<HTMLElement>;

  protected readonly headingId = `ino-drawer-heading-${++drawerIdCounter}`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['modal']) {
      this.syncScrollLock();
    }
  }

  ngOnDestroy(): void {
    if (this.open && this.modal && typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape) {
      event.stopPropagation();
      this.requestClose();
    }
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.requestClose();
    }
  }

  requestClose(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.openChange.emit(false);
    this.closed.emit();
    this.syncScrollLock();
  }

  private syncScrollLock(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.style.overflow = this.open && this.modal ? 'hidden' : '';
  }
}
