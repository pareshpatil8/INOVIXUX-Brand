import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoMegaMenuComponent } from '../../../../components/megamenu/ino-megamenu.component';
import { InoMegaMenuItem, InoMegaMenuLink } from '../../../../components/megamenu/ino-megamenu.types';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-megamenu` (INO-495).
 *
 * `items: InoMegaMenuItem[]` hits the same generic-renderer gap `ino-panel-menu`/`ino-menu`
 * already hit: `defaultValueFor()` gives it `[]`, and this component's entire visible surface —
 * triggers, open panels, grouped columns — is driven by that nested array. Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * `href` values point at real routes inside this docs app — activating a leaf performs a real
 * in-app navigation, demonstrating router integration live rather than in prose.
 */
@Component({
  selector: 'app-megamenu-demo',
  standalone: true,
  imports: [CommonModule, InoMegaMenuComponent],
  templateUrl: './megamenu-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MegaMenuDemoComponent {
  /** Two panel triggers with grouped, icon-bearing columns, plus one plain top-level link — the
   *  spec row's "multi-column panels; grouped links; icons" shape. */
  protected readonly productMenu: InoMegaMenuItem[] = [
    {
      label: 'Payments',
      icon: '◈',
      columns: [
        {
          heading: 'Move money',
          items: [
            { label: 'Checkout', icon: '▣', description: 'Hosted and embeddable flows', href: '/docs/components/megamenu' },
            { label: 'Invoicing', icon: '▤', description: 'One-off and recurring invoices', href: '/docs/components/megamenu' },
          ],
        },
        {
          heading: 'Reconcile',
          items: [
            { label: 'Settlements', icon: '◉', href: '/docs/components/megamenu' },
            { label: 'Disputes', icon: '◎', href: '/docs/components/megamenu' },
          ],
        },
      ],
    },
    {
      label: 'Banking',
      icon: '◆',
      columns: [
        {
          heading: 'Accounts',
          items: [
            { label: 'Ledgers', href: '/docs/components/megamenu' },
            { label: 'Statements', href: '/docs/components/megamenu' },
          ],
        },
      ],
    },
    { label: 'Pricing', href: '/docs/components/megamenu' },
  ];

  protected readonly verticalMenu: InoMegaMenuItem[] = this.productMenu;

  protected readonly withDisabledItem: InoMegaMenuItem[] = [
    { label: 'Available', href: '/docs/components/megamenu' },
    {
      label: 'Products (locked)',
      disabled: true,
      columns: [{ items: [{ label: 'Hidden', href: '/docs/components/megamenu' }] }],
    },
    { label: 'Pricing', href: '/docs/components/megamenu' },
  ];

  protected readonly readonlyMenu: InoMegaMenuItem[] = [
    {
      label: 'Products',
      columns: [{ heading: 'Payments', items: [{ label: 'Checkout', href: '/docs/components/megamenu' }] }],
    },
  ];

  protected readonly longLabelMenu: InoMegaMenuItem[] = [
    {
      label: 'Risk rules',
      columns: [
        {
          heading: 'Underwriting',
          items: [
            {
              label: 'A settlement rule that references a very long originating counterparty name',
              href: '/docs/components/megamenu',
            },
          ],
        },
      ],
    },
  ];

  protected readonly rtlMenu: InoMegaMenuItem[] = [
    {
      label: 'الدفعات',
      icon: '◈',
      columns: [{ heading: 'الحساب', items: [{ label: 'المعاملات', href: '/docs/components/megamenu' }] }],
    },
    { label: 'التسعير', href: '/docs/components/megamenu' },
  ];

  protected lastClicked = '(none yet)';

  protected onItemClick(entry: InoMegaMenuItem | InoMegaMenuLink): void {
    this.lastClicked = entry.label;
  }
}
