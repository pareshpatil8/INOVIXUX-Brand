import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoNavComponent, InoNavLink } from './components/nav/ino-nav.component';
import { InoHeroComponent } from './components/hero/ino-hero.component';
import { InoFeatureGridComponent, InoFeatureGridItem } from './components/feature-grid/ino-feature-grid.component';
import { InoMetricPanelComponent, InoMetricPanelRow } from './components/metric-panel/ino-metric-panel.component';
import { InoTierCardComponent } from './components/tier-card/ino-tier-card.component';
import { InoFooterComponent, InoFooterColumn } from './components/footer/ino-footer.component';

/**
 * Root shell for the INOVIXUX brand/design-system showcase app.
 *
 * This is the "Verified Line" design system (docs/brand/00-INDEX.md §1) actually wired up and
 * running in Angular — not just component source sitting under docs/. It composes the same six
 * standalone components documented in docs/brand/06-angular-components/, driven entirely by the
 * token contract in src/tokens.css. `ng build` on this workspace is the proof the design system
 * compiles as real Angular, not just HTML mockups.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    InoNavComponent,
    InoHeroComponent,
    InoFeatureGridComponent,
    InoMetricPanelComponent,
    InoTierCardComponent,
    InoFooterComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly navLinks: InoNavLink[] = [
    { label: 'Platform', href: '#features' },
    { label: 'KYB Underwriting', href: '#metrics' },
    { label: 'Deployment', href: '#tiers' },
  ];

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

  protected readonly footerColumns: InoFooterColumn[] = [
    { heading: 'Platform', links: [{ label: 'Underwriting', href: '#' }, { label: 'Risk flags', href: '#' }, { label: 'Reviewer queue', href: '#' }] },
    { heading: 'Docs', links: [{ label: 'Governance model', href: '#' }, { label: 'API reference', href: '#' }, { label: 'Design system', href: '#' }] },
    { heading: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Careers', href: '#' }, { label: 'Contact', href: '#' }] },
    { heading: 'Legal', links: [{ label: 'Privacy', href: '#' }, { label: 'Security', href: '#' }, { label: 'DPI compliance', href: '#' }] },
  ];

  protected onCta(): void {
    // Placeholder — no live backend wired yet (KYB integration is paused per 2026-09-07 directive).
  }
}
