import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';
import { InoSelectButtonOptionComponent } from './ino-select-button-option.component';

export interface InoSelectButtonOption {
  label: string;
  value: string;
  icon?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

let idSeq = 0;

/**
 * `<ino-select-button>` — segmented control for single or multiple selection, styled as a button group.
 * Implements the WAI-ARIA radiogroup pattern for single-select mode and a group of checkboxes for
 * multi-select mode. Composes `<ino-select-button-option>` per option.
 *
 * Single-select mode uses native radio buttons with radiogroup semantics. Multi-select mode uses
 * checkboxes. The component automatically switches between input types based on the `multiple` property.
 *
 * Supports variants:
 * - Single/multiple selection modes
 * - Icon-only buttons (requires ariaLabel on each option for WCAG 4.1.2)
 * - Equal-width distribution of buttons
 *
 * States (beyond the standard set):
 * - pressed (selected state in multi-select)
 * - disabled-option (per-option disable while group remains enabled)
 *
 * Contract: docs/brand/06-angular-components/select-button.md. Decisions record:
 * web/src/app/components/select-button/SPEC.md.
 */
@Component({
  selector: 'ino-select-button',
  standalone: true,
  imports: [CommonModule, InoSelectButtonOptionComponent],
  templateUrl: './ino-select-button.component.html',
  styleUrl: './ino-select-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-select-button',
    '[class.ino-select-button--sm]': "size === 'sm'",
    '[class.ino-select-button--lg]': "size === 'lg'",
    '[class.ino-select-button--icon-only]': 'iconOnly',
    '[class.ino-select-button--equal-width]': 'equalWidth',
    '[attr.role]': "multiple ? 'group' : 'radiogroup'",
    '[attr.aria-label]': 'ariaLabel',
    '[attr.aria-labelledby]': 'effectiveLabelledby',
    // INO-746: `radiogroup` supports `aria-readonly`; the `radio` role does not (the rule
    // `ino-checkbox`'s SPEC.md §4 already settled, naming `radio` as its counter-example), so in
    // single-select mode the readonly state is announced here on the group rather than per option.
    // In multi-select the host is `role="group"`, which doesn't support it either — there each
    // option's `checkbox` role carries it instead (`ino-select-button-option.component.html`).
    '[attr.aria-readonly]': '!multiple && readonly ? true : null',
  },
})
export class InoSelectButtonComponent {
  @Input() options: InoSelectButtonOption[] = [];
  @Input() value: string | string[] = '';
  @Input() name = `ino-select-button-${++idSeq}`;
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) multiple = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) iconOnly = false;
  @Input({ transform: booleanAttribute }) equalWidth = false;
  @Input() groupLabel = '';
  @Input() ariaLabel = '';
  @Input() ariaLabelledby = '';

  readonly groupLabelId = `ino-select-button-label-${idSeq}`;

  @Output() valueChange = new EventEmitter<string | string[]>();

  get effectiveLabelledby(): string {
    if (this.ariaLabelledby) return this.ariaLabelledby;
    if (this.groupLabel) return this.groupLabelId;
    return '';
  }

  get inputType(): 'radio' | 'checkbox' {
    return this.multiple ? 'checkbox' : 'radio';
  }

  isSelected(optionValue: string): boolean {
    if (this.multiple) {
      return Array.isArray(this.value) && this.value.includes(optionValue);
    }
    return this.value === optionValue;
  }

  onOptionChange(optionValue: string, selected: boolean): void {
    if (this.multiple) {
      let newValue: string[] = Array.isArray(this.value) ? [...this.value] : [];
      if (selected) {
        if (!newValue.includes(optionValue)) {
          newValue.push(optionValue);
        }
      } else {
        newValue = newValue.filter(v => v !== optionValue);
      }
      this.value = newValue;
      this.valueChange.emit(newValue);
    } else {
      if (selected) {
        this.value = optionValue;
        this.valueChange.emit(optionValue);
      }
    }
  }
}
