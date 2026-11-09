import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoMenuComponent, InoMenuItem, InoMenuSection } from '../../../../components/menu/ino-menu.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-menu` (INO-425).
 *
 * `items: InoMenuItem[]` hits the same generic-renderer gap `ino-breadcrumb`/`ino-panel-menu`
 * already hit: `defaultValueFor()` gives it `[]`, and the whole visible surface is driven by that
 * recursive array — the generic renderer would produce a labelled, empty `role="menu"` in every
 * section. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * `href` values point at a real route inside this docs app — activating a leaf performs a real
 * in-app navigation, demonstrating router integration live rather than in prose.
 */
@Component({
  selector: 'app-menu-demo',
  standalone: true,
  imports: [CommonModule, InoMenuComponent],
  templateUrl: './menu-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuDemoComponent {
  /** Flat list — the `items` form, no grouping. */
  protected readonly flatItems: InoMenuItem[] = [
    { label: 'New', icon: '+', command: () => this.note('New') },
    { label: 'Open', icon: '◉', command: () => this.note('Open') },
    { label: 'Save', command: () => this.note('Save') },
    { label: 'Delete (locked)', disabled: true },
  ];

  /** Grouped `sections` form — two labelled groups, one unlabelled trailing group, a nested
   *  submenu under "Export" to demonstrate the absorbed `TieredMenu` case. */
  protected readonly groupedSections: InoMenuSection[] = [
    {
      label: 'File',
      items: [
        { label: 'New', icon: '+', command: () => this.note('New') },
        { label: 'Open', icon: '◉', command: () => this.note('Open') },
        {
          label: 'Export',
          children: [
            { label: 'Export as CSV', command: () => this.note('Export CSV') },
            { label: 'Export as PDF', command: () => this.note('Export PDF') },
          ],
        },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Cut', command: () => this.note('Cut') },
        { label: 'Copy', command: () => this.note('Copy') },
        { label: 'Paste (locked)', disabled: true },
      ],
    },
    {
      items: [{ label: 'Link to docs home', href: '/docs/components/menu' }],
    },
  ];

  /** Explicitly-empty section — proves §1's "non-null sections always wins over items" rule: this
   *  renders the grouped (empty) view, never falling back to `fallbackItems` below. */
  protected readonly emptySections: InoMenuSection[] = [];
  protected readonly fallbackItems: InoMenuItem[] = [{ label: 'You should never see this' }];

  protected lastAction = '(none yet)';

  protected note(label: string): void {
    this.lastAction = label;
  }
}
