import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';

import { InoNavComponent, InoNavLink } from './components/nav/ino-nav.component';
import { InoFooterComponent, InoFooterColumn } from './components/footer/ino-footer.component';

/**
 * Root shell for the INOVIXUX marketing/docs site.
 *
 * As of INO-84 this is a real routed app, not a single long page: `App` owns only the
 * persistent chrome (nav + footer, per the sitemap's page-to-component mapping in
 * `docs/brand/08-website-sitemap.md` §2) and renders every route named in that sitemap through
 * `<router-outlet>`. The homepage anatomy (hero→features→cards→tiers) moved into
 * `pages/home/home.component.ts` unchanged.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, InoNavComponent, InoFooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly navLinks: InoNavLink[] = [
    { label: 'Platform', href: '/platform' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Trust & Governance', href: '/trust-and-governance' },
    { label: 'Docs', href: '/docs' },
    { label: 'Company', href: '/company/about' },
    { label: 'Contact', href: '/contact' },
  ];

  protected readonly footerColumns: InoFooterColumn[] = [
    {
      heading: 'Platform',
      links: [
        { label: 'Overview', href: '/platform' },
        { label: 'KYB underwriting', href: '/platform/kyb' },
        { label: 'How it works', href: '/how-it-works' },
      ],
    },
    {
      heading: 'Docs',
      links: [
        { label: 'Getting started', href: '/docs/getting-started' },
        { label: 'API reference', href: '/docs/api-reference' },
        { label: 'Design system', href: '/docs/design-system' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', href: '/company/about' },
        { label: 'Careers', href: '/company/careers' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy', href: '/legal/privacy' },
        { label: 'Terms', href: '/legal/terms' },
        { label: 'Disclosures', href: '/legal/disclosures' },
      ],
    },
  ];

  protected onCta(): void {
    // Placeholder — no live backend wired yet (KYB integration is paused per 2026-09-07 directive).
  }
}
