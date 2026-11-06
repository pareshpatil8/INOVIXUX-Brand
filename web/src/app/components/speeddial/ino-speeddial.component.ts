import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  InoSpeedDialDirection,
  InoSpeedDialItem,
  InoSpeedDialSize,
  InoSpeedDialType,
} from './ino-speeddial.types';

let nextSpeedDialId = 0;

@Component({
  selector: 'ino-speeddial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-speeddial.component.html',
  styleUrls: ['./ino-speeddial.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoSpeedDialComponent {
  /** Action items revealed when the dial opens */
  @Input() items: InoSpeedDialItem[] = [];

  /** Expansion layout: straight line, full circle, or 90° arc */
  @Input() type: InoSpeedDialType = 'linear';

  /** Expansion direction (linear: up/down/left/right; quarter-circle: corner values) */
  @Input() direction: InoSpeedDialDirection = 'up';

  /** Distance in px from FAB center to action centers (circle / quarter-circle only) */
  @Input() radius = 80;

  /** Renders a full-viewport scrim behind the open dial; clicking it closes the dial */
  @Input() mask = false;

  /** Disables the FAB trigger entirely */
  @Input() disabled = false;

  /** FAB size (sm 36px / md 44px / lg 52px); actions stay one fixed size */
  @Input() size: InoSpeedDialSize = 'md';

  /** Accessible name for the FAB trigger and the action menu */
  @Input() ariaLabel = 'Speed dial';

  /** Glyph shown on the FAB; rotates 45° while open to read as a close affordance */
  @Input() icon = '+';

  /** Emits when the dial opens or closes */
  @Output() openChange = new EventEmitter<boolean>();

  /** Emits when an action is activated */
  @Output() itemClick = new EventEmitter<{
    originalEvent: Event;
    item: InoSpeedDialItem;
  }>();

  /** Whether the action menu is currently expanded */
  open = false;

  /** Index (in full items space) of the roving-tabindex focus target */
  focusedIndex = -1;

  readonly menuId = `ino-speeddial-menu-${nextSpeedDialId++}`;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

  /** Mouse toggle. Keyboard open goes through onFabKeydown so it can move focus. */
  onFabClick(): void {
    if (this.disabled) {
      return;
    }
    if (this.open) {
      this.close(false);
    } else {
      this.show();
    }
  }

  /**
   * APG menu-button pattern: Enter/Space/ArrowDown open and focus the first
   * action; ArrowUp opens and focuses the last. preventDefault on Enter/Space
   * stops the synthetic click from immediately re-toggling.
   */
  onFabKeydown(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open) {
          this.show();
        }
        this.focusItem(0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open) {
          this.show();
        }
        this.focusItem(this.navigableItems().length - 1);
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          this.close(true);
        }
        break;
    }
  }

  /** Opens the dial without moving focus (mouse path). */
  show(): void {
    if (this.open) {
      return;
    }
    this.open = true;
    this.focusedIndex = -1;
    this.openChange.emit(true);
    this.cdr.markForCheck();
  }

  /** Closes the dial; returns focus to the FAB when the close was keyboard-initiated. */
  close(returnFocus: boolean): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.focusedIndex = -1;
    this.openChange.emit(false);
    this.cdr.markForCheck();
    if (returnFocus) {
      this.fabElement()?.focus();
    }
  }

  /** Menu keyboard map: arrows cycle, Home/End jump, Escape closes + focus return, Tab closes. */
  onMenuKeydown(event: KeyboardEvent): void {
    if (!this.open) {
      return;
    }
    const navigable = this.navigableItems();
    if (navigable.length === 0) {
      return;
    }
    const current = navigable.indexOf(this.items[this.focusedIndex]);

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        this.focusItem(current >= 0 ? (current + 1) % navigable.length : 0);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        this.focusItem(
          current >= 0
            ? (current - 1 + navigable.length) % navigable.length
            : navigable.length - 1
        );
        break;
      case 'Home':
        event.preventDefault();
        this.focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusItem(navigable.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        // Natural tab moves on; the menu closes behind it (APG menu pattern).
        this.close(false);
        break;
    }
  }

  onItemActivate(event: Event, item: InoSpeedDialItem): void {
    if (item.disabled) {
      return;
    }
    if (item.command) {
      item.command({ originalEvent: event, item });
    }
    this.itemClick.emit({ originalEvent: event, item });
    this.close(true);
  }

  /** Light-dismiss: any pointer press outside the component closes without stealing focus. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.open && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  /** Roving tabindex: only the focus target (or the first navigable item at rest) is tabbable. */
  tabindexFor(item: InoSpeedDialItem, index: number): string | null {
    if (!this.open || item.disabled) {
      return item.disabled ? null : '-1';
    }
    if (this.focusedIndex >= 0) {
      return index === this.focusedIndex ? '0' : '-1';
    }
    return this.items.indexOf(this.navigableItems()[0]) === index ? '0' : '-1';
  }

  /**
   * Per-action transform for circle / quarter-circle layouts: each action sits
   * on an arc of `radius` px around the FAB center. Linear layouts use flex
   * flow instead and return null.
   */
  actionTransform(index: number): string | null {
    if (this.type === 'linear') {
      return null;
    }
    if (!this.open) {
      return 'translate(-50%, -50%) scale(0.4)';
    }
    const count = this.items.length;
    let angleDeg: number;
    if (this.type === 'circle') {
      angleDeg = -90 + (360 / Math.max(count, 1)) * index;
    } else {
      const [start, end] = this.quarterArc();
      angleDeg = count > 1 ? start + ((end - start) / (count - 1)) * index : start;
    }
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.round(Math.cos(rad) * this.radius);
    const dy = Math.round(Math.sin(rad) * this.radius);
    return `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  }

  /** Stagger reveal: 30ms per action while opening, reversed while closing. */
  actionDelay(index: number): string {
    const step = this.open ? index : this.items.length - 1 - index;
    return `${step * 30}ms`;
  }

  /** Start/end angles (degrees, 0°=right, -90°=up) for the quarter-circle arc. */
  private quarterArc(): [number, number] {
    switch (this.direction) {
      case 'up-right':
        return [-90, 0];
      case 'down-right':
        return [0, 90];
      case 'down-left':
        return [90, 180];
      case 'up-left':
        return [-180, -90];
      // Plain linear directions normalize to the nearest quadrant so a
      // misconfigured pairing still renders sensibly.
      case 'down':
        return [0, 90];
      case 'left':
        return [90, 180];
      case 'right':
        return [-90, 0];
      case 'up':
      default:
        return [-180, -90];
    }
  }

  private navigableItems(): InoSpeedDialItem[] {
    return this.items.filter((item) => !item.disabled);
  }

  /** Focus the action at the given navigable index (translated to full items space). */
  private focusItem(navigableIndex: number): void {
    const navigable = this.navigableItems();
    if (navigable.length === 0) {
      return;
    }
    const clamped = Math.max(0, Math.min(navigableIndex, navigable.length - 1));
    const fullIndex = this.items.indexOf(navigable[clamped]);
    this.focusedIndex = fullIndex;
    this.cdr.markForCheck();
    setTimeout(() => {
      const buttons = this.elementRef.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.ino-speeddial__action-btn'
      );
      buttons[fullIndex]?.focus();
    }, 0);
  }

  private fabElement(): HTMLButtonElement | null {
    return this.elementRef.nativeElement.querySelector('.ino-speeddial__fab');
  }

  trackByIndex(index: number): number {
    return index;
  }
}
