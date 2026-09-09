import { Routes } from '@angular/router';

/**
 * Route table for the marketing/docs site, built directly from the approved IA in
 * `docs/brand/08-website-sitemap.md` §1 (INO-84). Every page is lazy-loaded via
 * `loadComponent` — each route component is standalone.
 *
 * Scope boundary (per the sitemap §3 and `00-INDEX.md` §5): this is the marketing/docs surface
 * only. No KYB product screens (dashboard, reviewer queues) live behind any route here — that
 * codebase is separate and explicitly paused.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'INOVIXUX — Verified Line',
  },
  {
    path: 'platform',
    loadComponent: () =>
      import('./pages/platform/platform.component').then((m) => m.PlatformComponent),
    title: 'Platform — INOVIXUX',
  },
  {
    path: 'platform/kyb',
    loadComponent: () =>
      import('./pages/platform/kyb/platform-kyb.component').then((m) => m.PlatformKybComponent),
    title: 'KYB Underwriting — INOVIXUX',
  },
  {
    path: 'how-it-works',
    loadComponent: () =>
      import('./pages/how-it-works/how-it-works.component').then((m) => m.HowItWorksComponent),
    title: 'How it works — INOVIXUX',
  },
  {
    path: 'trust-and-governance',
    loadComponent: () =>
      import('./pages/trust-governance/trust-governance.component').then(
        (m) => m.TrustGovernanceComponent,
      ),
    title: 'Trust & Governance — INOVIXUX',
  },
  {
    path: 'docs',
    loadComponent: () =>
      import('./pages/docs/docs-layout.component').then((m) => m.DocsLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/docs/overview/docs-overview.component').then(
            (m) => m.DocsOverviewComponent,
          ),
        title: 'Docs — INOVIXUX',
      },
      {
        path: 'getting-started',
        loadComponent: () =>
          import('./pages/docs/getting-started/docs-getting-started.component').then(
            (m) => m.DocsGettingStartedComponent,
          ),
        title: 'Getting started — INOVIXUX Docs',
      },
      {
        path: 'api-reference',
        loadComponent: () =>
          import('./pages/docs/api-reference/docs-api-reference.component').then(
            (m) => m.DocsApiReferenceComponent,
          ),
        title: 'API reference — INOVIXUX Docs',
      },
      {
        path: 'design-system',
        loadComponent: () =>
          import('./pages/docs/design-system/docs-design-system.component').then(
            (m) => m.DocsDesignSystemComponent,
          ),
        title: 'Design system — INOVIXUX Docs',
      },
    ],
  },
  {
    path: 'company',
    redirectTo: 'company/about',
    pathMatch: 'full',
  },
  {
    path: 'company/about',
    loadComponent: () =>
      import('./pages/company/about/company-about.component').then(
        (m) => m.CompanyAboutComponent,
      ),
    title: 'About — INOVIXUX',
  },
  {
    path: 'company/careers',
    loadComponent: () =>
      import('./pages/company/careers/company-careers.component').then(
        (m) => m.CompanyCareersComponent,
      ),
    title: 'Careers — INOVIXUX',
  },
  {
    path: 'legal',
    redirectTo: 'legal/disclosures',
    pathMatch: 'full',
  },
  {
    path: 'legal/privacy',
    loadComponent: () =>
      import('./pages/legal/privacy/legal-privacy.component').then(
        (m) => m.LegalPrivacyComponent,
      ),
    title: 'Privacy — INOVIXUX',
  },
  {
    path: 'legal/terms',
    loadComponent: () =>
      import('./pages/legal/terms/legal-terms.component').then((m) => m.LegalTermsComponent),
    title: 'Terms — INOVIXUX',
  },
  {
    path: 'legal/disclosures',
    loadComponent: () =>
      import('./pages/legal/disclosures/legal-disclosures.component').then(
        (m) => m.LegalDisclosuresComponent,
      ),
    title: 'Disclosures — INOVIXUX',
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then((m) => m.ContactComponent),
    title: 'Contact — INOVIXUX',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found — INOVIXUX',
  },
];
