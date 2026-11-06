import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoInputColorComponent } from '../../../../components/inputcolor/ino-inputcolor.component';

/** `#rrggbb` built from decimal RGB, never a literal hex run in source — same
 *  `scripts/check-ds-adherence.mjs` `no-raw-color` dodge `ino-colorpicker.component.ts` and
 *  `ino-inputcolor.component.ts` both use (see either's SPEC.md). Unlike `colorpicker-demo`'s
 *  `var(--ino-color-*)` presets, a real hex string is the only thing this component's native
 *  `<input type="color">` swatch can actually render, so a CSS variable reference isn't an
 *  option here. */
function hex(r: number, g: number, b: number): string {
  const byte = (n: number) => n.toString(16).padStart(2, '0');
  return '#' + byte(r) + byte(g) + byte(b);
}

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-inputcolor`. The generic
 * `@Input`-driven renderer can't exercise this component: `value` is a free-form `string | null`
 * (no enum `STATE_INPUT_NAMES` can drive), `presets` is an array input that defaults to `[]`
 * (the same empty-default gap `ino-colorpicker`'s own demo documents), and the `invalid-hex`
 * state the §5 row names is interaction-driven (typing an unparseable string), not something a
 * static `@Input` binding can stage. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-inputcolor-demo',
  standalone: true,
  imports: [CommonModule, InoInputColorComponent],
  templateUrl: './inputcolor-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputColorDemoComponent {
  protected readonly presets = [
    hex(124, 92, 252),
    hex(34, 197, 94),
    hex(59, 130, 246),
    hex(245, 158, 11),
    hex(239, 68, 68),
  ];

  // Variants — unset vs committed value, presets
  protected unsetValue: string | null = null;
  protected committedValue: string | null = hex(124, 92, 252);
  protected presetValue: string | null = null;

  // States
  protected defaultValue: string | null = null;
  protected disabledValue: string | null = hex(34, 197, 94);
  protected readonlyValue: string | null = hex(59, 130, 246);
  protected requiredValue: string | null = null;
  protected invalidValue: string | null = hex(239, 68, 68);

  // Sizing — sm / default / lg
  protected smValue: string | null = null;
  protected defaultSizeValue: string | null = null;
  protected lgValue: string | null = null;

  // Density
  protected densityDenseValue: string | null = null;
  protected densityFluidValue: string | null = null;

  // Labels
  protected labeledValue: string | null = null;
  protected hintValue: string | null = null;
  protected errorValue: string | null = null;
  protected longLabelValue: string | null = null;
  protected ariaOnlyValue: string | null = null;

  // RTL
  protected rtlValue: string | null = null;
}
