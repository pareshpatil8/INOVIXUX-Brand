import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';

let idCounter = 0;

/**
 * `<ino-select-button-option>` — a single button within a select-button group. Can operate as either
 * a radio button (single-select mode) or a toggle button (multi-select mode) depending on the parent
 * group's configuration. Styled as a segmented control button with accent fill when selected.
 *
 * In single-select mode, uses native `<input type="radio">` for radiogroup semantics. In multi-select
 * mode, uses `<input type="checkbox">` for independent toggle semantics. The parent
 * `<ino-select-button>` determines the mode and manages selection state.
 *
 * Contract: docs/brand/06-angular-components/select-button.md. Decisions record:
 * web/src/app/components/select-button/SPEC.md.
 */
@Component({
  selector: 'ino-select-button-option',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-select-button-option.component.html',
  styleUrl: './ino-select-button-option.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoSelectButtonOptionComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() icon = '';
  @Input() name = `ino-select-button-option-${++idCounter}`;
  @Input() type: 'radio' | 'checkbox' = 'radio';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) selected = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) iconOnly = false;

  @Output() selectedChange = new EventEmitter<{ value: string; selected: boolean }>();

  protected readonly controlId = `ino-select-button-option-${idCounter}-input`;

  /** readonly blocks the native selection outright. Space/click-triggered activation fires a native
   *  `click` event, so intercepting `click` alone covers mouse and keyboard. */
  onClick(event: Event): void {
    if (this.readonly) {
      event.preventDefault();
    }
  }

  onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.checked;
    this.selected = selected;
    this.selectedChange.emit({ value: this.value, selected });
  }
}
