import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { InoOverlayPosition, computeOverlayPlacement } from '../overlay/overlay-position';

let popoverIdCounter = 0;

/**
 * `<ino-popover>` — anchored overlay for arbitrary projected content (menus, forms, previews),
 * as opposed to `<ino-confirm-popup>`'s fixed confirm/cancel action pair. Contract: INO-31 T-23 /
 * INO-150. Parity benchmark: PrimeNG 22.1.1 `Popover` (`specs/primeng/llms-22.1.1.txt` line 96,
 * route `https://primeng.dev/popover`) — a benchmark only, nothing here imports it.
 *
 * Shares its placement primitive (`../overlay/overlay-position.ts`, INO-271) with
 * `<ino-confirm-popup>` and `[inoTooltip]`, and its focus-containment primitive with
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
  private readonly cdr = inject(ChangeDetectorRef);
  private anchorEl: HTMLElement | null = null;
  private outsideClickBound = false;
  /**
   * Tracks the actual open/closed state, independent of the `open` @Input — Angular writes the
   * new input value before `ngOnChanges` runs, so comparing against `this.open` there would always
   * look like a no-op. See `../overlay/SPEC.md` §2 for the full event-contract rule this exists to
   * implement (fire `shown`/`hidden` exactly once per real transition, regardless of the path).
   */
  private isOpenState = false;

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
      this.setOpen(this.open);
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
    if (this.isOpenState) {
      return;
    }
    this.anchorEl = anchor ?? (event?.currentTarget as HTMLElement | null) ?? this.resolveTarget();
    this.setOpen(true);
  }

  hide(): void {
    this.close();
  }

  toggle(event?: Event, anchor?: HTMLElement): void {
    if (this.isOpenState) {
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
    this.setOpen(false);
  }

  /**
   * The single choke point every path that can change `open` funnels through — imperative
   * `show()`/`close()`, and the `[(open)]`-bound input path via `ngOnChanges`. See
   * `../overlay/SPEC.md` §2.
   */
  private setOpen(next: boolean): void {
    this.open = next;
    if (this.isOpenState === next) {
      return;
    }
    this.isOpenState = next;
    this.openChange.emit(next);
    if (next) {
      this.shown.emit();
      this.activate();
    } else {
      this.hidden.emit();
      this.deactivate();
    }
    this.cdr.markForCheck();
  }

  private activate(): void {
    this.anchorEl ??= this.resolveTarget();
    // Zone drains microtasks before ApplicationRef.tick(), so a queueMicrotask callback here
    // would run before the panel's *ngIf view is attached and `panelRef` would still be
    // undefined. setTimeout runs after the tick, once `#panel` actually exists in the DOM —
    // consistent with the setTimeout already used below for the pointerdown listener.
    setTimeout(() => {
      this.reposition();
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
    this.cdr.markForCheck();
  }
}
