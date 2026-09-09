import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * `/docs` — docs portal landing page. Dense-mode register (inherited from `DocsLayoutComponent`
 * host attribute).
 */
@Component({
  selector: 'app-docs-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './docs-overview.component.html',
  styleUrl: './docs-overview.component.scss',
})
export class DocsOverviewComponent {}
