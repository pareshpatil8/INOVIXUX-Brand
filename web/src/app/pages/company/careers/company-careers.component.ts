import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoHeroComponent } from '../../../components/hero/ino-hero.component';
import { InoCardComponent } from '../../../components/card/ino-card.component';

/**
 * `/company/careers` — honest empty state, not a fabricated job board. No openings are invented
 * to make the page look more finished (same discipline as the INO-14 hold elsewhere on the site).
 */
@Component({
  selector: 'app-company-careers',
  standalone: true,
  imports: [CommonModule, RouterLink, InoHeroComponent, InoCardComponent],
  templateUrl: './company-careers.component.html',
  styleUrl: './company-careers.component.scss',
})
export class CompanyCareersComponent {}
