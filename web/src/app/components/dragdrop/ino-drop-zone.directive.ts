import { Directive, ElementRef, HostListener, Input, Renderer2, inject } from '@angular/core';

/**
 * `[inoDropZone]` — visual-only drop-zone affordance (SPEC.md §4.4): toggles a styling class on
 * native `dragover`/`dragleave`/`drop` without any data binding, accept logic, or `aria-live`
 * announcement. For a decorative wrapper around (or styling hook near) a real `[inoDroppable]`
 * that needs the same hover feedback but isn't itself the drop target. Does not replace
 * `[inoDroppable]` — it carries no `inoDroppableOnDrop`/accept/maxItems contract.
 */
@Directive({
  selector: '[inoDropZone]',
  standalone: true,
})
export class InoDropZoneDirective {
  private elRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  @Input() inoDropZoneActiveClass = 'ino-drop-zone-active';

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.renderer.addClass(this.elRef.nativeElement, this.inoDropZoneActiveClass);
  }

  @HostListener('dragleave')
  onDragLeave(): void {
    this.renderer.removeClass(this.elRef.nativeElement, this.inoDropZoneActiveClass);
  }

  @HostListener('drop')
  onDrop(): void {
    this.renderer.removeClass(this.elRef.nativeElement, this.inoDropZoneActiveClass);
  }
}
