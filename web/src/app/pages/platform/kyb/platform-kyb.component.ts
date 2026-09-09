import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoHeroComponent } from '../../../components/hero/ino-hero.component';
import { InoMetricPanelComponent, InoMetricPanelRow } from '../../../components/metric-panel/ino-metric-panel.component';
import { InoFeatureGridComponent, InoFeatureGridItem } from '../../../components/feature-grid/ino-feature-grid.component';

/**
 * `/platform/kyb` — KYB vendor underwriting deep-dive (the MVP module).
 * Reuses `ino-metric-panel` for KYB-specific stats, per the sitemap's page-to-component mapping.
 */
@Component({
  selector: 'app-platform-kyb',
  standalone: true,
  imports: [CommonModule, RouterLink, InoHeroComponent, InoMetricPanelComponent, InoFeatureGridComponent],
  templateUrl: './platform-kyb.component.html',
  styleUrl: './platform-kyb.component.scss',
})
export class PlatformKybComponent {
  protected readonly railItems: InoFeatureGridItem[] = [
    { icon: '→', title: 'UPI / ABDM', description: 'Illustrative — bank/health-ID rail reconciliation checks, shown as the rail set this module is built to reconcile against.' },
    { icon: '≡', title: 'GSTIN / MCA21', description: 'Illustrative — tax registration and corporate-filing cross-reference, not a live integration claim.' },
    { icon: '✓', title: 'Account Aggregator', description: 'Illustrative — consent-based financial data pull, framed the same way as the other rails: structural, not a shipped connection.' },
    { icon: '◧', title: 'e-KYC', description: 'Illustrative — identity verification rail, listed for completeness of the DPI alignment story.' },
  ];

  protected readonly flagsRows: InoMetricPanelRow[] = [
    { label: 'Meridian Freight — ABDM + UPI', value: 'Verified', status: 'low' },
    { label: 'Kavya Textile Exports — GSTIN mismatch', value: 'Review', status: 'medium' },
    { label: 'Orbit Cold Chain Co. — Owner gap', value: 'Escalate', status: 'high' },
  ];
}
