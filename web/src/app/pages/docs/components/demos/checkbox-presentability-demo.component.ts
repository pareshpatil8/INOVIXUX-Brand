import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoCheckboxComponent } from '../../../../components/checkbox/ino-checkbox.component';
import {
  InoCheckboxGroupComponent,
  InoCheckboxOption,
} from '../../../../components/checkbox/ino-checkbox-group.component';
import { INO_CONTROL_SIZES } from '../../../../components/control-size';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-checkbox` / `ino-checkbox-group`
 * (INO-366, doc 26 §4 A3 — "checkbox limited implementation"). Mounted in place of the generic
 * props-driven grid on `/docs/components/checkbox` via `CUSTOM_DEMOS` (`../custom-demos.ts`) —
 * see the sibling `radio-presentability-demo.component.ts` doc comment for why the generic
 * renderer and the static `docs/brand/06-angular-components/previews/checkbox.html` gallery both
 * fall short of this.
 */
@Component({
  selector: 'app-checkbox-presentability-demo',
  standalone: true,
  imports: [CommonModule, InoCheckboxComponent, InoCheckboxGroupComponent],
  templateUrl: './checkbox-presentability-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxPresentabilityDemoComponent {
  protected readonly sizes = INO_CONTROL_SIZES;

  protected readonly notifyOptions: InoCheckboxOption[] = [
    { label: 'Product updates', value: 'product' },
    { label: 'Security alerts', value: 'security' },
    { label: 'Beta programs (disabled)', value: 'beta', disabled: true },
  ];
  protected notifyValue: string[] = ['security'];

  protected readonly termsOptions: InoCheckboxOption[] = [
    { label: 'I agree to the terms of service', value: 'terms' },
    { label: 'I agree to the privacy policy', value: 'privacy' },
  ];
  protected termsValue: string[] = [];

  protected readonly longLabelOptions: InoCheckboxOption[] = [
    {
      label:
        'Send me product updates, security notices, and occasional marketing email about new features (this label is intentionally long to exercise wrapping)',
      value: 'all',
    },
    { label: 'Security notices only', value: 'security' },
  ];
  protected longLabelValue: string[] = ['security'];

  protected readonly tableRows = [
    { id: 'row-1', name: 'Invoice 1024' },
    { id: 'row-2', name: 'Invoice 1025' },
    { id: 'row-3', name: 'Invoice 1026' },
  ];
  protected selectedRows = new Set<string>(['row-2']);

  toggleRow(id: string, checked: boolean): void {
    if (checked) {
      this.selectedRows.add(id);
    } else {
      this.selectedRows.delete(id);
    }
  }
}
