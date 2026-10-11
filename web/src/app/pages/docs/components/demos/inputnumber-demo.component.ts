import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoInputNumberComponent } from '../../../../components/inputnumber/ino-inputnumber.component';
import { INO_CONTROL_SIZES } from '../../../../components/control-size';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-inputnumber` (INO-517, fixing INO-402
 * QA gaps). Mounted in place of the generic props-driven grid on `/docs/components/inputnumber` via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) — the generic renderer's `defaultValueFor()` passes `null`
 * to numeric `@Input`s which `numberAttribute(null)` transforms to `NaN`, breaking every keyboard
 * guard. This demo sets real `min`/`max` values so keyboard interaction (Up/Down/PageUp/PageDown/
 * Home/End) works correctly and can be verified in QA.
 */
@Component({
  selector: 'app-inputnumber-demo',
  standalone: true,
  imports: [CommonModule, InoInputNumberComponent],
  templateUrl: './inputnumber-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputNumberDemoComponent {
  protected readonly sizes = INO_CONTROL_SIZES;

  // Basic examples
  protected basicValue: number | null = 42;
  protected filledValue: number | null = 100;
  protected noButtonsValue: number | null = 25;

  // Prefix/suffix examples
  protected weightValue: number | null = 75;
  protected durationValue: number | null = 30;

  // Mode examples
  protected currencyValue: number | null = 1234.56;
  protected percentValue: number | null = 0.125; // 12.5%
  protected decimalValue: number | null = 9876.543;

  // State examples
  protected disabledValue: number | null = 50;
  protected readonlyValue: number | null = 99;
  protected invalidValue: number | null = -5;
  protected atMinValue: number | null = 0;
  protected atMaxValue: number | null = 100;

  // Sizing examples
  protected smallValue: number | null = 10;
  protected defaultValue: number | null = 20;
  protected largeValue: number | null = 30;

  // Labels examples
  protected labeledValue: number | null = null;
  protected hintValue: number | null = 5;
  protected errorValue: number | null = 150;
  protected longLabelValue: number | null = 10;
}
