import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoHeroComponent } from '../../components/hero/ino-hero.component';
import { InoFeatureGridComponent, InoFeatureGridItem } from '../../components/feature-grid/ino-feature-grid.component';
import { InoMetricPanelComponent, InoMetricPanelRow } from '../../components/metric-panel/ino-metric-panel.component';
import { InoTierCardComponent } from '../../components/tier-card/ino-tier-card.component';
import { InoCardComponent } from '../../components/card/ino-card.component';

/**
 * `/` (Home) — the same v5 anatomy the design-system showcase always rendered
 * (nav→hero→features→cards→tiers→footer, per `docs/brand/08-website-sitemap.md` §2), now living
 * as a routed page instead of the entire `App` component. Nav/footer moved up to the shell
 * (`app.ts`/`app.html`) since every route shares them.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    InoHeroComponent,
    InoFeatureGridComponent,
    InoMetricPanelComponent,
    InoTierCardComponent,
    InoCardComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly featureItems: InoFeatureGridItem[] = [
    { icon: '→', title: 'One master line', description: 'Every mark in the system is the same stroke, cropped differently — never a redrawn logo.' },
    { icon: '✓', title: 'Resolved, not decided', description: 'The accent color appears only once a human reviewer has closed the loop.' },
    { icon: '≡', title: 'Dense-mode ready', description: 'The trace motif compresses into a status column for high-density RAG risk tables.' },
    { icon: '◧', title: 'Fluid-mode ready', description: 'The same tokens relax into a whitespace-first B2C layout for consumer surfaces.' },
  ];

  protected readonly flagsRows: InoMetricPanelRow[] = [
    { label: 'Meridian Freight — ABDM + UPI', value: 'Verified', status: 'low' },
    { label: 'Kavya Textile Exports — GSTIN mismatch', value: 'Review', status: 'medium' },
    { label: 'Orbit Cold Chain Co. — Owner gap', value: 'Escalate', status: 'high' },
  ];

  protected readonly reviewRows: InoMetricPanelRow[] = [
    { label: 'R. Nair — Underwriting', value: '12 open', status: 'low' },
    { label: 'S. Iyer — Compliance', value: '7 open', status: 'medium' },
    { label: 'A. Verma — Escalations', value: '3 open', status: 'high' },
  ];
}
