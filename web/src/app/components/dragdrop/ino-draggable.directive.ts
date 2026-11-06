import {
  Directive,
  HostListener,
  HostBinding,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  Renderer2,
  OnInit,
  OnDestroy,
  inject,
  booleanAttribute,
} from '@angular/core';
import { InoDragDropService } from './ino-dragdrop.service';

@Directive({
  selector: '[inoDraggable]',
  standalone: true,
})
export class InoDraggableDirective implements OnInit, OnDestroy {
  private elRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private dragDropService = inject(InoDragDropService);

  @Input() inoDraggable: any;
  @Input({ transform: booleanAttribute }) inoDraggableDisabled = false;
  @Input() inoDraggableHandle?: string;
  @Input() inoDraggableDragStartClass = 'ino-dragging-active';
  @Output() inoDraggableOnDragStart = new EventEmitter<any>();
  @Output() inoDraggableOnDragEnd = new EventEmitter<boolean>();

  @HostBinding('attr.draggable') draggable = 'true';
  @HostBinding('attr.aria-grabbed') ariaGrabbed = 'false';
  @HostBinding('attr.role') role = 'button';
  @HostBinding('attr.tabindex') tabindex = 0;

  private isCarrying = false;
  private sourceElement: HTMLElement | null = null;

  ngOnInit(): void {
    if (!this.elRef.nativeElement.getAttribute('aria-label') &&
        !this.elRef.nativeElement.getAttribute('aria-labelledby')) {
      this.renderer.setAttribute(
        this.elRef.nativeElement,
        'aria-label',
        'Draggable item'
      );
    }
  }

  ngOnDestroy(): void {
    this.dragDropService.deregisterDraggable(this);
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void {
    if (this.inoDraggableDisabled) {
      event.preventDefault();
      return;
    }

    const target = event.target as HTMLElement;
    const handleSelector = this.resolveHandleSelector();
    if (handleSelector && !target.closest(handleSelector)) {
      event.preventDefault();
      return;
    }

    (event.dataTransfer as DataTransfer).effectAllowed = 'move';
    (event.dataTransfer as DataTransfer).setData('application/json', JSON.stringify(this.inoDraggable));

    this.dragDropService.setDraggingData(this.inoDraggable, this.elRef.nativeElement);
    this.inoDraggableOnDragStart.emit(this.inoDraggable);
  }

  @HostListener('dragend', ['$event'])
  onDragEnd(event: DragEvent): void {
    const success = (event.dataTransfer as DataTransfer).dropEffect !== 'none';
    this.dragDropService.clearDraggingData();
    this.inoDraggableOnDragEnd.emit(success);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.inoDraggableDisabled) return;

    if ((event.code === 'Space' || event.code === 'Enter') && !this.isCarrying) {
      event.preventDefault();
      this.activateKeyboardDrag();
    }

    if (event.code === 'Escape' && this.isCarrying) {
      event.preventDefault();
      this.cancelKeyboardDrag();
    }

    if (event.code === 'ArrowUp' || event.code === 'ArrowDown' ||
        event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      if (this.isCarrying) {
        event.preventDefault();
        this.dragDropService.navigateToNextDroppable(event.code);
      }
    }

    if (event.code === 'Enter' && this.isCarrying) {
      const focusedDroppable = this.dragDropService.getFocusedDroppable();
      if (focusedDroppable) {
        event.preventDefault();
        this.attemptDropOnFocused();
      }
    }

    if (event.code === 'Tab' && this.isCarrying) {
      // Allow Tab to work normally while carrying; it will move focus per browser tab order
      this.dragDropService.setCurrentDraggableCarrying(this);
    }
  }

  private activateKeyboardDrag(): void {
    if (this.isCarrying) return;

    this.isCarrying = true;
    this.sourceElement = this.elRef.nativeElement;

    this.renderer.addClass(this.elRef.nativeElement, this.inoDraggableDragStartClass);
    this.renderer.setAttribute(this.elRef.nativeElement, 'aria-grabbed', 'true');

    this.dragDropService.setCarryingState({
      draggable: this,
      data: this.inoDraggable,
      source: this.elRef.nativeElement,
      isKeyboard: true,
    });

    this.dragDropService.announce(
      `${this.getLabel()} picked up. Use arrow keys to navigate to a drop zone. Press Enter to drop, Escape to cancel.`
    );

    this.inoDraggableOnDragStart.emit(this.inoDraggable);
  }

  private cancelKeyboardDrag(): void {
    if (!this.isCarrying) return;

    this.isCarrying = false;

    this.renderer.removeClass(this.elRef.nativeElement, this.inoDraggableDragStartClass);
    this.renderer.setAttribute(this.elRef.nativeElement, 'aria-grabbed', 'false');

    const sourceLabel = this.getLabel();
    this.dragDropService.announce(`Drop cancelled. ${sourceLabel} returned to original location.`);
    this.dragDropService.clearCarryingState();

    this.elRef.nativeElement.focus();
  }

  private attemptDropOnFocused(): void {
    const focusedDroppable = this.dragDropService.getFocusedDroppable();
    if (focusedDroppable) {
      focusedDroppable.receiveKeyboardDrop(this.inoDraggable, this);
    }
  }

  private getLabel(): string {
    return this.elRef.nativeElement.getAttribute('aria-label') || 'Item';
  }

  /** `inoDraggableHandle` wins when the caller sets it explicitly; otherwise, a `[inoDropHandle]`
   *  descendant (SPEC.md §4.3) auto-restricts drag initiation without the caller having to also
   *  repeat a CSS selector. With neither, the whole host initiates drag (today's default). */
  private resolveHandleSelector(): string | null {
    if (this.inoDraggableHandle) return this.inoDraggableHandle;
    const hasDropHandle = this.elRef.nativeElement.querySelector('[inoDropHandle]') !== null;
    return hasDropHandle ? '[inoDropHandle]' : null;
  }

  endCarry(success: boolean): void {
    if (!this.isCarrying) return;

    this.isCarrying = false;
    this.renderer.removeClass(this.elRef.nativeElement, this.inoDraggableDragStartClass);
    this.renderer.setAttribute(this.elRef.nativeElement, 'aria-grabbed', 'false');

    this.inoDraggableOnDragEnd.emit(success);

    this.elRef.nativeElement.focus();
  }

  getElement(): HTMLElement {
    return this.elRef.nativeElement;
  }

  isCurrentlyCarrying(): boolean {
    return this.isCarrying;
  }
}
