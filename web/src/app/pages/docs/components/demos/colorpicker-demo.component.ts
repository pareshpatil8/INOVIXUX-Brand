import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoColorPickerComponent } from '../../../../components/colorpicker/ino-colorpicker.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-colorpicker`. The generic
 * `@Input`-driven renderer can't exercise this component at all: it has no enum-valued input
 * `STATE_INPUT_NAMES` would pick up correctly (`value` is a free-form `string | null`, not a
 * fixed union), it never binds `presets`, and it can't demonstrate the inline/popover structural
 * variant or the drag/keyboard interaction the §2 contract's "States" row needs recorded.
 * Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * `presets` below are `var(--ino-color-*)` CSS variable references, not hex literals — doubles
 * as the realistic use case doc 26 §5 names for this component ("theming/admin surfaces"):
 * picking from the brand's own role palette rather than an arbitrary swatch list. A CSS custom
 * property reference resolves correctly wherever it's assigned to a real property
 * (`[style.background]`, here), so this needs no runtime token lookup. It also keeps this file
 * free of raw colour literals — `scripts/check-ds-adherence.mjs`'s `no-raw-color` scan would
 * otherwise flag a hardcoded preset palette the same way it flags one in the component itself
 * (see `ino-colorpicker.component.ts`'s class doc comment §8 / SPEC.md §8).
 */
@Component({
  selector: 'app-colorpicker-demo',
  standalone: true,
  imports: [CommonModule, InoColorPickerComponent],
  templateUrl: './colorpicker-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorpickerDemoComponent {
  protected readonly presets = [
    'var(--ino-color-accent)',
    'var(--ino-color-success)',
    'var(--ino-color-info)',
    'var(--ino-color-warning)',
    'var(--ino-color-danger)',
  ];

  // Variants — popover (default) vs inline
  protected popoverValue: string | null = null;
  protected inlineValue: string | null = null;

  // Variants — hex/rgb input + presets
  protected presetValue: string | null = null;
  protected noAlphaValue: string | null = null;

  // States
  protected defaultValue: string | null = null;
  protected disabledValue: string | null = null;
  protected readonlyValue: string | null = null;
  protected requiredValue: string | null = null;
  protected invalidValue: string | null = null;

  // Sizing — swatch sm / md
  protected smallSwatchValue: string | null = null;
  protected mediumSwatchValue: string | null = null;

  // Density
  protected densityDenseValue: string | null = null;
  protected densityFluidValue: string | null = null;

  // Labels
  protected labeledValue: string | null = null;
  protected hintValue: string | null = null;
  protected errorValue: string | null = null;
  protected longLabelValue: string | null = null;
  protected rtlValue: string | null = null;
}
