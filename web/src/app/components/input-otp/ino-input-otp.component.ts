import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

let idCounter = 0;

/**
 * `<ino-input-otp>` — one-time-password entry: `length` single-character boxes with roving focus,
 * built for KYB verification flows (INO-146, INO-31 T-6). Contract: SPEC.md.
 *
 * Each box is a real native `<input>` (not one control split visually) so paste, arrow-key nav,
 * and platform SMS/OTP autofill all work against real DOM inputs rather than a synthetic overlay.
 * All boxes share `autocomplete="one-time-code"` and the same `name` — the mechanism Safari/iOS
 * uses to spread an autofilled or pasted code across a *sequence* of adjacent inputs (there is no
 * single-input equivalent for a segmented OTP field); see SPEC.md §1.
 *
 * Plain `@Input() value` / `@Output() valueChange` (banana-in-a-box), matching `ino-input`'s
 * existing convention — not a `ControlValueAccessor` (no Reactive/Template-driven Forms module is
 * wired up anywhere in this repo yet). `complete` fires once when every box holds a character.
 *
 * WCAG 2.2: the box row is `role="group"` labelled by `<ino-label>` (`aria-labelledby`, since a
 * native `<label for>` can only target one control); each box additionally carries its own
 * `aria-label` ("Digit N of length") so AT can announce position while moving between them. A
 * visually-hidden `aria-live="polite"` region announces progress per keystroke ("Digit 3 of 6
 * entered." / "Code complete.") — the per-cell announcement pattern the issue calls for, since a
 * sighted user sees the caret advance but a screen-reader user gets no other signal that input
 * landed in the next box. `readonly`/`loading` reuse `ino-input`'s native-`readonly` contract (SPEC
 * §2/§3 there) so boxes stay focusable and their values stay announced/copyable.
 */
@Component({
  selector: 'ino-input-otp',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-input-otp.component.html',
  styleUrl: './ino-input-otp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-input-otp',
    '[attr.data-size]': 'size',
    '[class.ino-input-otp--loading]': 'loading',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoInputOtpComponent implements AfterViewInit {
  @Input() label = '';
  @Input({ transform: numberAttribute }) length = 6;
  @Input({ transform: booleanAttribute }) mask = false;
  @Input({ transform: booleanAttribute }) integerOnly = true;
  @Input() value = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  /** Autofocus the first empty box on init — off by default so a page with more than one OTP
   *  field (or an OTP field below the fold) never steals focus without the caller opting in. */
  @Input({ transform: booleanAttribute }) autofocus = false;

  @Output() valueChange = new EventEmitter<string>();
  /** Fires once, the moment every box holds a character. */
  @Output() complete = new EventEmitter<string>();

  @ViewChildren('cell') private cellRefs!: QueryList<ElementRef<HTMLInputElement>>;

  protected readonly groupId = `ino-input-otp-${++idCounter}`;
  protected readonly labelId = `${this.groupId}-label`;
  protected readonly hintId = `${this.groupId}-hint`;
  protected readonly errorId = `${this.groupId}-error`;
  protected announcement = '';

  protected get cells(): string[] {
    const chars = this.value.split('');
    return Array.from({ length: this.length }, (_, i) => chars[i] ?? '');
  }

  ngAfterViewInit(): void {
    if (this.autofocus && !this.disabled) {
      this.focusCell(this.cells.findIndex((c) => !c) === -1 ? 0 : this.cells.findIndex((c) => !c));
    }
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  onCellInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const char = input.value.slice(-1);
    if (char && this.integerOnly && !/^\d$/.test(char)) {
      input.value = this.cells[index];
      return;
    }
    this.setChar(index, char);
    input.value = char;
    if (char && index < this.length - 1) {
      this.focusCell(index + 1);
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (this.disabled || this.readonly || this.loading) return;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.focusCell(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.focusCell(index + 1);
        break;
      case 'Backspace':
        if (!this.cells[index] && index > 0) {
          event.preventDefault();
          this.setChar(index - 1, '');
          this.focusCell(index - 1);
        }
        break;
    }
  }

  onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onPaste(index: number, event: ClipboardEvent): void {
    event.preventDefault();
    if (this.disabled || this.readonly || this.loading) return;
    const text = event.clipboardData?.getData('text') ?? '';
    const filtered = this.integerOnly ? text.replace(/\D/g, '') : text.replace(/\s/g, '');
    if (!filtered) return;

    const chars = this.cells.slice();
    let cursor = index;
    for (const char of filtered) {
      if (cursor >= this.length) break;
      chars[cursor] = char;
      cursor++;
    }
    this.commit(chars, cursor - 1);
    this.focusCell(Math.min(cursor, this.length - 1));
  }

  private setChar(index: number, char: string): void {
    const chars = this.cells.slice();
    chars[index] = char;
    this.commit(chars, index);
  }

  private commit(chars: string[], announceIndex: number): void {
    this.value = chars.join('').slice(0, this.length);
    this.valueChange.emit(this.value);

    const filledCount = chars.filter(Boolean).length;
    if (filledCount === this.length) {
      this.announcement = 'Code complete.';
      this.complete.emit(this.value);
    } else if (chars[announceIndex]) {
      this.announcement = `Digit ${announceIndex + 1} of ${this.length} entered.`;
    } else {
      this.announcement = `Digit ${announceIndex + 1} of ${this.length} cleared.`;
    }
  }

  private focusCell(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.length - 1));
    this.cellRefs?.get(clamped)?.nativeElement.focus();
  }
}
