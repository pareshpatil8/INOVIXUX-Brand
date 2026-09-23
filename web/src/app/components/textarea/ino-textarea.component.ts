import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

let idCounter = 0;

export type InoTextareaVariant = 'outline' | 'filled';

/**
 * `<ino-textarea>` — labeled multi-line text control. Contract: INO-147 (INO-31 T-7, Tier 1 /
 * Form group). Sibling to `<ino-input>` (INO-157): same label/hint/error/size/variant/
 * disabled/readonly/loading contract and the same plain `@Input() value` / `@Output()
 * valueChange` (banana-in-a-box) convention — no `ControlValueAccessor`, matching this repo's
 * existing forms convention (see `ino-input.component.ts` doc comment).
 *
 * Two sizing modes, mutually exclusive at the template level (DoD scope: "auto-resize, fixed
 * rows"): `autoResize` grows the control with its content up to `maxRows`; when `autoResize` is
 * `false` (default) the control is a fixed-height box sized by the native `rows` attribute and
 * user-resizable via the browser's own resize handle. See SPEC.md §1 for why auto-resize is
 * computed from `scrollHeight` in JS rather than a CSS-only technique.
 *
 * `maxLength` + `showCount` render a live character counter (SPEC.md §2) — the one gap-analysis
 * variant named in the issue beyond what `ino-input` already carries.
 *
 * WCAG 2.2: same contract as `ino-input` — real `<label for>`, `aria-invalid` +
 * `aria-describedby` wiring the error/hint/counter text in, native `readonly` (never `disabled`)
 * for the readonly and loading states so the control stays focusable and its value stays
 * announced/selectable/copyable.
 */
@Component({
  selector: 'ino-textarea',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-textarea.component.html',
  styleUrl: './ino-textarea.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-textarea',
    '[attr.data-size]': 'size',
    '[class.ino-textarea--filled]': "variant === 'filled'",
    '[class.ino-textarea--loading]': 'loading',
    '[class.ino-textarea--auto-resize]': 'autoResize',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoTextareaComponent implements AfterViewInit {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input() variant: InoTextareaVariant = 'outline';
  /** Fixed-height row count, native `rows` attribute. Ignored visually once `autoResize` takes
   *  over sizing after the first paint, but still serves as the initial/no-JS row count. */
  @Input({ transform: numberAttribute }) rows = 3;
  /** Auto-resize (DoD scope). When `true`, height tracks content via `scrollHeight` — see
   *  SPEC.md §1 — bounded by `minRows`/`maxRows`. */
  @Input({ transform: booleanAttribute }) autoResize = false;
  @Input({ transform: numberAttribute }) minRows = 2;
  @Input({ transform: numberAttribute }) maxRows = 10;
  /** Native `maxlength`; also drives the character counter denominator when `showCount` is set. */
  @Input({ transform: numberAttribute }) maxLength: number | null = null;
  /** Renders a `{count}/{maxLength}` counter under the control (SPEC.md §2). No-op without
   *  `maxLength` set. */
  @Input({ transform: booleanAttribute }) showCount = false;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('control') private readonly controlRef?: ElementRef<HTMLTextAreaElement>;

  protected readonly textareaId = `ino-textarea-${++idCounter}`;
  protected readonly hintId = `${this.textareaId}-hint`;
  protected readonly errorId = `${this.textareaId}-error`;
  protected readonly counterId = `${this.textareaId}-counter`;

  protected get describedBy(): string | null {
    const ids = [
      this.error ? this.errorId : this.hint ? this.hintId : null,
      this.showCount && this.maxLength ? this.counterId : null,
    ].filter((id): id is string => !!id);
    return ids.length ? ids.join(' ') : null;
  }

  ngAfterViewInit(): void {
    if (this.autoResize) {
      this.resize();
    }
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.value = value;
    this.valueChange.emit(value);
    if (this.autoResize) {
      this.resize();
    }
  }

  /** `scrollHeight`-based auto-resize (SPEC.md §1): height is reset to `auto` first so
   *  `scrollHeight` reflects the content's natural height rather than the previously-set one
   *  (otherwise a shrinking edit — e.g. deleting a line — would never shrink the box back down),
   *  then clamped between `minRows` and `maxRows` measured in pixels via the control's own
   *  line-height so the bound tracks `size`/font changes instead of a hardcoded pixel value. */
  private resize(): void {
    const el = this.controlRef?.nativeElement;
    if (!el) {
      return;
    }
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const minHeight = lineHeight * this.minRows;
    const maxHeight = lineHeight * this.maxRows;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }
}
