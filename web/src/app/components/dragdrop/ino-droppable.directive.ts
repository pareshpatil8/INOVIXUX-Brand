import {
  Directive,
  HostBinding,
  HostListener,
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
import { InoDraggableDirective } from './ino-draggable.directive';

export interface InoDroppableDropEvent {
  data: unknown;
  zone: unknown[];
}

export interface InoDroppableRejectEvent {
  data: unknown;
  reason: 'full' | 'rejected' | 'disabled';
}

/**
 * `[inoDroppable]` — target-element directive. See `./SPEC.md` §3/§4.2 for the full a11y
 * contract and API; this implements the mouse/native-HTML5-DnD path and the keyboard-carry
 * receiving end (`receiveKeyboardDrop`, called by `InoDraggableDirective` via
 * `InoDragDropService.getFocusedDroppable()`).
 */
@Directive({
  selector: '[inoDroppable]',
  standalone: true,
})
export class InoDroppableDirective implements OnInit, OnDestroy {
  private elRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private dragDropService = inject(InoDragDropService);

  @Input() inoDroppable: unknown[] = [];
  @Input() inoDroppableAccept: (data: unknown) => boolean = () => true;
  @Input() inoDroppableMaxItems = Infinity;
  @Input({ transform: booleanAttribute }) inoDroppableDisabled = false;
  @Input() inoDroppableEffect: 'move' | 'copy' | 'link' = 'move';
  @Input() inoDroppableDropZoneClass = 'ino-drop-zone-active';
  @Input() inoDroppableDroppedFlashClass = 'ino-dropped-flash';
  @Output() inoDroppableOnDrop = new EventEmitter<InoDroppableDropEvent>();
  @Output() inoDroppableOnReject = new EventEmitter<InoDroppableRejectEvent>();

  @HostBinding('attr.aria-dropeffect') get ariaDropEffect(): string {
    return this.inoDroppableEffect;
  }

  @HostBinding('attr.aria-disabled') get ariaDisabled(): string | null {
    return this.inoDroppableDisabled ? 'true' : null;
  }

  ngOnInit(): void {
    if (!this.elRef.nativeElement.getAttribute('role')) {
      this.renderer.setAttribute(this.elRef.nativeElement, 'role', 'region');
    }
    this.dragDropService.registerDroppable(this);
  }

  ngOnDestroy(): void {
    this.dragDropService.deregisterDroppable(this);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    const dataTransfer = event.dataTransfer as DataTransfer;
    if (this.canAccept(this.dragDropService.getDraggingData())) {
      dataTransfer.dropEffect = this.inoDroppableEffect;
      this.setMouseOverActive(true);
    } else {
      dataTransfer.dropEffect = 'none';
      this.setMouseOverActive(false);
    }
  }

  @HostListener('dragleave')
  onDragLeave(): void {
    this.setMouseOverActive(false);
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.setMouseOverActive(false);

    const data = this.dragDropService.getDraggingData();
    const source = this.dragDropService.getDraggingSource();
    this.attemptDrop(data, source, false);
  }

  /** Called by `InoDraggableDirective.attemptDropOnFocused()` on Enter while carrying. */
  receiveKeyboardDrop(data: unknown, draggable: InoDraggableDirective): void {
    const accepted = this.attemptDrop(data, draggable.getElement(), true);
    if (accepted) {
      draggable.endCarry(true);
      this.dragDropService.clearCarryingState();
    }
  }

  /** Toggled by `InoDragDropService.navigateToNextDroppable()` as keyboard focus moves. */
  setKeyboardFocusActive(active: boolean): void {
    if (active) {
      this.renderer.addClass(this.elRef.nativeElement, this.inoDroppableDropZoneClass);
    } else {
      this.renderer.removeClass(this.elRef.nativeElement, this.inoDroppableDropZoneClass);
    }
  }

  describeAvailability(): string {
    const label = this.getLabel();
    if (this.inoDroppableDisabled) {
      return `Drop zone ${label} is disabled and cannot accept items. Move to another zone.`;
    }
    if (this.isFull()) {
      return `Drop zone ${label} is full and cannot accept more items. Move to another zone.`;
    }
    return `Drop zone ${label}: ${this.inoDroppable.length} items. Press Enter to drop here.`;
  }

  getElement(): HTMLElement {
    return this.elRef.nativeElement;
  }

  private canAccept(data: unknown): boolean {
    return !this.inoDroppableDisabled && !this.isFull() && this.inoDroppableAccept(data);
  }

  private isFull(): boolean {
    return this.inoDroppable.length >= this.inoDroppableMaxItems;
  }

  private attemptDrop(data: unknown, sourceElement: HTMLElement | null, isKeyboard: boolean): boolean {
    const label = this.getLabel();

    if (this.inoDroppableDisabled) {
      this.inoDroppableOnReject.emit({ data, reason: 'disabled' });
      this.dragDropService.announce(`Cannot drop here. Drop zone ${label} is disabled.`);
      return false;
    }
    if (this.isFull()) {
      this.inoDroppableOnReject.emit({ data, reason: 'full' });
      this.dragDropService.announce(`Cannot drop here. Drop zone ${label} is full.`);
      return false;
    }
    if (!this.inoDroppableAccept(data)) {
      this.inoDroppableOnReject.emit({ data, reason: 'rejected' });
      this.dragDropService.announce(`Cannot drop here. Drop zone ${label} does not accept this item.`);
      return false;
    }

    this.inoDroppableOnDrop.emit({ data, zone: this.inoDroppable });
    this.flashDropped(sourceElement);
    this.dragDropService.announce(`Item dropped successfully in ${label}.`);

    if (!isKeyboard) {
      this.dragDropService.clearDraggingData();
    }
    return true;
  }

  private flashDropped(sourceElement: HTMLElement | null): void {
    this.renderer.addClass(this.elRef.nativeElement, this.inoDroppableDroppedFlashClass);
    sourceElement && this.renderer.addClass(sourceElement, this.inoDroppableDroppedFlashClass);

    setTimeout(() => {
      this.renderer.removeClass(this.elRef.nativeElement, this.inoDroppableDroppedFlashClass);
      sourceElement && this.renderer.removeClass(sourceElement, this.inoDroppableDroppedFlashClass);
    }, 200);
  }

  private setMouseOverActive(active: boolean): void {
    if (active) {
      this.renderer.addClass(this.elRef.nativeElement, this.inoDroppableDropZoneClass);
    } else {
      this.renderer.removeClass(this.elRef.nativeElement, this.inoDroppableDropZoneClass);
    }
  }

  private getLabel(): string {
    return (
      this.elRef.nativeElement.getAttribute('aria-label') ||
      this.elRef.nativeElement.getAttribute('aria-labelledby') ||
      'zone'
    );
  }
}
