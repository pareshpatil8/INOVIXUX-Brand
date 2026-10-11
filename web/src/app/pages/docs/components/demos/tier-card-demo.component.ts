import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoTierCardComponent } from '../../../../components/tier-card/ino-tier-card.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-tier-card` (INO-374, doc 26 §6 C5 —
 * marketing-only components with no docs page at all). Mounted in place of the generic
 * props-driven grid on `/docs/components/tier-card` via `CUSTOM_DEMOS` (`../custom-demos.ts`)
 * so the `highlighted` non-commercial disclaimer note actually renders — the whole reason this
 * component exists (INO-14 hold; see its class-level doc comment).
 */
@Component({
  selector: 'app-tier-card-demo',
  standalone: true,
  imports: [CommonModule, InoTierCardComponent],
  templateUrl: './tier-card-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TierCardDemoComponent {
  protected readonly standardFeatures = [
    'Single-workspace deployment',
    'Standard support SLA',
    'Up to 500 verifications / month',
  ];

  protected readonly scaleFeatures = [
    'Multi-workspace deployment',
    'Priority support SLA',
    'Unlimited verifications',
    'Dedicated risk-scoring tuning',
  ];
}
