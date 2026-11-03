import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoButtonComponent } from '../button/ino-button.component';
import { InoLabelComponent } from '../label/ino-label.component';

export interface InoPickListOption {
  label: string;
  value: string;
  disabled?: boolean;
}

type Pane = 'source' | 'target';

let idCounter = 0;

/** Same flash duration `ino-orderlist` uses — see that component's SPEC.md §4 for why this value
 *  and mechanism were chosen (no existing repo precedent for either). */
const MOVED_FLASH_MS = 600;

/**
 * `<ino-picklist>` — dual-list transfer (INO-456, INO-31 Phase B3, doc 26 §5 row
 * `ino-orderlist + ino-picklist`). Parity benchmark: PrimeNG `PickList`.
 *
 * Two independent `ino-listbox`-style multi-select panes (`role="listbox"`
 * `[aria-multiselectable]`, roving-`tabindex` `role="option"` rows — see
 * `web/src/app/components/listbox/SPEC.md` §2 for the pattern itself, and this component's own
 * SPEC.md §1 for why it's re-implemented here rather than composing `<ino-listbox>` directly) plus
 * a four-button transfer rail between them (`To target` / `All to target` / `To source` /
 * `All to source`, visibly labelled — doc 26 §5's "documented button alternatives to drag") and
 * `Alt+ArrowRight`/`Alt+ArrowLeft` keyboard equivalents. No native drag-and-drop — same reasoning
 * `ino-orderlist`'s SPEC.md §1 records.
 *
 * `source`/`target` are the two panes' contents (`sourceChange`/`targetChange` on every
 * transfer); `sourceSelection`/`targetSelection` are each pane's checked rows (the Tier-1
 * selection contract, kept separate from pane membership for the same reason `ino-orderlist`
 * keeps `value` separate from `options` — see this component's SPEC.md §2).
 */
@Component({
  selector: 'ino-picklist',
  standalone: true,
  imports: [CommonModule, InoLabelComponent, InoButtonComponent],
  templateUrl: './ino-picklist.component.html',
  styleUrl: './ino-picklist.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-picklist',
    '[attr.data-size]': 'size',
  },
})
export class InoPickListComponent {
  @Input() sourceLabel = 'Available';
  @Input() targetLabel = 'Selected';
  @Input() source: InoPickListOption[] = [];
  @Input() target: InoPickListOption[] = [];
  @Input() sourceSelection: string[] = [];
  @Input() targetSelection: string[] = [];
  @Input() hint = '';
  @Input() error = '';
  @Input() size: 'compact' | 'comfortable' = 'comfortable';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;

  @Output() readonly sourceChange = new EventEmitter<InoPickListOption[]>();
  @Output() readonly targetChange = new EventEmitter<InoPickListOption[]>();
  @Output() readonly sourceSelectionChange = new EventEmitter<string[]>();
  @Output() readonly targetSelectionChange = new EventEmitter<string[]>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly listId = `ino-picklist-${++idCounter}`;
  protected readonly sourceListId = `${this.listId}-source`;
  protected readonly targetListId = `${this.listId}-target`;
  protected readonly hintId = `${this.listId}-hint`;
  protected readonly errorId = `${this.listId}-error`;

  /** Roving-`tabindex` target, one per pane — the two lists are independent listboxes. */
  protected sourceActiveIndex = -1;
  protected targetActiveIndex = -1;

  /** Values currently showing `moved-flash`, one set per pane (a value shows the state in the
   *  pane it just ARRIVED in, not the one it left). */
  protected flashedSource = new Set<string>();
  protected flashedTarget = new Set<string>();

  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  protected get interactive(): boolean {
    return !this.disabled && !this.readonly && !this.loading;
  }

  protected optionId(pane: Pane, index: number): string {
    return `${this.listId}-${pane}-opt-${index}`;
  }

  protected isActiveTabStop(pane: Pane, index: number): boolean {
    const active = pane === 'source' ? this.sourceActiveIndex : this.targetActiveIndex;
    return index === active || (active === -1 && index === 0);
  }

  protected isSelected(pane: Pane, option: InoPickListOption): boolean {
    return (pane === 'source' ? this.sourceSelection : this.targetSelection).includes(option.value);
  }

  protected isFlashed(pane: Pane, option: InoPickListOption): boolean {
    return (pane === 'source' ? this.flashedSource : this.flashedTarget).has(option.value);
  }

  // ── Selection (per-pane Tier-1 contract) ────────────────────────────────────────────────────

  protected activateOption(pane: Pane, index: number, option: InoPickListOption): void {
    if (!this.interactive || option.disabled) {
      return;
    }
    this.setActiveIndex(pane, index);
    this.toggleSelection(pane, option);
    this.focusActiveOption(pane);
  }

  private toggleSelection(pane: Pane, option: InoPickListOption): void {
    const current = pane === 'source' ? this.sourceSelection : this.targetSelection;
    const selected = current.includes(option.value);
    const next = selected ? current.filter((v) => v !== option.value) : [...current, option.value];
    if (pane === 'source') {
      this.sourceSelection = next;
      this.sourceSelectionChange.emit(next);
    } else {
      this.targetSelection = next;
      this.targetSelectionChange.emit(next);
    }
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────────────────────

  protected onOptionKeydown(event: KeyboardEvent, pane: Pane, index: number, option: InoPickListOption): void {
    if (!this.interactive) {
      return;
    }
    const alt = event.altKey;
    const list = pane === 'source' ? this.source : this.target;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActiveFocus(pane, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActiveFocus(pane, -1);
        break;
      case 'Home':
        event.preventDefault();
        this.jumpActiveFocus(pane, 0);
        break;
      case 'End':
        event.preventDefault();
        this.jumpActiveFocus(pane, list.length - 1);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        this.activateOption(pane, index, option);
        break;
      case 'ArrowRight':
        if (alt && pane === 'source') {
          event.preventDefault();
          this.moveToTarget(option);
        }
        break;
      case 'ArrowLeft':
        if (alt && pane === 'target') {
          event.preventDefault();
          this.moveToSource(option);
        }
        break;
    }
  }

  private setActiveIndex(pane: Pane, index: number): void {
    if (pane === 'source') {
      this.sourceActiveIndex = index;
    } else {
      this.targetActiveIndex = index;
    }
  }

  private moveActiveFocus(pane: Pane, delta: number): void {
    const list = pane === 'source' ? this.source : this.target;
    if (!list.length) {
      return;
    }
    const active = pane === 'source' ? this.sourceActiveIndex : this.targetActiveIndex;
    const next = clamp((active < 0 ? 0 : active) + delta, 0, list.length - 1);
    this.jumpActiveFocus(pane, next);
  }

  private jumpActiveFocus(pane: Pane, index: number): void {
    const list = pane === 'source' ? this.source : this.target;
    if (index < 0 || index >= list.length) {
      return;
    }
    this.setActiveIndex(pane, index);
    this.focusActiveOption(pane);
  }

  private focusActiveOption(pane: Pane): void {
    const active = pane === 'source' ? this.sourceActiveIndex : this.targetActiveIndex;
    if (active < 0) {
      return;
    }
    const id = this.optionId(pane, active);
    queueMicrotask(() => {
      this.host.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`)?.focus();
    });
  }

  // ── Transfer (buttons + Alt+Arrow keyboard — SPEC.md §1) ────────────────────────────────────

  protected get canMoveToTarget(): boolean {
    return this.interactive && this.sourceSelection.length > 0;
  }

  protected get canMoveToSource(): boolean {
    return this.interactive && this.targetSelection.length > 0;
  }

  protected get canMoveAllToTarget(): boolean {
    return this.interactive && this.source.some((o) => !o.disabled);
  }

  protected get canMoveAllToSource(): boolean {
    return this.interactive && this.target.some((o) => !o.disabled);
  }

  /** `single` overload lets `Alt+ArrowRight` move just the focused row even when it isn't part
   *  of the current selection (matches the button's "move the checked rows" behaviour when
   *  there IS a selection, same dual mode `ino-orderlist`'s button-vs-keyboard paths share). */
  protected moveToTarget(single?: InoPickListOption): void {
    if (!this.interactive) {
      return;
    }
    const moving = single ? [single.value] : this.sourceSelection;
    this.transfer('source', 'target', moving);
  }

  protected moveToSource(single?: InoPickListOption): void {
    if (!this.interactive) {
      return;
    }
    const moving = single ? [single.value] : this.targetSelection;
    this.transfer('target', 'source', moving);
  }

  protected moveAllToTarget(): void {
    if (!this.canMoveAllToTarget) {
      return;
    }
    this.transfer(
      'source',
      'target',
      this.source.filter((o) => !o.disabled).map((o) => o.value),
    );
  }

  protected moveAllToSource(): void {
    if (!this.canMoveAllToSource) {
      return;
    }
    this.transfer(
      'target',
      'source',
      this.target.filter((o) => !o.disabled).map((o) => o.value),
    );
  }

  private transfer(from: Pane, to: Pane, values: string[]): void {
    if (!values.length) {
      return;
    }
    const moveSet = new Set(values);
    const fromList = from === 'source' ? this.source : this.target;
    const toList = from === 'source' ? this.target : this.source;
    const moved = fromList.filter((o) => moveSet.has(o.value) && !o.disabled);
    if (!moved.length) {
      return;
    }
    const movedValues = new Set(moved.map((o) => o.value));
    const nextFrom = fromList.filter((o) => !movedValues.has(o.value));
    const nextTo = [...toList, ...moved];

    if (from === 'source') {
      this.source = nextFrom;
      this.sourceSelection = this.sourceSelection.filter((v) => !movedValues.has(v));
      this.sourceChange.emit(nextFrom);
      this.sourceSelectionChange.emit(this.sourceSelection);
      this.target = nextTo;
      this.targetChange.emit(nextTo);
    } else {
      this.target = nextFrom;
      this.targetSelection = this.targetSelection.filter((v) => !movedValues.has(v));
      this.targetChange.emit(nextFrom);
      this.targetSelectionChange.emit(this.targetSelection);
      this.source = nextTo;
      this.sourceChange.emit(nextTo);
    }

    this.flashMoved(to, [...movedValues]);
  }

  /** `moved-flash` state (doc 26 §5) — see `ino-orderlist`'s SPEC.md §4 for the duration/markForCheck
   *  rationale this mirrors verbatim. */
  private flashMoved(pane: Pane, values: string[]): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
    if (pane === 'target') {
      this.flashedTarget = new Set(values);
      this.flashedSource = new Set();
    } else {
      this.flashedSource = new Set(values);
      this.flashedTarget = new Set();
    }
    this.flashTimer = setTimeout(() => {
      this.flashedSource = new Set();
      this.flashedTarget = new Set();
      this.flashTimer = null;
      this.cdr.markForCheck();
    }, MOVED_FLASH_MS);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
