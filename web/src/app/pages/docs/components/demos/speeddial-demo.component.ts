import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoSpeedDialComponent } from '../../../../components/speeddial/ino-speeddial.component';
import { InoSpeedDialItem } from '../../../../components/speeddial/ino-speeddial.types';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-speeddial` (INO-493).
 *
 * The generic renderer can instantiate the component but ships `items: []` (no demo data for
 * array inputs), so the dial would open onto an empty menu — and the layout axes (type ×
 * direction × radius × mask) need composed examples the single-axis grid cannot produce.
 * Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * Every dial shares one items array; each demo pane reserves expansion room with the
 * `.speeddial-stage` helpers below because the dial overlays absolutely and reserves no layout
 * space of its own.
 */
@Component({
  selector: 'app-speeddial-demo',
  standalone: true,
  imports: [CommonModule, InoSpeedDialComponent],
  templateUrl: './speeddial-demo.component.html',
  styleUrls: ['./demo-shared.scss'],
  styles: [
    `
      .speeddial-stage {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        min-height: 220px;
        padding: var(--ino-space-4);
      }
      .speeddial-stage--center {
        align-items: center;
      }
      .speeddial-stage--top {
        align-items: flex-start;
      }
      .speeddial-stage--short {
        min-height: 140px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeedDialDemoComponent {
  protected readonly actions: InoSpeedDialItem[] = [
    { label: 'New file', icon: '📄', command: () => this.onActivate('New file') },
    { label: 'Upload', icon: '⬆', command: () => this.onActivate('Upload') },
    { label: 'Share (locked)', icon: '🔗', disabled: true },
    { label: 'Delete', icon: '🗑', command: () => this.onActivate('Delete') },
  ];

  protected lastAction = '(none yet)';
  protected dialOpen = false;

  protected onActivate(label: string): void {
    this.lastAction = label;
  }

  protected onOpenChange(open: boolean): void {
    this.dialOpen = open;
  }
}
