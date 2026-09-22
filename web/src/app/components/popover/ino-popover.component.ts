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
import { InoOverlayPosition, computeOverlayPlacement } from './overlay-position';

let popoverIdCounter = 0;

/**
 * `<ino-popover>` — anchored overlay for arbitrary projected content (menus, forms, previews),
 * as opposed to `<ino-confirm-popup>`'s fixed confirm/cancel action pair. Contract: INO-31 T-23 /
 * INO-150. Parity benchmark: PrimeNG 22.1.1 `Popover` (`specs/primeng/llms-22.1.1.txt` line 96,
 * route `https://primeng.dev/popover`) — a benchmark only, nothing here imports it.
 *
 * Shares its placement primitive with `<ino-confirm-popup>` (forked, not imported — see
 * `./overlay-position.ts`'s doc comment for why) and its focus-containment primitive with
 * `<ino-modal>` / Drawer / ConfirmDialog (`[inoFocusTrap]`, whose own doc comment names Popover as
 * one of its four intended consumers).
 *
 * Usage — call `toggle()`/`show()` from the trigger's own handler (PrimeNG-style, anchor inferred
 * from the event) or drive `[(open)]` directly and pass `[target]` yourself:
 * ```html
 * <button #anchor type="button" (click)="pop.toggle($event)">Filters</button>
 * <ino-popover #pop heading="Filters">
 *   <p>Arbitrary projected content goes here.</p>
 * </ino-popover>
 * ```
 *
 * `role="dialog"` without `aria-modal`: the page behind the panel stays visible and
 * mouse-operable, so `aria-modal="true"` would misdescribe it, same reasoning as
 * `<ino-confirm-popup>`'s `role="alertdialog"` choice (see that component's SPEC.md §4). `dialog`
 * rather than `alertdialog` here because arbitrary projected content is not inherently an
 * interruption demanding a response, unlike a confirm/cancel prompt. `[inoFocusTrap]` still
 * confines *keyboard* focus while open, and hands focus back to the anchor on close for free via
 * `restoreFocus` (the directive's default).
 *
 * An accessible name is required (DoD row 8): pass `heading` (renders a visible header and drives
 * `aria-labelledby`) or `ariaLabel` (invisible name only, for content that already reads as
 * self-describing without a header). Neither is enforced at compile time — see SPEC.md §4.
 */
@Component({
  selector: 'ino-popover',
  standalone: true,
  imports: [CommonModule, InoButtonComponent, InoFocusTrapDirective],
  templateUrl: './ino-popover.component.html',
  styleUrl: './ino-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size',
  },
})
export class InoPopoverComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() target: HTMLElement | ElementRef<HTMLElement> | null = null;
  @Input() position: InoOverlayPosition = 'bottom';
  @Input() size: InoControlSize = 'default';
  @Input() heading = '';
  @Input() ariaLabel = '';
  @Input({ transform: booleanAttribute }) dismissable = true;
  @Input({ transform: booleanAttribute }) closeOnEscape = true;
  @Input({ transform: booleanAttribute }) showCloseIcon = false;
  @Input() closeLabel = 'Close';

  @Output() openChange = new EventEmitter<boolean>();
  @Output() shown = new EventEmitter<void>();
  @Output() hidden = new EventEmitter<void>();

  @ViewChild('panel') private panelRef?: ElementRef<HTMLElement>;

  protected readonly headingId = `ino-popover-heading-${++popoverIdCounter}`;
  protected top = 0;
  protected left = 0;
  protected effectivePosition: InoOverlayPosition = this.position;

  private readonly zone = inject(NgZone);
  private anchorEl: HTMLElement | null = null;
  private outsideClickBound = false;

  private readonly onWindowChange = (): void => this.reposition();
  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.dismissable) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (this.panelRef?.nativeElement.contains(target) || this.anchorEl?.contains(target)) {
      return;
    }
    this.close();
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
   * from `event.currentTarget`, so a caller doesn't have to also wire up `[target]` separately for
   * the common case. `anchor` is available for the rare case the visual anchor isn't the element
   * that received the click (e.g. a row action inside a table cell).
   */
  show(event?: Event, anchor?: HTMLElement): void {
    if (this.open) {
      return;
    }
    this.anchorEl = anchor ?? (event?.currentTarget as HTMLElement | null) ?? this.resolveTarget();
    this.open = true;
    this.openChange.emit(true);
    this.activate();
  }

  hide(): void {
    this.close();
  }

  toggle(event?: Event, anchor?: HTMLElement): void {
    if (this.open) {
      this.close();
      return;
    }
    this.show(event, anchor);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape) {
      event.stopPropagation();
      this.close();
    }
  }

  private close(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.openChange.emit(false);
    this.hidden.emit();
    this.deactivate();
  }

  private activate(): void {
    this.anchorEl ??= this.resolveTarget();
    // Panel content isn't laid out on this tick yet — same deferral <ino-modal> and
    // <ino-confirm-popup> use before measuring/focusing their panel.
    queueMicrotask(() => {
      this.reposition();
      this.shown.emit();
    });

    window.addEventListener('resize', this.onWindowChange);
    window.addEventListener('scroll', this.onWindowChange, true);

    if (!this.outsideClickBound && typeof document !== 'undefined') {
      // Registered outside Angular and on the next macrotask, not this one: the click that just
      // opened the popover (e.g. from `toggle()`) is still bubbling to `document` on this same
      // tick, and a listener added synchronously would see that click and close the popover
      // immediately. Same guard as <ino-confirm-popup>.
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
