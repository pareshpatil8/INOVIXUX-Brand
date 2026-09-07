import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CountUpDirective } from '../../directives/count-up.directive';

export type InoRiskStatus = 'high' | 'medium' | 'low';

export interface InoMetricPanelRow {
  label: string;
  value: string;
  status: InoRiskStatus;
}

/**
 * `<ino-metric-panel>` — raised-surface live-data card (dashboard metrics, risk-flag rows).
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3.
 *
 * `status` is a closed RAG union, not a raw color `@Input` — resolving `status` to a token pair
 * happens entirely in this component's SCSS (`--ino-color-risk-{status}-fill` / `-on-fill`).
 * Callers cannot pass an arbitrary color, which is the point: it keeps every risk chip on the
 * WCAG-audited token pairs instead of reopening the unaudited-color-pair risk the tokens
 * README's contrast section exists to prevent.
 */
@Component({
  selector: 'ino-metric-panel',
  standalone: true,
  imports: [CommonModule, CountUpDirective],
  templateUrl: './ino-metric-panel.component.html',
  styleUrl: './ino-metric-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoMetricPanelComponent {
  @Input() label = '';
  @Input() value = 0;
  @Input() delta = '';
  @Input() rows: InoMetricPanelRow[] = [];
}
