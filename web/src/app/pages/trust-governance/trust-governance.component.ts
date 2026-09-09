import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoHeroComponent } from '../../components/hero/ino-hero.component';
import { InoCardComponent } from '../../components/card/ino-card.component';

/**
 * `/trust-and-governance` — DPI alignment (UPI/ABDM/GSTIN/MCA21/AA/e-KYC rails), the INO-14
 * non-commercial hold stated plainly, WCAG 2.2 statement, security/compliance posture.
 *
 * Uses `[data-density]="fluid"` on the host (per `docs/brand/08-website-sitemap.md` §2: "fluid
 * density layout — whitespace-forward, not the dense risk-table mode").
 */
@Component({
  selector: 'app-trust-governance',
  standalone: true,
  imports: [CommonModule, RouterLink, InoHeroComponent, InoCardComponent],
  templateUrl: './trust-governance.component.html',
  styleUrl: './trust-governance.component.scss',
  host: { '[attr.data-density]': "'fluid'" },
})
export class TrustGovernanceComponent {
  protected readonly rails = [
    'UPI', 'ABDM', 'GSTIN', 'MCA21', 'Account Aggregator', 'e-KYC',
  ];
}
