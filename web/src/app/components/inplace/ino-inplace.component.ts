import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  booleanAttribute,
} from '@angular/core';

import { InoInplaceDisplayDirective, InoInplaceEditDirective } from './ino-inplace.templates';

/** Walks `container`'s subtree for the first native-focusable descendant, falling back to
 *  `container` itself (which carries `tabindex="-1"` for exactly this case) so focus always has
 *  somewhere to land even when the consumer's edit template has no focusable control yet. */
function focusFirst(container: HTMLElement): void {
  const target = container.querySelector<HTMLElement>(
    'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])',
  );
  (target ?? container).focus();
}

/**
 * `<ino-inplace>` — a display slot that swaps for an edit slot on activation. Contract: INO-497
 * (INO-31 Phase B5, doc 26 §5 row `ino-inplace`): "display slot ↔ edit slot swap; close on
 * blur/Enter; lazy content".
 *
 * Content model: `inoInplaceDisplay` / `inoInplaceEdit` structural directives (see
 * `ino-inplace.templates.ts`), the same directive-per-slot shape `ino-dataview` uses. The edit
 * template mounts only once `editing` flips true — never instantiated up front and hidden (the
 * row's "lazy content" variant) — and unmounts again on close.
 *
 * The display slot is wrapped in a native `<button type="button">` (the row's "button semantics
 * on display" a11y line is free from this — no manual `role="button"` + keydown handling needed).
 * Activating it opens the editor and moves focus into it (first focusable descendant, or the
 * editor container itself via its `tabindex="-1"`); closing — Enter in a non-`<textarea>` field,
 * or focus leaving the editor subtree entirely (`closeOnBlur`) — returns focus to the trigger.
 * `editing` is two-way bindable for callers that need to drive it externally (e.g. a toolbar
 * "edit all" action), matching the `value`/`valueChange` banana-in-a-box convention this library
 * already uses elsewhere.
 *
 * Sizing: "inherits content" per the row — no `size` input and no `InoControlSize` dependency;
 * the component contributes no intrinsic dimensions beyond its content.
 *
 * Decisions record: `SPEC.md` in this directory.
 */
@Component({
  selector: 'ino-inplace',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-inplace.component.html',
  styleUrl: './ino-inplace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-inplace',
    '[class.ino-inplace--editing]': 'editing',
    '[class.ino-inplace--disabled]': 'disabled',
    '[class.ino-inplace--readonly]': 'readonly',
  },
})
export class InoInplaceComponent implements AfterViewChecked {
  @ContentChild(InoInplaceDisplayDirective) protected displayDef?: InoInplaceDisplayDirective;
  @ContentChild(InoInplaceEditDirective) protected editDef?: InoInplaceEditDirective;

  /** Whether the edit slot is mounted. Banana-in-a-box with `editingChange`. */
  @Input({ transform: booleanAttribute }) editing = false;
  @Output() readonly editingChange = new EventEmitter<boolean>();

  /** Accessible name for the display trigger — the row's "edit affordance labeled" requirement.
   *  Also used as the visible affordance glyph's `aria-hidden` sibling text when no `label` is
   *  otherwise obvious from the display content. */
  @Input() ariaLabel = 'Edit';

  /** Trailing glyph rendered next to the display content as a visual edit affordance, mirroring
   *  `ino-rating`'s plain-text-glyph precedent (no icon-component dependency exists yet). Set to
   *  `''` to omit it when the display content already signals editability on its own. */
  @Input() editIcon = '✎';

  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  /** Close (return to display) when focus leaves the editor subtree entirely. On by default per
   *  the row's "close on blur/Enter"; a consumer whose edit template owns its own commit/cancel
   *  buttons outside that subtree can set this false and call `close()` explicitly. */
  @Input({ transform: booleanAttribute }) closeOnBlur = true;

  @ViewChild('trigger') private readonly triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('editor') private readonly editorRef?: ElementRef<HTMLElement>;

  private pendingFocusEditor = false;
  private pendingFocusTrigger = false;

  protected open(): void {
    if (this.disabled || this.readonly || this.editing) return;
    this.editing = true;
    this.pendingFocusEditor = true;
    this.editingChange.emit(true);
  }

  protected close(): void {
    if (!this.editing) return;
    this.editing = false;
    this.pendingFocusTrigger = true;
    this.editingChange.emit(false);
  }

  /** Enter closes and returns focus to the trigger — except inside a `<textarea>`, where Enter
   *  inserts a newline instead (the same multi-line carve-out a plain "close on Enter" contract
   *  needs to not break every multi-line edit template). */
  protected onEditorKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    if ((event.target as HTMLElement).tagName === 'TEXTAREA') return;
    event.preventDefault();
    this.close();
  }

  /** Closes on blur only when focus actually leaves the editor subtree — moving focus between
   *  two fields inside a multi-field edit template must not close it mid-edit. */
  protected onEditorFocusOut(event: FocusEvent): void {
    if (!this.closeOnBlur) return;
    const next = event.relatedTarget as Node | null;
    if (next && this.editorRef?.nativeElement.contains(next)) return;
    this.close();
  }

  ngAfterViewChecked(): void {
    if (this.pendingFocusEditor && this.editorRef) {
      this.pendingFocusEditor = false;
      focusFirst(this.editorRef.nativeElement);
    }
    if (this.pendingFocusTrigger && this.triggerRef) {
      this.pendingFocusTrigger = false;
      this.triggerRef.nativeElement.focus();
    }
  }
}
