import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoHeroComponent } from '../../../components/hero/ino-hero.component';
import { InoCardComponent } from '../../../components/card/ino-card.component';

/**
 * `/company/about` — carries the mark's canonical story verbatim from
 * `docs/brand/05-verbal-identity.md` §5, per that doc's own instruction to reuse it identically
 * on every about-page-shaped surface rather than reinventing it.
 */
@Component({
  selector: 'app-company-about',
  standalone: true,
  imports: [CommonModule, InoHeroComponent, InoCardComponent],
  templateUrl: './company-about.component.html',
  styleUrl: './company-about.component.scss',
})
export class CompanyAboutComponent {}
