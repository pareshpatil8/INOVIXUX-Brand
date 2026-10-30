import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoPanelMenuComponent,
} from '../../../../components/panel-menu/ino-panel-menu.component';
import { InoPanelMenuItem } from '../../../../components/panel-menu/ino-panel-menu.types';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-panel-menu` (INO-431).
 *
 * `items: InoPanelMenuItem[]` hits the same generic-renderer gap `ino-breadcrumb`/`ino-treeselect`
 * already hit: `defaultValueFor()` gives it `[]`, and this component's entire visible surface is
 * driven by that recursive array — the generic renderer would produce a labelled, empty `<nav>`
 * in every section. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * `href` values point at real routes inside this docs app — activating a leaf performs a real
 * in-app navigation, demonstrating router integration live rather than in prose.
 */
@Component({
  selector: 'app-panel-menu-demo',
  standalone: true,
  imports: [CommonModule, InoPanelMenuComponent],
  templateUrl: './panel-menu-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelMenuDemoComponent {
  /** Two top-level sections, one nested one level deeper — the "hybrid of accordion and tree"
   *  shape, with icons on a subset of nodes. */
  protected readonly productMenu: InoPanelMenuItem[] = [
    {
      label: 'Payments',
      icon: '◈',
      children: [
        { label: 'Transactions', href: '/docs/components/panel-menu' },
        { label: 'Refunds', href: '/docs/components/panel-menu' },
        {
          label: 'Disputes',
          children: [
            { label: 'Open disputes', href: '/docs/components/panel-menu' },
            { label: 'Resolved disputes', href: '/docs/components/panel-menu' },
          ],
        },
      ],
    },
    {
      label: 'Settlements',
      icon: '◉',
      children: [
        { label: 'Daily batch', href: '/docs/components/panel-menu' },
        { label: 'Reconciliation report (locked)', disabled: true },
      ],
    },
  ];

  /** One disabled group — its children are permanently unreachable, not merely visually dimmed
   *  while still togglable. */
  protected readonly withDisabledGroup: InoPanelMenuItem[] = [
    { label: 'Available', children: [{ label: 'A leaf', href: '/docs/components/panel-menu' }] },
    {
      label: 'Archived (locked)',
      disabled: true,
      children: [{ label: 'Hidden', href: '/docs/components/panel-menu' }],
    },
  ];

  protected readonly readonlyMenu: InoPanelMenuItem[] = [
    {
      label: 'Account',
      children: [
        { label: 'Profile', href: '/docs/components/panel-menu' },
        { label: 'Security', href: '/docs/components/panel-menu' },
      ],
    },
  ];

  protected readonly longLabelMenu: InoPanelMenuItem[] = [
    {
      label: 'Risk rules',
      children: [
        {
          label: 'A settlement rule that references a very long originating counterparty name',
          href: '/docs/components/panel-menu',
        },
      ],
    },
  ];

  protected lastClicked = '(none yet)';

  protected onItemClick(item: InoPanelMenuItem): void {
    this.lastClicked = item.label;
  }
}
