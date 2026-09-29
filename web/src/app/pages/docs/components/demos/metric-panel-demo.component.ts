import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoMetricPanelComponent, InoMetricPanelRow } from '../../../../components/metric-panel/ino-metric-panel.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-metric-panel` (INO-374, doc 26 §6
 * C5 — marketing-only components with no docs page at all). Mounted in place of the generic
 * props-driven grid on `/docs/components/metric-panel` via `CUSTOM_DEMOS`
 * (`../custom-demos.ts`) so the `status` RAG union (high/medium/low) and the count-up value
 * animation are actually exercised, not left at their `[]`/`0` defaults.
 */
@Component({
  selector: 'app-metric-panel-demo',
  standalone: true,
  imports: [CommonModule, InoMetricPanelComponent],
  templateUrl: './metric-panel-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricPanelDemoComponent {
  protected readonly riskRows: InoMetricPanelRow[] = [
    { label: 'Documents flagged', value: '12', status: 'high' },
    { label: 'Sanctions matches pending review', value: '3', status: 'medium' },
    { label: 'Verified applicants', value: '284', status: 'low' },
  ];
}
