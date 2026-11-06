import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoRatingComponent } from '../../../../components/rating/ino-rating.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-rating`. The generic `@Input`-driven
 * renderer can't exercise this component: its `size` input is a type-alias union the generic
 * renderer's `STATE_INPUT_NAMES` sizing axis doesn't pick up (the known type-alias-`size` gap —
 * see `custom-demos.ts`'s head comment), and the §5 row's signature behaviors — hover-preview,
 * cancelable click-to-clear, Arrow-key selection-follows-focus — are interaction-driven. Mounted
 * via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-rating-demo',
  standalone: true,
  imports: [CommonModule, InoRatingComponent],
  templateUrl: './rating-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingDemoComponent {
  // Variants — star count and custom icons
  protected basicValue = 3;
  protected tenStarValue = 7;
  protected heartValue = 2;
  protected cancelableValue = 4;

  // States
  protected defaultValue = 3;
  protected disabledValue = 2;
  protected readonlyValue = 4;
  protected requiredValue = 1;
  protected invalidValue = 0;
  protected unratedValue = 0;

  // Sizing — sm / md / lg
  protected smValue = 3;
  protected mdValue = 3;
  protected lgValue = 3;

  // Density
  protected denseValue = 3;
  protected fluidValue = 3;

  // Labels
  protected labelledValue = 4;
  protected hintValue = 2;
  protected ariaOnlyValue = 5;

  // RTL
  protected rtlValue = 3;
}
