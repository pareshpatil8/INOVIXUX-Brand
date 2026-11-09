import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoButtonComponent } from '../button/ino-button.component';
import { InoLabelComponent } from '../label/ino-label.component';

export interface InoOrderListOption {
  label: string;
  value: string;
  disabled?: boolean;
}

let idCounter = 0;

/** How long the `moved-flash` state (doc 26 §5) stays on a row after a reorder. No existing
 *  repo precedent to match — see SPEC.md §4 for why this duration/approach was chosen fresh. */
const MOVED_FLASH_MS = 600;

/**
 * `<ino-orderlist>` — single reorderable list (INO-456, INO-31 Phase B3, doc 26 §5 row
 * `ino-orderlist + ino-picklist`). Parity benchmark: PrimeNG `OrderList`.
 *
 * Structure reuses `ino-listbox`'s multi-select listbox core (role="listbox"
 * [aria-multiselectable], roving-`tabindex` `role="option"` rows, click/`Space` toggles
 * membership) — see that component's SPEC.md §2/§5 for the pattern this one does not
 * re-derive. What's new here is the **reorder** axis: a `Top`/`Up`/`Down`/`Bottom` button rail
 * (visibly labelled, not icon-only — doc 26 §5 calls for "documented button alternatives to
 * drag") plus `Alt+ArrowUp`/`Alt+ArrowDown`/`Alt+Home`/`Alt+End` keyboard equivalents that call
 * the exact same move methods the buttons do. Native HTML5 drag-and-drop is deliberately not
 * implemented — see SPEC.md §1.
 *
 * `options` is the ordered catalog itself (array order === list order); reordering mutates a
 * clone and emits it via `optionsChange`, never the input array in place. `value`/`valueChange`
 * is the Tier-1 form-control selection contract (which rows are checked for the next move), kept
 * deliberately separate from order — see SPEC.md §2.
 */
@Component({
  selector: 'ino-orderlist',
  standalone: true,
  imports: [CommonModule, InoLabelComponent, InoButtonComponent],
  templateUrl: './ino-orderlist.component.html',
  styleUrl: './ino-orderlist.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-orderlist',
    '[attr.data-size]': 'size',
    '[class.ino-orderlist--selected]': 'value.length > 0',
  },
})
export class InoOrderListComponent implements OnChanges {
  @Input() label = '';
  @Input() options: InoOrderListOption[] = [];
  @Input() value: string[] = [];
  @Input() hint = '';
  @Input() error = '';
  @Input() size: 'compact' | 'comfortable' = 'comfortable';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;

  @Output() readonly valueChange = new EventEmitter<string[]>();
  @Output() readonly optionsChange = new EventEmitter<InoOrderListOption[]>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly listId = `ino-orderlist-${++idCounter}`;
  protected readonly hintId = `${this.listId}-hint`;
  protected readonly errorId = `${this.listId}-error`;

  /** Roving-`tabindex` target, same model as `ino-listbox`. */
  protected activeIndex = -1;
  /** Values currently showing the transient `moved-flash` state. */
  protected flashedValues = new Set<string>();

  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.activeIndex >= this.options.length) {
      this.activeIndex = this.options.length - 1;
    }
  }

  protected optionId(index: number): string {
    return `${this.listId}-opt-${index}`;
  }

  protected isActiveTabStop(index: number): boolean {
    return index === this.activeIndex || (this.activeIndex === -1 && index === 0);
  }

  protected isSelected(option: InoOrderListOption): boolean {
    return this.value.includes(option.value);
  }

  protected isFlashed(option: InoOrderListOption): boolean {
    return this.flashedValues.has(option.value);
  }

  protected get interactive(): boolean {
    return !this.disabled && !this.readonly && !this.loading;
  }

  // ── Selection (Tier-1 `value`/`valueChange` contract) ──────────────────────────────────────

  protected activateOption(index: number, option: InoOrderListOption): void {
    if (!this.interactive || option.disabled) {
      return;
    }
    this.activeIndex = index;
    this.toggleSelection(option);
    this.focusActiveOption();
  }

  private toggleSelection(option: InoOrderListOption): void {
    const selected = this.value.includes(option.value);
    const next = selected ? this.value.filter((v) => v !== option.value) : [...this.value, option.value];
    this.value = next;
    this.valueChange.emit(next);
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────────────────────

  protected onOptionKeydown(event: KeyboardEvent, index: number, option: InoOrderListOption): void {
    if (!this.interactive) {
      return;
    }
    const alt = event.altKey;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (alt) {
          this.moveDown();
        } else {
          this.moveActiveFocus(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (alt) {
          this.moveUp();
        } else {
          this.moveActiveFocus(-1);
        }
        break;
      case 'Home':
        event.preventDefault();
        if (alt) {
          this.moveToTop();
        } else {
          this.jumpActiveFocus(0);
        }
        break;
      case 'End':
        event.preventDefault();
        if (alt) {
          this.moveToBottom();
        } else {
          this.jumpActiveFocus(this.options.length - 1);
        }
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        this.activateOption(index, option);
        break;
    }
  }

  private moveActiveFocus(delta: number): void {
    if (!this.options.length) {
      return;
    }
    const next = clamp((this.activeIndex < 0 ? 0 : this.activeIndex) + delta, 0, this.options.length - 1);
    this.jumpActiveFocus(next);
  }

  private jumpActiveFocus(index: number): void {
    if (index < 0 || index >= this.options.length) {
      return;
    }
    this.activeIndex = index;
    this.focusActiveOption();
  }

  private focusActiveOption(): void {
    if (this.activeIndex < 0) {
      return;
    }
    const id = this.optionId(this.activeIndex);
    queueMicrotask(() => {
      this.host.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`)?.focus();
    });
  }

  // ── Reorder (buttons + Alt+Arrow keyboard — SPEC.md §1) ────────────────────────────────────

  protected get canMove(): boolean {
    return this.interactive && this.value.length > 0 && this.options.length > 1;
  }

  /** One step per call, same granularity PrimeNG's own Up/Down buttons use — repeated clicks (or
   *  repeated `Alt+ArrowUp`) walk a selected block further. Selected rows move together as a
   *  contiguous block: ascending-order scan so an already-moved row never blocks the next
   *  selected row behind it in the same pass. */
  protected moveUp(): void {
    if (!this.canMove) {
      return;
    }
    const next = [...this.options];
    const selected = new Set(this.value);
    for (let i = 1; i < next.length; i++) {
      if (selected.has(next[i].value) && !selected.has(next[i - 1].value)) {
        [next[i - 1], next[i]] = [next[i], next[i - 1]];
      }
    }
    this.commitReorder(next);
  }

  protected moveDown(): void {
    if (!this.canMove) {
      return;
    }
    const next = [...this.options];
    const selected = new Set(this.value);
    for (let i = next.length - 2; i >= 0; i--) {
      if (selected.has(next[i].value) && !selected.has(next[i + 1].value)) {
        [next[i], next[i + 1]] = [next[i + 1], next[i]];
      }
    }
    this.commitReorder(next);
  }

  /** Selected rows move to the front, preserving their relative order; unselected rows keep
   *  their relative order after them. */
  protected moveToTop(): void {
    if (!this.canMove) {
      return;
    }
    const selected = new Set(this.value);
    const picked = this.options.filter((o) => selected.has(o.value));
    const rest = this.options.filter((o) => !selected.has(o.value));
    this.commitReorder([...picked, ...rest]);
  }

  protected moveToBottom(): void {
    if (!this.canMove) {
      return;
    }
    const selected = new Set(this.value);
    const picked = this.options.filter((o) => selected.has(o.value));
    const rest = this.options.filter((o) => !selected.has(o.value));
    this.commitReorder([...rest, ...picked]);
  }

  private commitReorder(next: InoOrderListOption[]): void {
    this.options = next;
    this.optionsChange.emit(next);
    this.flashMoved(this.value);
  }

  /** `moved-flash` state (doc 26 §5) — briefly marks the rows that just moved, then clears. See
   *  SPEC.md §4 for the duration rationale. */
  private flashMoved(values: string[]): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
    this.flashedValues = new Set(values);
    this.flashTimer = setTimeout(() => {
      this.flashedValues = new Set();
      this.flashTimer = null;
      // The flash-off edge has no originating template event on this OnPush component (it fires
      // from a bare timer callback), so it needs an explicit markForCheck — unlike the flash-on
      // edge above, which piggybacks on the click/keydown event that triggered the move itself.
      this.cdr.markForCheck();
    }, MOVED_FLASH_MS);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
