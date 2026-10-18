import {
  Component,
  Input,
  HostListener,
  ElementRef,
  AfterContentInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Toolbar component providing start/center/end content distribution with
 * dense/comfortable sizing and ARIA toolbar pattern keyboard navigation.
 *
 * @example
 * ```html
 * <ino-toolbar ariaLabel="Main toolbar" density="comfortable">
 *   <div slot="start">
 *     <button ino-button>Action</button>
 *   </div>
 *   <div slot="center">
 *     <h2>Page Title</h2>
 *   </div>
 *   <div slot="end">
 *     <button ino-button severity="secondary">Settings</button>
 *   </div>
 * </ino-toolbar>
 * ```
 */
@Component({
  selector: 'ino-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-toolbar.component.html',
  styleUrls: ['./ino-toolbar.component.scss'],
  host: {
    '[class.ino-toolbar--dense]': 'density === "dense"',
  },
})
export class InoToolbarComponent implements AfterContentInit {
  /**
   * Accessible name for the toolbar (required).
   * Maps to aria-label on the toolbar container.
   */
  @Input({ required: true }) ariaLabel!: string;

  /**
   * Sizing density mode.
   * - comfortable: 44px min-height, 16px vertical padding (default)
   * - dense: 32px min-height, 8px vertical padding
   */
  @Input() density: 'comfortable' | 'dense' = 'comfortable';

  /** Whether the start slot has projected content */
  hasStartContent = false;

  /** Whether the center slot has projected content */
  hasCenterContent = false;

  /** Whether the end slot has projected content */
  hasEndContent = false;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterContentInit(): void {
    this.checkSlotContent();
  }

  /**
   * Implements APG toolbar pattern keyboard navigation:
   * - ArrowRight: move focus to next focusable item
   * - ArrowLeft: move focus to previous focusable item
   * - Home: move focus to first focusable item
   * - End: move focus to last focusable item
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const items = this.getFocusableItems();
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let targetIndex = -1;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        targetIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        targetIndex =
          currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        event.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        targetIndex = items.length - 1;
        break;
    }

    if (targetIndex >= 0) {
      items[targetIndex].focus();
    }
  }

  /**
   * Returns all focusable elements within the toolbar in DOM order.
   * Excludes disabled controls and elements with tabindex="-1".
   */
  private getFocusableItems(): HTMLElement[] {
    const selector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>(selector)
    );
  }

  /**
   * Checks which content slots have projected content to conditionally
   * render the slot containers.
   */
  private checkSlotContent(): void {
    const startSlot = this.el.nativeElement.querySelector('[slot="start"]');
    const centerSlot = this.el.nativeElement.querySelector('[slot="center"]');
    const endSlot = this.el.nativeElement.querySelector('[slot="end"]');

    this.hasStartContent = !!startSlot && this.hasContent(startSlot);
    this.hasCenterContent = !!centerSlot && this.hasContent(centerSlot);
    this.hasEndContent = !!endSlot && this.hasContent(endSlot);
  }

  /**
   * Checks if an element has any non-whitespace text or element children.
   */
  private hasContent(element: Element): boolean {
    return (
      element.childNodes.length > 0 &&
      Array.from(element.childNodes).some(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE &&
            node.textContent?.trim().length)
      )
    );
  }
}
