import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';
import { InoButtonComponent } from '../button/ino-button.component';
import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';
import { InoConfirmSeverity } from '../confirm-dialog/ino-confirm-dialog.component';
import { InoOverlayPosition, computeOverlayPlacement } from './overlay-position';

let popupIdCounter = 0;

/**
 * `<ino-confirm-popup>` — inline confirm/cancel prompt anchored next to a trigger element, instead
 * of `<ino-confirm-dialog>`'s centered backdrop panel. Contract: INO-31 T-25 / INO-148. Parity
 * benchmark: PrimeNG 22.1.1 `ConfirmPopup` (`specs/primeng/llms-22.1.1.txt`) — a benchmark only,
 * nothing here imports it.
 *
 * Shares the confirm/cancel action contract and `InoConfirmSeverity` type with
 * `<ino-confirm-dialog>` (same buttons, same severity axis) but is a genuinely different surface,
 * not a themed variant of it: no scrim, no viewport-centered panel, and it positions itself
 * relative to an anchor element via `computeOverlayPlacement` (`./overlay-position.ts`) — the
 * reusable core this issue exists partly to establish for Tooltip (T-22) and Popover (T-23).
 *
 * Usage — either call `toggle()` from the trigger's own handler (PrimeNG-style, anchor inferred
 * from the event) or drive `[(open)]` directly and pass `[target]` yourself:
 * ```html
 * <button #anchor type="button" (click)="popup.toggle($event)">Delete</button>
 * <ino-confirm-popup #popup message="Delete this item?" (confirmed)="onDelete()" />
 * ```
 *
 * `role="alertdialog"` without `aria-modal` (DoD row 8 — see SPEC.md for the full justification):
 * the page behind the popup stays visible and mouse-operable, unlike `<ino-confirm-dialog>`'s
 * backdrop-blocked page, so `aria-modal="true"` would misdescribe it. `[inoFocusTrap]` still
 * confines *keyboard* focus while it is open — a non-modal surface can still choose to keep Tab
 * from wandering into now-partially-obscured content, and `restoreFocus` (the directive's default)
 * hands focus back to the anchor on close for free.
 */
@Component({
  selector: 'ino-confirm-popup',
  standalone: true,
  imports: [CommonModule, InoButtonComponent, InoFocusTrapDirective],
  templateUrl: './ino-confirm-popup.component.html',
  styleUrl: './ino-confirm-popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size',
  },
})
export class InoConfirmPopupComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() target: HTMLElement | ElementRef<HTMLElement> | null = null;
  @Input() position: InoOverlayPosition = 'bottom';
  @Input() heading = '';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() severity: InoConfirmSeverity = 'default';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) closeOnEscape = true;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() openChange = new EventEmitter<boolean>();

  @ViewChild('panel') private panelRef?: ElementRef<HTMLElement>;

  protected readonly headingId = `ino-confirm-popup-heading-${++popupIdCounter}`;
  protected readonly messageId = `ino-confirm-popup-message-${popupIdCounter}`;
  protected top = 0;
  protected left = 0;
  protected effectivePosition: InoOverlayPosition = this.position;

  private readonly zone = inject(NgZone);
  private anchorEl: HTMLElement | null = null;
  private outsideClickBound = false;

  private readonly onWindowChange = (): void => this.reposition();
  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (this.panelRef?.nativeElement.contains(target) || this.anchorEl?.contains(target)) {
      return;
    }
    this.requestCancel();
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.activate();
      } else {
        this.deactivate();
      }
    }
  }

  ngOnDestroy(): void {
    this.deactivate();
  }

  /**
   * PrimeNG-style convenience entry point: pass the triggering event and the anchor is inferred
   * from `event.currentTarget`, so a caller doesn't have to also wire up `[target]` and `[(open)]`
   * separately for the common case. `anchor` is available for the rare case the visual anchor
   * isn't the element that received the click (e.g. a row action inside a table cell).
   */
  toggle(event?: Event, anchor?: HTMLElement): void {
    if (this.open) {
      this.requestCancel();
      return;
    }
    this.anchorEl = anchor ?? (event?.currentTarget as HTMLElement | null) ?? this.resolveTarget();
    this.open = true;
    this.openChange.emit(true);
    this.activate();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape && !this.loading) {
      event.stopPropagation();
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
    this.deactivate();
  }

  private activate(): void {
    this.anchorEl ??= this.resolveTarget();
    // Popup content isn't laid out on this tick yet — same deferral <ino-modal> uses before
    // measuring/focusing its panel.
    queueMicrotask(() => this.reposition());

    window.addEventListener('resize', this.onWindowChange);
    window.addEventListener('scroll', this.onWindowChange, true);

    if (!this.outsideClickBound && typeof document !== 'undefined') {
      // Registered outside Angular and on the next macrotask, not this one: the click that just
      // opened the popup (e.g. from `toggle()`) is still bubbling to `document` on this same tick,
      // and a listener added synchronously would see that click and close the popup immediately.
      this.zone.runOutsideAngular(() => {
        setTimeout(() => {
          document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
        });
      });
      this.outsideClickBound = true;
    }
  }

  private deactivate(): void {
    window.removeEventListener('resize', this.onWindowChange);
    window.removeEventListener('scroll', this.onWindowChange, true);
    if (this.outsideClickBound) {
      document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
      this.outsideClickBound = false;
    }
  }

  private resolveTarget(): HTMLElement | null {
    if (!this.target) {
      return null;
    }
    return this.target instanceof ElementRef ? this.target.nativeElement : this.target;
  }

  private reposition(): void {
    const anchor = this.anchorEl;
    const panel = this.panelRef?.nativeElement;
    if (!anchor || !panel || typeof window === 'undefined') {
      return;
    }
    const placement = computeOverlayPlacement(
      anchor.getBoundingClientRect(),
      { width: panel.offsetWidth, height: panel.offsetHeight },
      this.position,
      { width: window.innerWidth, height: window.innerHeight },
      8,
    );
    this.top = placement.top;
    this.left = placement.left;
    this.effectivePosition = placement.position;
  }
}
