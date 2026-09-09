import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * `/docs` shell — the "high-fidelity dark-mode developer documentation portal" the original
 * brief named for Concept 2's register; Verified Line's monochrome-plus-one-accent system covers
 * it without needing that concept (`docs/brand/08-website-sitemap.md` §2).
 *
 * Sets `[data-density]="dense"` on the host so every docs page renders in the dense-mode register
 * (compact rows, monospace-forward), and owns the sidebar nav shared by `/docs`,
 * `/docs/getting-started`, `/docs/api-reference`, `/docs/design-system`.
 */
@Component({
  selector: 'app-docs-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './docs-layout.component.html',
  styleUrl: './docs-layout.component.scss',
  host: { '[attr.data-density]': "'dense'" },
})
export class DocsLayoutComponent {
  protected readonly navItems = [
    { label: 'Overview', href: '/docs' },
    { label: 'Getting started', href: '/docs/getting-started' },
    { label: 'API reference', href: '/docs/api-reference' },
    { label: 'Design system', href: '/docs/design-system' },
  ];
}
