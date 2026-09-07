import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * `<ino-hero>` — page-top hero shell (eyebrow + headline + lead + projected content).
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3.
 *
 * Content projection keeps the live dashboard/risk-trace markup out of this shell component —
 * the hero shouldn't know about risk-table internals, per the contract's explicit boundary.
 */
@Component({
  selector: 'ino-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-hero.component.html',
  styleUrl: './ino-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoHeroComponent {
  @Input() eyebrow = '';
  @Input() headline = '';
  @Input() lead = '';
}
