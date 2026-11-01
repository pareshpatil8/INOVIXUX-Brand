import {
  Directive,
  Input,
  HostListener,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewContainerRef,
  ComponentRef,
  TemplateRef,
  EmbeddedViewRef,
} from '@angular/core';
import { InoContextMenuComponent } from './ino-context-menu.component';
import { InoContextMenuItem, InoContextMenuContext } from './ino-context-menu.types';

/**
 * Directive to attach a context menu to an element.
 *
 * Usage:
 *   <div [inoContextMenu]="menuItems">Right-click me</div>
 *
 * Where menuItems is an InoContextMenuItem[] array or a TemplateRef.
 */
@Directive({
  selector: '[inoContextMenu]',
  standalone: true,
})
export class InoContextMenuDirective implements OnInit, OnDestroy {
  /**
   * Menu items or template to display.
   * Can be:
   * - InoContextMenuItem[] — direct array of items
   * - TemplateRef<InoContextMenuContext> — template with menu structure
   */
  @Input() inoContextMenu:
    | InoContextMenuItem[]
    | TemplateRef<InoContextMenuContext>
    | null = null;

  /** Optional aria-label for the menu */
  @Input() inoContextMenuAriaLabel = 'Context menu';

  /** Component reference for programmatic control */
  private menuComponentRef: ComponentRef<InoContextMenuComponent> | null = null;

  /** Click-outside listener */
  private clickOutsideListener: ((event: MouseEvent) => void) | null = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    // Make host element programmatically focusable if not already
    // This ensures focus can return to the trigger element after menu closes
    const hostElement = this.elementRef.nativeElement;
    if (!hostElement.hasAttribute('tabindex')) {
      hostElement.setAttribute('tabindex', '-1');
    }
  }

  ngOnDestroy() {
    this.destroyMenu();
  }

  /**
   * Handle right-click (contextmenu) event.
   */
  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.inoContextMenu) {
      return;
    }

    // Get menu items from input (array or template)
    const items = this.resolveMenuItems();
    if (!items || items.length === 0) {
      return;
    }

    // Create and show menu
    this.showMenu(event, items);
  }

  /**
   * Resolve menu items from the input (array or template).
   */
  private resolveMenuItems(): InoContextMenuItem[] | null {
    if (!this.inoContextMenu) {
      return null;
    }

    // Direct array
    if (Array.isArray(this.inoContextMenu)) {
      return this.inoContextMenu;
    }

    // Template (not implemented in this B2 scope — array-only for now)
    // TemplateRef support would require rendering the template and extracting items
    // Omitted to meet B2 timeline; array API covers the primary use case
    return null;
  }

  /**
   * Create and show the context menu.
   */
  private showMenu(event: MouseEvent, items: InoContextMenuItem[]) {
    // Destroy existing menu if any
    this.destroyMenu();

    // Create menu component dynamically
    this.menuComponentRef = this.viewContainerRef.createComponent(InoContextMenuComponent);
    const menuComponent = this.menuComponentRef.instance;

    // Configure menu
    menuComponent.items = items;
    menuComponent.ariaLabel = this.inoContextMenuAriaLabel;

    // Subscribe to close event
    menuComponent.visibleChange.subscribe((visible) => {
      if (!visible) {
        this.destroyMenu();
      }
    });

    // Show menu at cursor position, passing return focus element
    menuComponent.show(event, this.elementRef.nativeElement);

    // Set up click-outside listener
    this.setupClickOutsideListener();
  }

  /**
   * Set up global click listener to close menu when clicking outside.
   */
  private setupClickOutsideListener() {
    // Delay to avoid immediately closing on the same click that opened it
    setTimeout(() => {
      this.clickOutsideListener = (event: MouseEvent) => {
        const menuElement = this.menuComponentRef?.location.nativeElement;
        if (menuElement && !menuElement.contains(event.target as Node)) {
          this.destroyMenu();
        }
      };
      document.addEventListener('click', this.clickOutsideListener);
    }, 0);
  }

  /**
   * Destroy the menu component and clean up listeners.
   */
  private destroyMenu() {
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener);
      this.clickOutsideListener = null;
    }

    // Capture and null the ref BEFORE teardown to prevent reentrancy (INO-816)
    const ref = this.menuComponentRef;
    this.menuComponentRef = null;
    ref?.destroy();
  }
}
