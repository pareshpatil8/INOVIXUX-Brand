import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostBinding,
  HostListener,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoContextMenuItem } from './ino-context-menu.types';

@Component({
  selector: 'ino-context-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-context-menu.component.html',
  styleUrls: ['./ino-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoContextMenuComponent implements AfterViewInit {
  /** Menu items to display */
  @Input() items: InoContextMenuItem[] = [];

  /** Accessible label for the menu container */
  @Input() ariaLabel = 'Context menu';

  /** Whether the menu is currently visible */
  @Input() visible = false;

  /** Emits when the menu requests to close */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Emits when a menu item is activated */
  @Output() itemClick = new EventEmitter<{
    originalEvent: Event;
    item: InoContextMenuItem;
  }>();

  /** Root menu element for focus management */
  @ViewChild('menuRoot', { static: false, read: ElementRef })
  menuRoot?: ElementRef<HTMLDivElement>;

  /** Current position */
  position: { top: string; left: string } = { top: '0px', left: '0px' };

  /** Index of the currently focused item (roving tabindex) */
  private focusedIndex = -1;

  /** Currently open submenu item (for nested menus) */
  openSubmenu: InoContextMenuItem | null = null;

  /** Submenu hover delay timers */
  private submenuOpenTimer: any;
  private submenuCloseTimer: any;

  /** Element that had focus before menu opened (for focus return) */
  returnFocusElement: HTMLElement | null = null;

  @HostBinding('class.ino-context-menu') hostClass = true;
  @HostBinding('class.ino-context-menu--visible')
  get isVisible() {
    return this.visible;
  }

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit() {
    if (this.visible) {
      this.focusFirstItem();
    }
  }

  /**
   * Opens the menu at the given coordinates.
   */
  show(event: MouseEvent, returnFocus: HTMLElement | null = null) {
    this.returnFocusElement = returnFocus;
    this.calculatePosition(event);
    this.visible = true;
    this.focusedIndex = -1;
    this.visibleChange.emit(true);
    this.cdr.markForCheck();

    // Focus first item after view updates
    setTimeout(() => this.focusFirstItem(), 0);
  }

  /**
   * Closes the menu and returns focus to the invoking element.
   */
  hide() {
    this.visible = false;
    this.openSubmenu = null;
    this.clearSubmenuTimers();
    this.visibleChange.emit(false);
    this.cdr.markForCheck();

    // Return focus to invoking element
    if (this.returnFocusElement && this.returnFocusElement.focus) {
      this.returnFocusElement.focus();
    }
    this.returnFocusElement = null;
  }

  /**
   * Calculate menu position from cursor coordinates with viewport collision detection.
   */
  private calculatePosition(event: MouseEvent) {
    const menuWidth = 250; // Approximate, will be refined after render
    const menuHeight = this.items.length * 40; // Approximate

    let left = event.clientX;
    let top = event.clientY;

    // Flip left if would overflow right edge
    if (left + menuWidth > window.innerWidth) {
      left = event.clientX - menuWidth;
    }

    // Flip up if would overflow bottom edge
    if (top + menuHeight > window.innerHeight) {
      top = event.clientY - menuHeight;
    }

    this.position = {
      left: `${Math.max(0, left)}px`,
      top: `${Math.max(0, top)}px`,
    };
  }

  /**
   * Focus the first non-disabled, non-separator item.
   */
  private focusFirstItem() {
    const navigableItems = this.getNavigableItems();
    if (navigableItems.length > 0) {
      this.focusItem(0);
    }
  }

  /**
   * Focus item at the given navigable index (translates to full items index).
   */
  private focusItem(navigableIndex: number) {
    const navigableItems = this.getNavigableItems();
    if (navigableIndex >= 0 && navigableIndex < navigableItems.length) {
      // Translate navigable index to full items index
      const targetItem = navigableItems[navigableIndex];
      const fullIndex = this.items.indexOf(targetItem);

      if (fullIndex >= 0) {
        this.focusedIndex = fullIndex;
        this.cdr.markForCheck();

        // Actually focus the DOM element by resolved index
        setTimeout(() => {
          const allItems =
            this.elementRef.nativeElement.querySelectorAll('.ino-context-menu__item, .ino-context-menu__separator');
          if (allItems[fullIndex]) {
            const element = allItems[fullIndex] as HTMLElement;
            if (element.getAttribute('tabindex') === '0') {
              element.focus();
            }
          }
        }, 0);
      }
    }
  }

  /**
   * Get all navigable (non-separator, non-disabled) items.
   */
  private getNavigableItems(): InoContextMenuItem[] {
    return this.items.filter((item) => !item.separator && !item.disabled);
  }

  /**
   * Handle item activation (click or Enter/Space).
   */
  onItemActivate(event: Event, item: InoContextMenuItem, index: number) {
    if (item.disabled || item.separator) {
      return;
    }

    // If item has children, open submenu instead of activating
    if (item.children && item.children.length > 0) {
      this.toggleSubmenu(item);
      return;
    }

    // Activate item
    if (item.command) {
      item.command({ originalEvent: event, item });
    }

    this.itemClick.emit({ originalEvent: event, item });
    this.hide();
  }

  /**
   * Toggle submenu open/closed.
   */
  toggleSubmenu(item: InoContextMenuItem) {
    if (this.openSubmenu === item) {
      this.openSubmenu = null;
    } else {
      this.openSubmenu = item;
    }
    this.cdr.markForCheck();
  }

  /**
   * Handle submenu hover (open after delay).
   */
  onSubmenuMouseEnter(item: InoContextMenuItem) {
    this.clearSubmenuTimers();
    this.submenuOpenTimer = setTimeout(() => {
      this.openSubmenu = item;
      this.cdr.markForCheck();
    }, 200);
  }

  /**
   * Handle submenu hover exit (close after delay).
   */
  onSubmenuMouseLeave(item: InoContextMenuItem) {
    this.clearSubmenuTimers();
    this.submenuCloseTimer = setTimeout(() => {
      if (this.openSubmenu === item) {
        this.openSubmenu = null;
        this.cdr.markForCheck();
      }
    }, 200);
  }

  /**
   * Clear any pending submenu timers.
   */
  private clearSubmenuTimers() {
    if (this.submenuOpenTimer) {
      clearTimeout(this.submenuOpenTimer);
      this.submenuOpenTimer = null;
    }
    if (this.submenuCloseTimer) {
      clearTimeout(this.submenuCloseTimer);
      this.submenuCloseTimer = null;
    }
  }

  /**
   * Keyboard navigation.
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.visible) {
      return;
    }

    const navigableItems = this.getNavigableItems();
    // focusedIndex is now in full-items space; find it in navigable space
    const currentNavigableIndex = navigableItems.findIndex(
      (item) => item === this.items[this.focusedIndex]
    );

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        // If submenu is open, close it first
        if (this.openSubmenu) {
          this.openSubmenu = null;
          this.cdr.markForCheck();
        } else {
          this.hide();
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (navigableItems.length > 0) {
          const nextNavigableIndex = currentNavigableIndex >= 0
            ? (currentNavigableIndex + 1) % navigableItems.length
            : 0;
          this.focusItem(nextNavigableIndex);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (navigableItems.length > 0) {
          const prevNavigableIndex = currentNavigableIndex >= 0
            ? (currentNavigableIndex - 1 + navigableItems.length) % navigableItems.length
            : navigableItems.length - 1;
          this.focusItem(prevNavigableIndex);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        // Open submenu if current item has children
        if (currentNavigableIndex >= 0) {
          const currentItem = navigableItems[currentNavigableIndex];
          if (currentItem.children && currentItem.children.length > 0) {
            this.toggleSubmenu(currentItem);
          }
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        // Close submenu if open
        if (this.openSubmenu) {
          this.openSubmenu = null;
          this.cdr.markForCheck();
        }
        break;

      case 'Home':
        event.preventDefault();
        if (navigableItems.length > 0) {
          this.focusItem(0);
        }
        break;

      case 'End':
        event.preventDefault();
        if (navigableItems.length > 0) {
          this.focusItem(navigableItems.length - 1);
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentNavigableIndex >= 0) {
          const currentItem = navigableItems[currentNavigableIndex];
          const fullIndex = this.items.indexOf(currentItem);
          this.onItemActivate(event, currentItem, fullIndex);
        }
        break;
    }
  }

  /**
   * Check if item is currently focused (for roving tabindex).
   */
  isItemFocused(item: InoContextMenuItem, index: number): boolean {
    return this.focusedIndex === index;
  }

  /**
   * Track by function for ngFor.
   */
  trackByIndex(index: number): number {
    return index;
  }
}
