import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';
import { MaskToken, describeMask, parseMask, testChar } from './mask-tokens';
import { INO_INPUTMASK_PRESETS, InoInputMaskPreset } from './mask-presets';

let idCounter = 0;

/**
 * `<ino-inputmask>` — pattern-masked text entry (PAN, GSTIN, IFSC, phone, date, or a custom
 * `mask` string). Contract: INO-404 (INO-31 Phase B1, doc 26 §2/§5).
 *
 * **Slot-array model, not string diffing.** Internal state (`_slots`) is one entry per mask
 * token — `null` for an unfilled editable slot, the typed character otherwise — the same model
 * `ino-input-otp` uses for its per-box `_chars` (`../input-otp/ino-input-otp.component.ts`),
 * generalized to a single native `<input>` instead of one input per box. `(keydown)` intercepts
 * every printable key, Backspace, and Delete directly rather than reading the post-edit DOM value
 * on `(input)`, because a masked field's displayed string always contains literal separators the
 * user didn't type (`/`, `-`, the GSTIN `Z`) — diffing old-vs-new displayed strings to recover
 * "what did the user actually type" is the fragile part of most mask implementations; owning the
 * model and only ever rendering `displayValue` from it sidesteps that entirely. `(input)` is kept
 * as a resync fallback for input paths `keydown` can't see cleanly (composed/IME text, some mobile
 * virtual keyboards): if the native value ever drifts from `displayValue`, it's rebuilt from
 * scratch by re-threading the raw characters through `placeChar` in order.
 *
 * `value`/`valueChange` (banana-in-a-box, matching `ino-input`'s convention) carry the **compact
 * raw string** — typed characters only, literals and unfilled-slot gaps excluded — since that's
 * what a caller almost always wants to store (a PAN, not `"ABCDE_234F"`). `maskComplete` fires
 * once, the moment every required (non-`?`-optional) slot holds a character — mirrors
 * `ino-input-otp`'s `complete` output.
 *
 * WCAG 2.2: the mask's format is announced via `aria-describedby` (`formatId`, doc 26 §5 a11y row
 * "mask announced via description") — a visually-hidden paragraph built from `describeMask()`
 * (`./mask-tokens.ts`), e.g. "Format: 5 letters, 4 digits, 1 letter." — read on focus alongside
 * hint/error text, not instead of it. `incomplete` (doc 26 §5 States row) is derived, not a
 * settable `@Input`: true once the user has typed anything but a required slot is still empty;
 * `error` remains the caller-driven `invalid` state (e.g. a failed PAN checksum), independent of
 * completeness, same separation `ino-input-otp` draws between its own derived-complete state and
 * `error`.
 */
@Component({
  selector: 'ino-inputmask',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-inputmask.component.html',
  styleUrl: './ino-inputmask.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-inputmask',
    '[attr.data-size]': 'size',
    '[class.ino-inputmask--loading]': 'loading',
    '[class.ino-inputmask--incomplete]': 'incomplete',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoInputMaskComponent {
  @Input() label = '';
  /** Explicit mask pattern (`./mask-tokens.ts` grammar). Ignored when `preset` is set. */
  @Input() mask = '';
  /** India-stack preset (`./mask-presets.ts`) — takes precedence over `mask`/`placeholderChar`. */
  @Input() preset: InoInputMaskPreset | '' = '';
  @Input() placeholderChar = '_';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;

  private _slots: (string | null)[] = [];
  private hasCompleted = false;

  @Input()
  set value(next: string) {
    this.ensureSlots();
    this._slots = this.tokens.map(() => null);
    this.applyStream(0, next ?? '');
    this.hasCompleted = this.isComplete();
  }
  get value(): string {
    this.ensureSlots();
    return this.tokens.map((t, i) => (t.kind === 'literal' ? '' : (this._slots[i] ?? ''))).join('');
  }

  @Output() valueChange = new EventEmitter<string>();
  /** Fires once, the moment every required slot holds a character. */
  @Output() maskComplete = new EventEmitter<string>();

  protected readonly inputId = `ino-inputmask-${++idCounter}`;
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly errorId = `${this.inputId}-error`;
  protected readonly formatId = `${this.inputId}-format`;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  protected get resolvedMask(): string {
    return this.preset ? INO_INPUTMASK_PRESETS[this.preset].mask : this.mask;
  }

  protected get resolvedPlaceholderChar(): string {
    return this.preset
      ? (INO_INPUTMASK_PRESETS[this.preset].placeholderChar ?? this.placeholderChar)
      : this.placeholderChar;
  }

  protected get tokens(): MaskToken[] {
    return parseMask(this.resolvedMask);
  }

  protected get displayValue(): string {
    this.ensureSlots();
    return this.tokens
      .map((t, i) => (t.kind === 'literal' ? t.char : (this._slots[i] ?? this.resolvedPlaceholderChar)))
      .join('');
  }

  protected get formatDescription(): string {
    return `Format: ${describeMask(this.tokens)}. Empty characters shown as "${this.resolvedPlaceholderChar}".`;
  }

  protected get describedBy(): string {
    const ids = [
      this.error ? this.errorId : this.hint ? this.hintId : null,
      this.formatId,
    ].filter((id): id is string => !!id);
    return ids.join(' ');
  }

  protected get incomplete(): boolean {
    const anyFilled = this._slots.some((v) => v != null);
    return anyFilled && !this.isComplete();
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly || this.loading) return;
    const input = event.target as HTMLInputElement;
    this.ensureSlots();
    const tokens = this.tokens;
    const selStart = input.selectionStart ?? this._slots.length;
    const selEnd = input.selectionEnd ?? selStart;

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (selStart !== selEnd) {
        this.clearRange(selStart, selEnd);
        this.commit();
        this.placeCaret(input, selStart);
        return;
      }
      let idx = selStart - 1;
      while (idx >= 0 && tokens[idx]?.kind === 'literal') idx--;
      if (idx >= 0) {
        this._slots[idx] = null;
        this.commit();
        this.placeCaret(input, idx);
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      if (selStart !== selEnd) {
        this.clearRange(selStart, selEnd);
        this.commit();
        this.placeCaret(input, selStart);
        return;
      }
      let idx = selStart;
      while (idx < tokens.length && tokens[idx].kind === 'literal') idx++;
      if (idx < tokens.length) {
        this._slots[idx] = null;
        this.commit();
        this.placeCaret(input, idx);
      }
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (selStart !== selEnd) this.clearRange(selStart, selEnd);
      const next = this.placeChar(selStart, event.key);
      if (next !== null) {
        this.commit();
        this.placeCaret(input, next);
      }
    }
    // Arrows/Tab/Home/End: allow native caret movement unchanged.
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value === this.displayValue) return;
    this.resyncFromRaw(input.value);
    input.value = this.displayValue;
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    if (this.disabled || this.readonly || this.loading) return;
    const input = event.target as HTMLInputElement;
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text) return;

    this.ensureSlots();
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? selStart;
    if (selStart !== selEnd) this.clearRange(selStart, selEnd);

    const endIdx = this.applyStream(selStart, text);
    this.commit();
    this.placeCaret(input, endIdx);
  }

  onFocus(event: FocusEvent): void {
    if (this.disabled || this.readonly || this.loading) return;
    const input = event.target as HTMLInputElement;
    const firstEmpty = this.tokens.findIndex((t, i) => t.kind !== 'literal' && this._slots[i] == null);
    this.placeCaret(input, firstEmpty === -1 ? this.tokens.length : firstEmpty);
  }

  private ensureSlots(): void {
    const len = this.tokens.length;
    if (this._slots.length !== len) {
      const old = this._slots;
      this._slots = Array.from({ length: len }, (_, i) => old[i] ?? null);
    }
  }

  /** Finds the next editable slot at/after `startIdx`, tests `ch` against it, fills it if it
   *  matches, and returns the caret index just past it (skipping any trailing literals) —
   *  or `null` if `ch` doesn't fit that slot's type. */
  private placeChar(startIdx: number, ch: string): number | null {
    const tokens = this.tokens;
    let idx = startIdx;
    while (idx < tokens.length && tokens[idx].kind === 'literal') idx++;
    if (idx >= tokens.length) return null;
    const token = tokens[idx];
    if (!testChar(token, ch)) return null;
    this._slots[idx] = token.upper ? ch.toUpperCase() : ch;
    let next = idx + 1;
    while (next < tokens.length && tokens[next].kind === 'literal') next++;
    return next;
  }

  private clearRange(start: number, end: number): void {
    const tokens = this.tokens;
    for (let i = start; i < end && i < tokens.length; i++) {
      if (tokens[i].kind !== 'literal') this._slots[i] = null;
    }
  }

  /** Threads a source character cursor and a mask token cursor forward together — unlike
   *  `placeChar` (one keystroke against the token at the caret), this is for a whole string
   *  (paste, external `value`, IME resync) that may already contain the mask's own literal
   *  characters at their natural position (e.g. an IFSC's fixed `0`): a literal token consumes a
   *  matching source character if present, but never *requires* one, so pre-formatted and bare
   *  input both land in the right slots. Returns the token index just past the last slot touched. */
  private applyStream(startTokenIdx: number, raw: string): number {
    const tokens = this.tokens;
    let ti = startTokenIdx;
    let ri = 0;
    while (ti < tokens.length && ri < raw.length) {
      const token = tokens[ti];
      if (token.kind === 'literal') {
        if (raw[ri] === token.char) ri++;
        ti++;
        continue;
      }
      while (ri < raw.length && !testChar(token, raw[ri])) ri++;
      if (ri >= raw.length) break;
      this._slots[ti] = token.upper ? raw[ri].toUpperCase() : raw[ri];
      ri++;
      ti++;
    }
    return ti;
  }

  private resyncFromRaw(raw: string): void {
    this.ensureSlots();
    this._slots = this.tokens.map(() => null);
    this.applyStream(0, raw);
    this.commit();
  }

  private isComplete(): boolean {
    const tokens = this.tokens;
    return tokens.every((t, i) => t.kind === 'literal' || t.optional || this._slots[i] != null);
  }

  private commit(): void {
    this.valueChange.emit(this.value);
    const complete = this.isComplete();
    if (complete && !this.hasCompleted) {
      this.hasCompleted = true;
      this.maskComplete.emit(this.value);
    } else if (!complete) {
      this.hasCompleted = false;
    }
    this.cdr.markForCheck();
  }

  /** Caret position has to be set imperatively — the native `value` Angular will render from
   *  `displayValue` hasn't flushed to the DOM yet this tick (OnPush), so both the value and the
   *  selection are set on the real element directly rather than waiting a change-detection cycle. */
  private placeCaret(input: HTMLInputElement, index: number): void {
    input.value = this.displayValue;
    const pos = Math.max(0, Math.min(index, input.value.length));
    input.setSelectionRange(pos, pos);
  }
}
