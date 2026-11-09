import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, ViewChild, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-accordion-tab>` — individual collapsible panel within an `<ino-accordion>`. Not intended
 * for standalone use outside an accordion container. Follows WAI-ARIA APG accordion pattern: a
 * heading element wrapping a `<button>` with `aria-expanded` + `aria-controls`.
 *
 * `header` is the tab label (required, rendered as the button text). `disabled` locks this
 * specific tab's toggle (independent of the parent accordion's global `disabled`).
 *
 * `expanded` is the open/closed state; emits `expandedChange` on toggle. In single-expand mode,
 * the parent accordion closes other tabs when this one opens. In multiple-expand mode, tabs
 * operate independently.
 *
 * `headingLevel` (1-6, default 3) controls the semantic heading rank (`<h3>` by default). Set
 * explicitly when nesting accordions or when the document outline requires a different level.
 *
 * The parent accordion coordinates icon position, size, and focus management (Arrow keys). This
 * component handles only its own expand/collapse logic and the heading+button shell.
 */
@Component({
  selector: 'ino-accordion-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-accordion-tab.component.html',
  styleUrl: './ino-accordion-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ino-accordion-tab',
    '[class.ino-accordion-tab--expanded]': 'expanded',
    '[class.ino-accordion-tab--disabled]': 'disabled || accordion?.disabled',
  },
})
export class InoAccordionTabComponent {
  @Input() header = '';
  @Input({ transform: booleanAttribute }) expanded = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() headingLevel: 1 | 2 | 3 | 4 | 5 | 6 = 3;

  @Output() expandedChange = new EventEmitter<boolean>();

  @ViewChild('headerButton', { read: ElementRef }) headerButton?: ElementRef<HTMLButtonElement>;

  // Parent accordion reference, set by the accordion in ngAfterContentInit
  accordion: any;
  iconPosition: 'start' | 'end' = 'start';
  size: 'compact' | 'comfortable' = 'comfortable';

  protected readonly contentId = `ino-accordion-content-${++idCounter}`;
  protected readonly headerId = `ino-accordion-header-${idCounter}`;

  constructor(private cdr: ChangeDetectorRef) {}

  get headingTag(): string {
    return `h${this.headingLevel}`;
  }

  get isDisabled(): boolean {
    return this.disabled || this.accordion?.disabled;
  }

  toggle(): void {
    if (this.isDisabled) {
      return;
    }
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  expand(): void {
    if (this.isDisabled || this.expanded) {
      return;
    }
    this.expanded = true;
    this.expandedChange.emit(true);
    this.accordion?.onTabOpen(this);
    this.cdr.markForCheck();
  }

  collapse(): void {
    if (!this.expanded) {
      return;
    }
    this.expanded = false;
    this.expandedChange.emit(false);
    this.cdr.markForCheck();
  }

  focusHeader(): void {
    this.headerButton?.nativeElement.focus();
  }

  /**
   * Keyboard handler for APG accordion pattern: Arrow keys, Home/End.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (!this.accordion) {
      return;
    }

    const index = this.accordion.getTabIndex(this);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.accordion.focusTab(index, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.accordion.focusTab(index, -1);
        break;
      case 'Home':
        event.preventDefault();
        this.accordion.focusFirstTab();
        break;
      case 'End':
        event.preventDefault();
        this.accordion.focusLastTab();
        break;
    }
  }
}
