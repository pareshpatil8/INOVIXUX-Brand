import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoInputMaskComponent } from '../../../../components/inputmask/ino-inputmask.component';
import { INO_CONTROL_SIZES } from '../../../../components/control-size';
import { INO_INPUTMASK_PRESETS, InoInputMaskPreset } from '../../../../components/inputmask/mask-presets';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-inputmask` (INO-405 QA rejection —
 * the generic `@Input`-driven renderer can't demo this component at all: `preset`/`size` are
 * string-union type aliases the manifest generator doesn't resolve to enum `values`, so the
 * generic grid falls through to a single mask-less "default" box with every slot empty, no size
 * axis, and no way to show `invalid`/`incomplete` since `error` is a string input and `incomplete`
 * is derived, not settable). Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-inputmask-demo',
  standalone: true,
  imports: [CommonModule, InoInputMaskComponent],
  templateUrl: './inputmask-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputMaskDemoComponent {
  protected readonly sizes = INO_CONTROL_SIZES;
  protected readonly presets: InoInputMaskPreset[] = ['pan', 'gstin', 'ifsc', 'phone', 'date'];
  protected readonly presetDefs = INO_INPUTMASK_PRESETS;

  // Variants — India-stack presets, prefilled with their documented example value.
  protected panValue = 'ABCDE1234F';
  protected gstinValue = '22ABCDE1234F1Z5';
  protected ifscValue = 'HDFC0001234';
  protected phoneValue = '9876543210';
  protected dateValue = '31012026';
  protected customMaskValue = '';

  // States
  protected disabledValue = 'ABCDE1234F';
  protected readonlyValue = 'HDFC0001234';
  protected invalidValue = 'ABCDE1234X';
  protected loadingValue = '98765';
  // Partial fill: `incomplete` is derived true once any slot is filled but the mask isn't complete.
  protected incompleteValue = 'ABC';

  // Sizing
  protected smallValue = '9876543210';
  protected defaultSizeValue = '9876543210';
  protected largeValue = '9876543210';

  // Labels
  protected labeledValue = '';
  protected hintValue = '';
  protected errorValue = 'ABCDE1234X';
  protected longLabelValue = '';
  protected rtlValue = '';
}
