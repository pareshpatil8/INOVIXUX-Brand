import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * `/legal/privacy` — plain content page, same typography tokens, no components (per
 * `docs/brand/08-website-sitemap.md` §2: "deliberately boring/legible over 'designed'").
 */
@Component({
  selector: 'app-legal-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal-privacy.component.html',
  styleUrl: './legal-privacy.component.scss',
})
export class LegalPrivacyComponent {}
