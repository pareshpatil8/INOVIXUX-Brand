import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoHeroComponent } from '../../components/hero/ino-hero.component';
import { InoFeatureGridComponent, InoFeatureGridItem } from '../../components/feature-grid/ino-feature-grid.component';
import { InoMetricPanelComponent, InoMetricPanelRow } from '../../components/metric-panel/ino-metric-panel.component';

/**
 * `/how-it-works` — "system surfaces evidence, human decides," the core verbal-identity claim
 * made concrete with the trace→review→resolve flow already in the hero mockup
 * (`docs/brand/08-website-sitemap.md` §1).
 */
@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [CommonModule, InoHeroComponent, InoFeatureGridComponent, InoMetricPanelComponent],
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.scss',
})
export class HowItWorksComponent {
  protected readonly stepItems: InoFeatureGridItem[] = [
    { icon: '→', title: '1. Trace', description: 'Every data point pulled from a vendor or a rail is logged as a discrete step — nothing is merged silently before a person can see it.' },
    { icon: '≡', title: '2. Review', description: 'A structured risk-flag report is handed to a human reviewer, with the underlying trace attached — not a black-box score.' },
    { icon: '✓', title: '3. Resolve', description: 'The reviewer closes the case. The Verified Line mark only resolves into a checkmark at this step, once a person has acted.' },
  ];

  protected readonly reviewRows: InoMetricPanelRow[] = [
    { label: 'R. Nair — Underwriting', value: '12 open', status: 'low' },
    { label: 'S. Iyer — Compliance', value: '7 open', status: 'medium' },
    { label: 'A. Verma — Escalations', value: '3 open', status: 'high' },
  ];
}
