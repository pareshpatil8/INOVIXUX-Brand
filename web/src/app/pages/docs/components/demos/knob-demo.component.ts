import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoKnobComponent } from '../../../../components/knob/ino-knob.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-knob`. The generic `@Input`-driven
 * renderer can't exercise this component: its `size` input is a type-alias union the generic
 * renderer's `STATE_INPUT_NAMES` sizing axis doesn't pick up (the known type-alias-`size` gap —
 * see `custom-demos.ts`'s head comment), it never binds `valueTemplate`, and the drag /
 * at-bounds states the §5 row names are interaction-driven. Mounted via `CUSTOM_DEMOS`
 * (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-knob-demo',
  standalone: true,
  imports: [CommonModule, InoKnobComponent],
  templateUrl: './knob-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnobDemoComponent {
  // Variants — value display and format
  protected basicValue = 60;
  protected percentValue = 75;
  protected decibelValue = -12;
  protected hiddenLabelValue = 40;

  // Variants — min/max/step
  protected steppedValue = 6;

  // States
  protected defaultValue = 50;
  protected disabledValue = 35;
  protected readonlyValue = 65;
  protected requiredValue = 20;
  protected invalidValue = 50;
  protected atMinValue = 0;
  protected atMaxValue = 100;

  // Sizing — dial sm / md / lg
  protected smValue = 30;
  protected mdValue = 50;
  protected lgValue = 70;

  // Density
  protected denseValue = 45;
  protected fluidValue = 45;

  // Labels
  protected labelledValue = 55;
  protected hintValue = 25;
  protected ariaOnlyValue = 80;

  // RTL
  protected rtlValue = 70;
}
