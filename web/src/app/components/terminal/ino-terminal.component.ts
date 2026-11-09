import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoTerminalLine, InoTerminalSize } from './ino-terminal.types';

let nextTerminalId = 0;

@Component({
  selector: 'ino-terminal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-terminal.component.html',
  styleUrls: ['./ino-terminal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoTerminalComponent implements OnInit {
  /** Glyph(s) shown before the input caret and echoed before each submitted command */
  @Input() prompt = '$';

  /** `system`-type lines seeded once at mount, before any command history */
  @Input() welcomeMessage: string[] = [];

  /** Accessible name root for the log region ("<ariaLabel> output") and input ("<ariaLabel> command input") */
  @Input() ariaLabel = 'Terminal';

  /** Fixed scrollback block-size: sm 200 / md 320 / lg 440px (density-immune, SPEC.md §5) */
  @Input() size: InoTerminalSize = 'md';

  /** A command is "running": input disabled, prompt row replaced by an animated busy row */
  @Input() busy = false;

  /** Whole widget inert: input gets native `disabled`, not focusable */
  @Input() disabled = false;

  /** No input row at all — pure log viewer; scrollback stays selectable/scrollable */
  @Input() readonly = false;

  /** Emits the trimmed command text on Enter (when not busy/disabled/readonly and non-empty) */
  @Output() commandSubmit = new EventEmitter<string>();

  @ViewChild('logEl') private logRef?: ElementRef<HTMLElement>;
  @ViewChild('inputEl') private inputRef?: ElementRef<HTMLInputElement>;

  /** Scrollback transcript: welcome banner + echoed input + appended output */
  lines: InoTerminalLine[] = [];

  /** Current input value (manual binding — no FormsModule dependency) */
  inputValue = '';

  /** Container-level `focused` ring state — true while the input has focus, any modality */
  focused = false;

  readonly logId = `ino-terminal-log-${nextTerminalId}`;
  readonly inputId = `ino-terminal-input-${nextTerminalId++}`;

  /** Recall (Up/Down) state — never mutates `lines` */
  private history: string[] = [];
  private historyIndex = -1;
  private draftValue = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.welcomeMessage.length > 0) {
      this.lines = this.welcomeMessage.map((text) => ({ type: 'system' as const, text }));
    }
  }

  onInputChange(event: Event): void {
    this.inputValue = (event.target as HTMLInputElement).value;
  }

  onInputFocus(): void {
    this.focused = true;
    this.cdr.markForCheck();
  }

  onInputBlur(): void {
    this.focused = false;
    this.cdr.markForCheck();
  }

  onInputKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.submit();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.recallPrevious();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.recallNext();
        break;
    }
  }

  /** Echoes the trimmed command, pushes it onto recall history, emits, clears the input. */
  submit(): void {
    if (this.busy || this.disabled || this.readonly) {
      return;
    }
    const value = this.inputValue.trim();
    if (!value) {
      return;
    }
    this.lines = [...this.lines, { type: 'input', text: value }];
    this.history.push(value);
    this.historyIndex = -1;
    this.draftValue = '';
    this.inputValue = '';
    this.commandSubmit.emit(value);
    this.scrollToBottomSoon();
    this.cdr.markForCheck();
  }

  /** Appends one or more scrollback lines and scrolls to bottom. Consumer-driven — the component never generates output itself. */
  writeOutput(text: string | string[], type: 'output' | 'error' | 'system' = 'output'): void {
    const items = Array.isArray(text) ? text : [text];
    this.lines = [...this.lines, ...items.map((t) => ({ type, text: t }))];
    this.scrollToBottomSoon();
    this.cdr.markForCheck();
  }

  /** Empties the scrollback. Matches shell `clear` semantics — the welcome message is not restored. */
  clear(): void {
    this.lines = [];
    this.cdr.markForCheck();
  }

  /** Focuses the input programmatically. No-op when disabled/readonly. */
  focusInput(): void {
    if (this.disabled || this.readonly) {
      return;
    }
    this.inputRef?.nativeElement.focus();
  }

  /**
   * Click-to-focus on the log region, matching terminal emulators where the caret is the
   * only input affordance. Skipped when the click resolved a text selection (drag-to-select
   * must not be yanked back to the input), or when disabled/readonly.
   */
  onLogClick(): void {
    if (this.disabled || this.readonly) {
      return;
    }
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    if (selection && !selection.isCollapsed) {
      return;
    }
    this.focusInput();
  }

  private recallPrevious(): void {
    if (this.history.length === 0) {
      return;
    }
    if (this.historyIndex === -1) {
      this.draftValue = this.inputValue;
      this.historyIndex = this.history.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    }
    this.inputValue = this.history[this.historyIndex];
  }

  private recallNext(): void {
    if (this.historyIndex === -1) {
      return;
    }
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.inputValue = this.history[this.historyIndex];
    } else {
      this.historyIndex = -1;
      this.inputValue = this.draftValue;
    }
  }

  /** Post-render scroll-to-bottom (same `setTimeout(…, 0)` idiom `ino-speeddial` uses for post-render focus). */
  private scrollToBottomSoon(): void {
    setTimeout(() => {
      const log = this.logRef?.nativeElement;
      if (log) {
        log.scrollTop = log.scrollHeight;
      }
    }, 0);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
