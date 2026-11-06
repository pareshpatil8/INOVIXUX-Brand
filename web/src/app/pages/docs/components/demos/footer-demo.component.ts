import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoFooterComponent, InoFooterColumn } from '../../../../components/footer/ino-footer.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-footer` (INO-374, doc 26 §6 C5 —
 * marketing-only components with no docs page at all). Mounted in place of the generic
 * props-driven grid on `/docs/components/footer` via `CUSTOM_DEMOS` (`../custom-demos.ts`)
 * because the generic renderer only fills the component's sole `columns` array `@Input` with
 * `[]`, and can't project the `[logo]` mark slot either.
 */
@Component({
  selector: 'app-footer-demo',
  standalone: true,
  imports: [CommonModule, InoFooterComponent],
  templateUrl: './footer-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterDemoComponent {
  protected readonly columns: InoFooterColumn[] = [
    {
      heading: 'Product',
      links: [
        { label: 'Underwriting', href: '/product/underwriting' },
        { label: 'Risk scoring', href: '/product/risk-scoring' },
        { label: 'Onboarding', href: '/product/onboarding' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', href: '/company/about' },
        { label: 'Careers', href: '/company/careers' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Docs', href: '/docs' },
        { label: 'Status', href: '/status' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy', href: '/legal/privacy' },
        { label: 'Terms', href: '/legal/terms' },
      ],
    },
  ];

  protected readonly noColumns: InoFooterColumn[] = [];
}
