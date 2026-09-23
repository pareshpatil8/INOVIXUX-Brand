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
  booleanAttribute,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoCardComponent } from '../card/ino-card.component';
import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';
import { InoControlSize } from '../control-size';

let modalIdCounter = 0;

/** Minimum on-screen overlap (px) a dragged panel must keep on each axis — see `clampDrag()`. */
const DRAG_VISIBLE_MARGIN = 80;

/**
 * `<ino-modal>` — dialog / bottom-sheet shell. Contract: INO-83, per
 * 02-design-tokens/angular-theme-contract.md §4 ("spartan/ui provides behavior only") — no
 * spartan/ui dependency has actually been adopted into this repo yet.
 *
 * Composes `<ino-card variant="overlay">` for the panel (`--ino-elevation-2`,
 * `--ino-color-surface-raised`) plus its own scrim div bound to `--ino-color-overlay-scrim`,
 * exactly the token pairing named in the issue — this component does not invent new surface/
 * elevation values.
 *
 * Two-way binding contract: use `[(open)]="flag"` from the caller (same for `[(maximized)]`). If
 * the caller only does a one-way `[open]="flag"` without also handling `openChange`, the next
 * change-detection pass will re-open the modal from the stale parent value — same contract as any
 * other Angular two-way-bindable component (e.g. `mat-dialog`-style open flags).
 *
 * Focus behavior (INO-31 U-7 / P-1): delegated entirely to `[inoFocusTrap]` (T-11) on the panel,
 * which contains Tab/Shift+Tab, moves initial focus inside and restores it on close/destroy —
 * this component no longer hand-rolls any of that. `Escape` stays here because only the dialog
 * itself knows whether `closeOnEscape` applies; the trap deliberately owns no dismissal keys.
 */
@Component({
  selector: 'ino-modal',
  standalone: true,
  imports: [CommonModule, InoCardComponent, InoFocusTrapDirective],
  templateUrl: './ino-modal.component.html',
  styleUrl: './ino-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoModalComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() heading = '';
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;

  /** Wave 0 control-height scale (INO-124). Drives panel width and the header icon-button box —
   * never a locally invented pixel value for those two fields; see SPEC.md §2 row 3. */
  @Input() size: InoControlSize = 'default';

  /** Shows the maximize/restore toggle in the header. Off by default — most dialogs (confirm,
   * short forms) have no use for it and PrimeNG's own Dialog defaults it off too. */
  @Input({ transform: booleanAttribute }) maximizable = false;

  /** Two-way: `[(maximized)]`. Ignored while `maximizable` is false. */
  @Input({ transform: booleanAttribute }) maximized = false;
  @Output() maximizedChange = new EventEmitter<boolean>();

  /** Lets the panel be repositioned by dragging its header. Suspended automatically while
   * `maximized` — a maximized panel has nowhere to go. */
  @Input({ transform: booleanAttribute }) draggable = false;

  @Output() closed = new EventEmitter<void>();
  @Output() openChange = new EventEmitter<boolean>();

  @ViewChild('panel') private panelRef?: ElementRef<HTMLElement>;

  protected readonly headingId = `ino-modal-heading-${++modalIdCounter}`;

  /** Drag offset, in px, applied as `translate3d`. A signal because pointer move/up are raw
   * `document` listeners (needed so a fast drag that leaves the header keeps tracking) rather
   * than Angular-bound template events, and this app runs zoneless — see focus-trap/SPEC.md §7
   * for the same "plain field write from outside a template binding never repaints" trap. */
  private readonly drag = signal({ x: 0, y: 0, active: false });
  protected readonly dragging = computed(() => this.drag().active);
  protected readonly panelTransform = computed(() => {
    const { x, y } = this.drag();
    return x || y ? `translate3d(${x}px, ${y}px, 0)` : null;
  });

  private dragStartPointer = { x: 0, y: 0 };
  private dragStartOffset = { x: 0, y: 0 };
  private dragStartRect: DOMRect | null = null;
  private dragPointerId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      this.syncOpenState();
    }
  }

  ngOnDestroy(): void {
    this.endDrag();
    if (this.open && typeof document !== 'undefined') {
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
    this.syncOpenState();
  }

  toggleMaximize(): void {
    if (!this.maximizable) {
      return;
    }
    this.endDrag();
    this.drag.set({ x: 0, y: 0, active: false });
    this.maximized = !this.maximized;
    this.maximizedChange.emit(this.maximized);
  }

  protected onHeaderPointerDown(event: PointerEvent): void {
    if (!this.draggable || this.maximized || event.button !== 0) {
      return;
    }
    if ((event.target as HTMLElement).closest('button')) {
      // Let the close/maximize buttons handle their own click — don't start a drag under them.
      return;
    }
    const panel = this.panelRef?.nativeElement;
    if (!panel) {
      return;
    }

    this.dragPointerId = event.pointerId;
    this.dragStartPointer = { x: event.clientX, y: event.clientY };
    this.dragStartOffset = { x: this.drag().x, y: this.drag().y };
    this.dragStartRect = panel.getBoundingClientRect();
    this.drag.update((d) => ({ ...d, active: true }));

    document.addEventListener('pointermove', this.onDragMove);
    document.addEventListener('pointerup', this.onDragEnd);
    document.addEventListener('pointercancel', this.onDragEnd);
  }

  private readonly onDragMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragPointerId || !this.dragStartRect) {
      return;
    }
    const dx = event.clientX - this.dragStartPointer.x;
    const dy = event.clientY - this.dragStartPointer.y;
    const { x, y } = this.clampDrag(this.dragStartOffset.x + dx, this.dragStartOffset.y + dy);
    this.drag.set({ x, y, active: true });
  };

  private readonly onDragEnd = (): void => {
    this.drag.update((d) => ({ ...d, active: false }));
    this.endDrag();
  };

  /** Keeps at least `DRAG_VISIBLE_MARGIN` px of the panel reachable on every edge, so a dialog
   * dragged toward a corner can never be lost entirely off-screen (it has no scrollbar of its
   * own to recover it with). */
  private clampDrag(x: number, y: number): { x: number; y: number } {
    const rect = this.dragStartRect;
    if (!rect || typeof window === 'undefined') {
      return { x, y };
    }
    const minX = DRAG_VISIBLE_MARGIN - rect.right;
    const maxX = window.innerWidth - DRAG_VISIBLE_MARGIN - rect.left;
    const minY = DRAG_VISIBLE_MARGIN - rect.bottom;
    const maxY = window.innerHeight - DRAG_VISIBLE_MARGIN - rect.top;
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }

  private endDrag(): void {
    this.dragPointerId = null;
    this.dragStartRect = null;
    document.removeEventListener('pointermove', this.onDragMove);
    document.removeEventListener('pointerup', this.onDragEnd);
    document.removeEventListener('pointercancel', this.onDragEnd);
  }

  private syncOpenState(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      this.endDrag();
      this.drag.set({ x: 0, y: 0, active: false });
    }
  }
}
