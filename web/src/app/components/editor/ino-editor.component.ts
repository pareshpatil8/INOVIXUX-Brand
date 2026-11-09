import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
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

export type InoEditorPreset = 'basic' | 'full';

/** One toolbar control. `toggle` buttons carry `aria-pressed` synced to the live selection. */
interface InoEditorButton {
  id: string;
  label: string;
  glyph: string;
  toggle: boolean;
  /** Flat roving-tabindex position among buttons (dividers excluded). */
  index: number;
}

type InoEditorItem = InoEditorButton | 'divider';

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/** `href` gate shared by the paste sanitizer and the Link command (SPEC.md §2/§4):
 *  `http(s):`/`mailto:` only — `javascript:`, `data:` etc. are rejected, never inserted. */
export function isSafeHref(href: string): boolean {
  try {
    return SAFE_PROTOCOLS.includes(new URL(href, 'https://relative.invalid').protocol);
  } catch {
    return false;
  }
}

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'EM', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'PRE', 'CODE', 'A',
]);
const RENAMED_TAGS: Record<string, string> = { B: 'STRONG', I: 'EM', H1: 'H2', DIV: 'P' };
const DROPPED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'HEAD', 'TITLE', 'META', 'LINK', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE',
]);

/**
 * The one sanitizer behind both call sites (SPEC.md §4): the `paste` handler and the `value`
 * @Input setter. Allowlist rebuild via `DOMParser` — the XSS boundary (script/style dropped
 * wholesale, every attribute stripped except a protocol-checked `a[href]`) and the format-noise
 * boundary (unknown tags unwrap to their children, `b/i/h1/div` normalize to
 * `strong/em/h2/p`). Exported for the unit spec.
 */
export function sanitizeEditorHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const out = document.createElement('div');
  appendSanitized(parsed.body, out);
  return out.innerHTML;
}

function appendSanitized(source: Node, target: Node): void {
  source.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent ?? ''));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = child as Element;
    if (DROPPED_TAGS.has(el.tagName)) {
      return;
    }
    const tag = RENAMED_TAGS[el.tagName] ?? el.tagName;
    if (!ALLOWED_TAGS.has(tag)) {
      appendSanitized(el, target);
      return;
    }
    if (tag === 'A') {
      const href = (el.getAttribute('href') ?? '').trim();
      if (!isSafeHref(href)) {
        appendSanitized(el, target);
        return;
      }
      const anchor = document.createElement('a');
      anchor.setAttribute('href', href);
      anchor.setAttribute('rel', 'noopener noreferrer');
      target.appendChild(anchor);
      appendSanitized(el, anchor);
      return;
    }
    const clean = document.createElement(tag);
    target.appendChild(clean);
    appendSanitized(el, clean);
  });
}

/* `execCommand` wrappers — a browser (or jsdom in the unit spec) without the deprecated API
   degrades to a silent no-op instead of throwing; SPEC.md §1 records this floor explicitly. */
function execCommand(command: string, value?: string): void {
  try {
    document.execCommand(command, false, value);
  } catch {
    /* degrade silently */
  }
}

function queryState(command: string): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function queryBlock(): string {
  try {
    return String(document.queryCommandValue('formatBlock')).toLowerCase();
  } catch {
    return '';
  }
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r?\n/g, '<br>');
}

/**
 * `<ino-editor>` — labeled rich-text control. Contract: INO-475 (INO-31 B5, doc 26 §5 row
 * "ino-editor"); decisions record `SPEC.md` in this directory. Engine is `contenteditable` +
 * `document.execCommand` with zero runtime dependencies (SPEC.md §1 — PrimeNG's Quill is a
 * benchmark, not a dependency). Field shell (label/hint/error/counter, `aria-describedby`)
 * matches `<ino-textarea>`; toolbar keyboarding matches `<ino-toolbar>`'s APG roving tabindex.
 *
 * Value contract: plain `@Input() value` (HTML string) / `@Output() valueChange` — no
 * `ControlValueAccessor`, the repo-wide forms convention. Incoming values pass through
 * `sanitizeEditorHtml` before touching `innerHTML`; `valueChange` emits the sanitized form of
 * the live DOM. A re-bind of the value the editor just emitted is detected (`lastEmitted`) and
 * skips the `innerHTML` write, so banana-in-a-box binding never destroys the caret mid-typing.
 *
 * The document-level `selectionchange` listener keeps `aria-pressed` on the format toggles in
 * sync with the caret (SPEC.md §3); it early-returns unless focus is inside this component, so
 * the per-event cost outside the editor is one boolean check.
 */
@Component({
  selector: 'ino-editor',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-editor.component.html',
  styleUrl: './ino-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-editor',
    '[attr.data-size]': 'size',
    '[class.ino-editor--disabled]': 'disabled',
    '[class.ino-editor--readonly]': 'readonly',
    '[class.ino-editor--invalid]': '!!error',
  },
})
export class InoEditorComponent implements AfterViewInit {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() error = '';
  /** Accessible name fallback when no visible `label` is rendered. */
  @Input() ariaLabel = '';
  @Input() size: InoControlSize = 'default';
  /** Toolbar preset (SPEC.md §2): `basic` = inline styles + lists; `full` adds headings,
   *  code block, link/unlink and clear formatting. */
  @Input() set preset(value: InoEditorPreset) {
    this.presetValue = value;
    this.items = buildItems(value);
    this.focusIndex = 0;
  }
  get preset(): InoEditorPreset {
    return this.presetValue;
  }
  /** Character budget counted on `textContent`, not markup (SPEC.md §5). */
  @Input({ transform: numberAttribute }) maxLength: number | null = null;
  /** Renders a `{count}/{maxLength}` counter; no-op without `maxLength` (textarea contract). */
  @Input({ transform: booleanAttribute }) showCount = false;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Input() set value(incoming: string) {
    const clean = sanitizeEditorHtml(incoming ?? '');
    this.currentValue = clean;
    // Re-bind of our own emission: skip the innerHTML write or the caret dies on every keystroke.
    if (clean === this.lastEmitted) {
      return;
    }
    const el = this.contentRef?.nativeElement;
    if (el && el.innerHTML !== clean) {
      el.innerHTML = clean;
      this.refreshCount();
    }
  }
  get value(): string {
    return this.currentValue;
  }

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('content') private readonly contentRef?: ElementRef<HTMLElement>;

  protected readonly editorId = `ino-editor-${++idCounter}`;
  protected readonly labelId = `${this.editorId}-label`;
  protected readonly hintId = `${this.editorId}-hint`;
  protected readonly errorId = `${this.editorId}-error`;
  protected readonly counterId = `${this.editorId}-counter`;

  protected items: InoEditorItem[] = buildItems('basic');
  protected focusIndex = 0;
  protected pressed: Record<string, boolean> = {};
  protected charCount = 0;
  protected isEmpty = true;
  protected hasFocus = false;

  private presetValue: InoEditorPreset = 'basic';
  private currentValue = '';
  private lastEmitted: string | null = null;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly cdr: ChangeDetectorRef
  ) {}

  protected get describedBy(): string | null {
    const ids = [
      this.error ? this.errorId : this.hint ? this.hintId : null,
      this.showCount && this.maxLength ? this.counterId : null,
    ].filter((id): id is string => !!id);
    return ids.length ? ids.join(' ') : null;
  }

  protected get atLimit(): boolean {
    return this.maxLength != null && this.charCount >= this.maxLength;
  }

  protected isButton(item: InoEditorItem): item is InoEditorButton {
    return item !== 'divider';
  }

  ngAfterViewInit(): void {
    const el = this.contentRef!.nativeElement;
    el.innerHTML = this.currentValue;
    // Consistent block element on Enter — without this Chrome wraps new lines in <div>.
    execCommand('defaultParagraphSeparator', 'p');
    this.refreshCount();
    this.cdr.markForCheck();
  }

  protected focusContent(): void {
    if (!this.disabled) {
      this.contentRef?.nativeElement.focus();
    }
  }

  // ---- toolbar ------------------------------------------------------------

  protected exec(item: InoEditorButton): void {
    if (this.disabled || this.readonly) {
      return;
    }
    this.focusIndex = item.index;
    this.focusContent();
    switch (item.id) {
      case 'bold':
      case 'italic':
      case 'underline':
        execCommand(item.id);
        break;
      case 'ul':
        execCommand('insertUnorderedList');
        break;
      case 'ol':
        execCommand('insertOrderedList');
        break;
      case 'h2':
      case 'h3':
      case 'pre': {
        // Toggle semantics: re-activating the current block format reverts it to a paragraph.
        execCommand('formatBlock', queryBlock() === item.id ? 'p' : item.id);
        break;
      }
      case 'link': {
        const url = window.prompt('Link URL (https…)');
        if (!url || !isSafeHref(url.trim())) {
          return;
        }
        execCommand('createLink', url.trim());
        break;
      }
      case 'unlink':
        execCommand('unlink');
        break;
      case 'clear':
        execCommand('removeFormat');
        break;
    }
    this.syncFromDom();
    this.refreshPressed();
  }

  protected onToolbarKeydown(event: KeyboardEvent): void {
    const buttons = this.toolbarButtons();
    if (!buttons.length) {
      return;
    }
    let next = -1;
    switch (event.key) {
      case 'ArrowRight':
        next = (this.focusIndex + 1) % buttons.length;
        break;
      case 'ArrowLeft':
        next = this.focusIndex === 0 ? buttons.length - 1 : this.focusIndex - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.focusIndex = next;
    buttons[next].focus();
  }

  protected onButtonFocus(item: InoEditorButton): void {
    this.focusIndex = item.index;
  }

  private toolbarButtons(): HTMLButtonElement[] {
    return Array.from(
      this.el.nativeElement.querySelectorAll<HTMLButtonElement>('.ino-editor__btn')
    );
  }

  @HostListener('document:selectionchange')
  protected onSelectionChange(): void {
    if (!this.hasFocus) {
      return;
    }
    this.refreshPressed();
  }

  private refreshPressed(): void {
    const block = queryBlock();
    this.pressed = {
      bold: queryState('bold'),
      italic: queryState('italic'),
      underline: queryState('underline'),
      ul: queryState('insertUnorderedList'),
      ol: queryState('insertOrderedList'),
      h2: block === 'h2',
      h3: block === 'h3',
      pre: block === 'pre',
    };
    this.cdr.markForCheck();
  }

  // ---- content ------------------------------------------------------------

  protected onFocusIn(): void {
    this.hasFocus = true;
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    this.hasFocus = !!next && this.el.nativeElement.contains(next);
  }

  protected onInput(): void {
    this.syncFromDom();
  }

  /** Char-budget gate (SPEC.md §5): deletions, history and formatting always pass; text-inserting
   *  input is blocked once the budget (net of any selection being replaced) is spent. Paste is
   *  excluded here — `onPaste` preventDefaults every paste and does its own trimming. */
  protected onBeforeInput(event: InputEvent): void {
    if (this.maxLength == null) {
      return;
    }
    const type = event.inputType;
    if (
      !type.startsWith('insert') ||
      type === 'insertParagraph' ||
      type === 'insertLineBreak' ||
      type === 'insertFromPaste'
    ) {
      return;
    }
    if (this.remainingBudget() <= 0) {
      event.preventDefault();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    if (this.disabled || this.readonly) {
      return;
    }
    const html = event.clipboardData?.getData('text/html') ?? '';
    const text = event.clipboardData?.getData('text/plain') ?? '';
    let insert = html ? sanitizeEditorHtml(html) : escapeText(text);
    if (this.maxLength != null) {
      const remaining = this.remainingBudget();
      if (remaining <= 0) {
        return;
      }
      const probe = document.createElement('div');
      probe.innerHTML = insert;
      const plain = probe.textContent ?? '';
      if (plain.length > remaining) {
        // Over budget: fall back to plain text cut at the budget — a trimmed tree is not
        // meaningfully "the formatting they pasted" anyway.
        execCommand('insertText', plain.slice(0, remaining));
        this.syncFromDom();
        return;
      }
    }
    execCommand('insertHTML', insert);
    this.syncFromDom();
  }

  /** Budget left after discounting any in-editor selection the next edit would replace. */
  private remainingBudget(): number {
    if (this.maxLength == null) {
      return Number.POSITIVE_INFINITY;
    }
    let selected = 0;
    const selection = window.getSelection();
    const content = this.contentRef?.nativeElement;
    if (
      selection &&
      !selection.isCollapsed &&
      content &&
      selection.anchorNode &&
      content.contains(selection.anchorNode)
    ) {
      selected = selection.toString().length;
    }
    return this.maxLength - (this.charCount - selected);
  }

  private syncFromDom(): void {
    const el = this.contentRef?.nativeElement;
    if (!el) {
      return;
    }
    this.refreshCount();
    const clean = sanitizeEditorHtml(el.innerHTML);
    this.currentValue = clean;
    this.lastEmitted = clean;
    this.valueChange.emit(clean);
    this.cdr.markForCheck();
  }

  private refreshCount(): void {
    const el = this.contentRef?.nativeElement;
    if (!el) {
      return;
    }
    this.charCount = (el.textContent ?? '').length;
    this.isEmpty = this.charCount === 0;
  }
}

function buildItems(preset: InoEditorPreset): InoEditorItem[] {
  const basic: Array<Omit<InoEditorButton, 'index'> | 'divider'> = [
    { id: 'bold', label: 'Bold', glyph: 'B', toggle: true },
    { id: 'italic', label: 'Italic', glyph: 'I', toggle: true },
    { id: 'underline', label: 'Underline', glyph: 'U', toggle: true },
    'divider',
    { id: 'ul', label: 'Bulleted list', glyph: '•–', toggle: true },
    { id: 'ol', label: 'Numbered list', glyph: '1.', toggle: true },
  ];
  const full: Array<Omit<InoEditorButton, 'index'> | 'divider'> = [
    ...basic,
    'divider',
    { id: 'h2', label: 'Heading 2', glyph: 'H2', toggle: true },
    { id: 'h3', label: 'Heading 3', glyph: 'H3', toggle: true },
    { id: 'pre', label: 'Code block', glyph: '</>', toggle: true },
    'divider',
    { id: 'link', label: 'Insert link', glyph: 'Link', toggle: false },
    { id: 'unlink', label: 'Remove link', glyph: 'Unlink', toggle: false },
    'divider',
    { id: 'clear', label: 'Clear formatting', glyph: 'Clear', toggle: false },
  ];
  let index = 0;
  return (preset === 'full' ? full : basic).map((item) =>
    item === 'divider' ? item : { ...item, index: index++ }
  );
}
