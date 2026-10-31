import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoContextMenuDirective } from '../../../../components/context-menu/ino-context-menu.directive';
import { InoContextMenuItem } from '../../../../components/context-menu/ino-context-menu.types';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-context-menu` (INO-427).
 *
 * The component is directive-driven: `[inoContextMenu]` attaches to a separate trigger element
 * and handles the right-click binding. The generic `*ngComponentOutlet`-with-inputs renderer can
 * instantiate the component but cannot apply the directive to a host template at all, so `items`
 * stays `[]` and `visible` stays `false` → a permanently-closed, empty menu with no right-click
 * target. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * Each pane below owns its own directive-bound trigger; all triggers share one `items` array to
 * keep the demo concise. The menu's overlay positioning is viewport-aware, so having several
 * density panes side-by-side demonstrates that the menu appears at the cursor and adjusts its
 * position based on viewport edges.
 */
@Component({
  selector: 'app-context-menu-demo',
  standalone: true,
  imports: [CommonModule, InoContextMenuDirective],
  templateUrl: './context-menu-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuDemoComponent {
  protected readonly menuItems: InoContextMenuItem[] = [
    { label: 'Open', icon: 'pi pi-folder-open' },
    { label: 'Save', icon: 'pi pi-save' },
    { separator: true },
    { label: 'Copy (locked)', icon: 'pi pi-copy', disabled: true },
    { label: 'Paste', icon: 'pi pi-clipboard' },
    { separator: true },
    {
      label: 'More actions',
      icon: 'pi pi-ellipsis-h',
      children: [
        { label: 'Rename', icon: 'pi pi-pencil' },
        { label: 'Delete', icon: 'pi pi-trash' },
        { separator: true },
        { label: 'Properties', icon: 'pi pi-cog' },
      ],
    },
  ];

  protected lastAction = '(none yet)';

  protected onItemActivate(item: InoContextMenuItem): void {
    this.lastAction = item.label || '(unlabeled)';
  }
}
