import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoHeroComponent } from '../../components/hero/ino-hero.component';
import { InoFeatureGridComponent, InoFeatureGridItem } from '../../components/feature-grid/ino-feature-grid.component';
import { InoCardComponent } from '../../components/card/ino-card.component';

/**
 * `/platform` — what the system does, KYB module framed as the first module.
 * Per `docs/brand/08-website-sitemap.md` §2: reuses `ino-feature-grid`, re-themed per section,
 * no new components.
 */
@Component({
  selector: 'app-platform',
  standalone: true,
  imports: [CommonModule, RouterLink, InoHeroComponent, InoFeatureGridComponent, InoCardComponent],
  templateUrl: './platform.component.html',
  styleUrl: './platform.component.scss',
})
export class PlatformComponent {
  protected readonly moduleItems: InoFeatureGridItem[] = [
    { icon: '→', title: 'Trace', description: 'Every vendor data point — GSTIN, UPI handle, ABDM record, MCA21 filing — is pulled and logged as a step, not silently merged.' },
    { icon: '≡', title: 'Structure', description: 'Raw fields resolve into a single risk-flag report per vendor: what was checked, what state it is in, nothing inferred beyond that.' },
    { icon: '✓', title: 'Review', description: 'A human underwriter reads the trace and closes the case. The system never marks a vendor verified on its own.' },
    { icon: '◧', title: 'Resolve', description: 'Once closed, the trace becomes the audit record — the same evidence a regulator or auditor would need to see.' },
  ];
}
