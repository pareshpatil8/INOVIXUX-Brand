import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * `/legal/terms` — plain content page, same typography tokens, no components.
 */
@Component({
  selector: 'app-legal-terms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal-terms.component.html',
  styleUrl: './legal-terms.component.scss',
})
export class LegalTermsComponent {}
