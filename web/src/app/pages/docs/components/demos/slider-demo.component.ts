import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoSliderComponent } from '../../../../components/slider/ino-slider.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-slider` (INO-409 QA rejection —
 * the generic `@Input`-driven renderer only demos the one enum-valued input (`trackSize`) plus
 * the boolean names in `STATE_INPUT_NAMES`; it never sets `value`/`min`/`max`, so
 * `defaultValueFor()` passes `null` through `numberAttribute` to `NaN`, breaking every thumb's
 * `aria-valuemin`/`aria-valuemax`/`aria-valuenow`. It also never exercises `range`, `vertical`,
 * `showMarks`, `showTooltip`, `showMinMaxLabels`, `showValueLabel`, or the string-typed `error`
 * input, since `STATE_INPUT_NAMES` only auto-picks boolean inputs. Mounted via `CUSTOM_DEMOS`
 * (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-slider-demo',
  standalone: true,
  imports: [CommonModule, InoSliderComponent],
  templateUrl: './slider-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderDemoComponent {
  // Variants — single value
  protected basicValue = 40;
  protected verticalValue = 60;
  protected marksValue = 30;
  protected tooltipValue = 70;
  protected minMaxLabelsValue = 50;
  protected valueLabelValue = 20;

  // Variants — range
  protected rangeValue: [number, number] = [25, 75];
  protected rangeVerticalValue: [number, number] = [20, 80];

  // States
  protected defaultValue = 50;
  protected disabledValue = 35;
  protected readonlyValue = 65;
  protected requiredValue = 10;
  protected invalidValue = 90;
  protected atMinValue = 0;
  protected atMaxValue = 100;

  // Sizing — track thickness (sm / md, the documented 2-rung scale)
  protected smallTrackValue = 30;
  protected mediumTrackValue = 30;

  // Labels
  protected labeledValue = 45;
  protected hintValue = 55;
  protected errorValue = 90;
  protected longLabelValue = 15;
  protected rtlValue = 40;
}
