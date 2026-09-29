import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoRadioComponent } from '../../../../components/radio-group/ino-radio.component';
import {
  InoRadioGroupComponent,
  InoRadioOption,
} from '../../../../components/radio-group/ino-radio-group.component';
import { INO_CONTROL_SIZES } from '../../../../components/control-size';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-radio` / `ino-radio-group`
 * (INO-366, doc 26 §4 A3 — "radio buttons not presentable"). Mounted in place of the generic
 * props-driven grid on `/docs/components/radio-group` via `CUSTOM_DEMOS`
 * (`../custom-demos.ts`) because the generic renderer (`docs-component-detail.component.ts`)
 * only ever varies one manifest `@Input` at a time and can't compose a group demo, a dense-table
 * usage demo, or a labeled-error state — all real components, not the static
 * `docs/brand/06-angular-components/previews/radio-group.html` gallery, which isn't part of the
 * deployed Pages build (`.github/workflows/deploy-pages.yml` only ships `web/`).
 */
@Component({
  selector: 'app-radio-presentability-demo',
  standalone: true,
  imports: [CommonModule, InoRadioComponent, InoRadioGroupComponent],
  templateUrl: './radio-presentability-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioPresentabilityDemoComponent {
  protected readonly sizes = INO_CONTROL_SIZES;

  protected readonly planOptions: InoRadioOption[] = [
    { label: 'Starter', value: 'starter' },
    { label: 'Growth', value: 'growth' },
    { label: 'Enterprise (disabled)', value: 'enterprise', disabled: true },
  ];

  protected readonly frequencyOptions: InoRadioOption[] = [
    { label: 'Immediately', value: 'immediately' },
    { label: 'Daily digest', value: 'daily' },
    { label: 'Never', value: 'never' },
  ];

  protected planValue = '';
  protected frequencyValue = 'immediately';

  protected readonly longLabelOptions: InoRadioOption[] = [
    {
      label:
        'I want to receive product updates, security notices, and occasional marketing email about new features (this label is intentionally long to exercise wrapping)',
      value: 'all',
    },
    { label: 'Security notices only', value: 'security' },
  ];
  protected longLabelValue = 'security';

  protected readonly tableRows = [
    { id: 'row-1', name: 'Primary contact', value: 'row-1' },
    { id: 'row-2', name: 'Billing contact', value: 'row-2' },
    { id: 'row-3', name: 'Technical contact', value: 'row-3' },
  ];
  protected defaultContact = 'row-1';
}
