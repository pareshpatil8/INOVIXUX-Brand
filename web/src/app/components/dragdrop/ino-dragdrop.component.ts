import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoDraggableDirective } from './ino-draggable.directive';
import { InoDroppableDirective, InoDroppableDropEvent } from './ino-droppable.directive';

export interface InoDragDropItem {
  label: string;
  value: string;
  disabled?: boolean;
}

let idCounter = 0;

/**
 * `<ino-dragdrop>` — convenience wrapper for the common two-list source/target case documented
 * in `./SPEC.md` §6. Composes `[inoDraggable]`/`[inoDroppable]` internally and owns the move
 * (source → target), so callers who just need "pick items from a catalog, place them into a
 * zone" don't re-derive that wiring. For any other shape (nested zones, non-list layouts,
 * drag handles) compose the directives directly — they are independently exported and this
 * component adds no capability of its own, only this one composition. See `./SPEC.md` for the
 * full a11y contract (keyboard pick-up/move/drop, `aria-live` announcements) that both forms
 * share, since it lives in the directives, not here.
 *
 * `sourceItems`/`targetItems` follow the `ino-orderlist` convention (SPEC.md §2 row 1 /
 * `ino-orderlist.component.ts`): array order is authoritative, a move clones both arrays and
 * emits `sourceItemsChange`/`targetItemsChange`, never mutates the input arrays in place.
 */
@Component({
  selector: 'ino-dragdrop',
  standalone: true,
  imports: [CommonModule, InoDraggableDirective, InoDroppableDirective],
  templateUrl: './ino-dragdrop.component.html',
  styleUrl: './ino-dragdrop.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-dragdrop',
  },
})
export class InoDragdropComponent {
  private cdr = inject(ChangeDetectorRef);

  @Input() sourceLabel = 'Available';
  @Input() targetLabel = 'Selected';
  @Input() sourceItems: InoDragDropItem[] = [];
  @Input() targetItems: InoDragDropItem[] = [];
  @Input() maxItems = Infinity;
  @Input({ transform: booleanAttribute }) disabled = false;

  @Output() readonly sourceItemsChange = new EventEmitter<InoDragDropItem[]>();
  @Output() readonly targetItemsChange = new EventEmitter<InoDragDropItem[]>();
  @Output() readonly moved = new EventEmitter<InoDragDropItem>();

  protected readonly instanceId = `ino-dragdrop-${++idCounter}`;
  /** Values currently showing the transient `dropped-flash` state (SPEC.md §2 row 2). */
  protected flashedValues = new Set<string>();

  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  protected get isFull(): boolean {
    return this.targetItems.length >= this.maxItems;
  }

  protected get hasMaxCap(): boolean {
    return Number.isFinite(this.maxItems);
  }

  protected canAcceptDrop = (): boolean => !this.disabled && !this.isFull;

  protected onDropToTarget(event: InoDroppableDropEvent): void {
    const item = event.data as InoDragDropItem;
    if (!item || this.disabled || this.isFull) return;
    if (this.targetItems.some((i) => i.value === item.value)) return;

    this.sourceItems = this.sourceItems.filter((i) => i.value !== item.value);
    this.targetItems = [...this.targetItems, item];
    this.sourceItemsChange.emit(this.sourceItems);
    this.targetItemsChange.emit(this.targetItems);
    this.moved.emit(item);
    this.flash(item.value);
  }

  protected onReturnToSource(event: InoDroppableDropEvent): void {
    const item = event.data as InoDragDropItem;
    if (!item || this.disabled) return;
    if (this.sourceItems.some((i) => i.value === item.value)) return;

    this.targetItems = this.targetItems.filter((i) => i.value !== item.value);
    this.sourceItems = [...this.sourceItems, item];
    this.sourceItemsChange.emit(this.sourceItems);
    this.targetItemsChange.emit(this.targetItems);
    this.flash(item.value);
  }

  protected isFlashed(item: InoDragDropItem): boolean {
    return this.flashedValues.has(item.value);
  }

  private flash(value: string): void {
    this.flashedValues.add(value);
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => {
      this.flashedValues.delete(value);
      this.flashTimer = null;
      this.cdr.markForCheck();
    }, 200);
  }
}
