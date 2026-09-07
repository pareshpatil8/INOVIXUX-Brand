import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * `<ino-tier-card>` — deployment tier card (dense/fluid rollout tiers), NOT commercial pricing.
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3.
 *
 * INO-14 hold still applies: no commercial/validation sign-off until the KYB MVP is verified.
 * When `highlighted` is true this renders a visible "illustrative, not commercial" note —
 * carrying the v5 HTML's explicit non-commercial framing into the component instead of letting
 * it get lost in translation. Do not remove this note to make the card "look more finished";
 * that is the exact failure mode this component exists to prevent.
 */
@Component({
  selector: 'ino-tier-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-tier-card.component.html',
  styleUrl: './ino-tier-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoTierCardComponent {
  @Input() name = '';
  @Input() description = '';
  @Input() features: string[] = [];
  @Input() highlighted = false;
}
