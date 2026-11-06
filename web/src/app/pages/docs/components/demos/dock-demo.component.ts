import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoDockComponent } from '../../../../components/dock/ino-dock.component';
import { InoDockItem } from '../../../../components/dock/ino-dock.types';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-dock` (INO-481).
 *
 * The generic renderer ships `items: []` (no demo data for array inputs) and `size`/`position`
 * are type-alias inputs it can't enumerate — so the live example would render an empty pill with
 * no size/position/magnify axes at all. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-dock-demo',
  standalone: true,
  imports: [CommonModule, InoDockComponent],
  templateUrl: './dock-demo.component.html',
  styleUrls: ['./demo-shared.scss'],
  styles: [
    `
      .dock-stage {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 110px;
        padding: var(--ino-space-4);
      }
      .dock-stage--row {
        gap: var(--ino-space-6);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockDemoComponent {
  protected readonly items: InoDockItem[] = [
    { id: 'files', label: 'Files', icon: '📁', command: () => this.onActivate('Files') },
    { id: 'mail', label: 'Mail', icon: '✉', command: () => this.onActivate('Mail') },
    { id: 'calendar', label: 'Calendar', icon: '📅', command: () => this.onActivate('Calendar') },
    { id: 'notes', label: 'Notes (locked)', icon: '📝', disabled: true },
    { id: 'settings', label: 'Settings', icon: '⚙', command: () => this.onActivate('Settings') },
  ];

  protected lastAction = '(none yet)';
  protected activeId: string | null = 'mail';

  protected onActivate(label: string): void {
    this.lastAction = label;
  }

  protected onItemClick(item: InoDockItem): void {
    this.activeId = item.id ?? this.activeId;
  }
}
