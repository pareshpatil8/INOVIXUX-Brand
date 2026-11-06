import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoButtonComponent } from '../../../../components/button/ino-button.component';
import {
  InoCommandMenuComponent,
  InoCommandMenuGroup,
  InoCommandMenuItem,
} from '../../../../components/command-menu/ino-command-menu.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-command-menu` (INO-433).
 *
 * `groups`/`recentItems` hit the same generic-renderer gap `ino-menu`/`ino-breadcrumb` already
 * hit: `defaultValueFor()` gives both `[]`, and `open` defaults to `false` — so the generic
 * `*ngComponentOutlet`-with-inputs renderer would mount a permanently-closed, empty palette with
 * nothing to demonstrate in any section. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * Each pane below owns its own `open` flag and `<ino-command-menu>` instance; only one is ever
 * visually open at a time (it is a full-viewport overlay), but every instance stays mounted in the
 * DOM — `*ngIf="open"` inside the component means a closed instance renders nothing, so having
 * several side-by-side `[data-density]` panes costs nothing and lets each one demonstrate a
 * different input combination.
 */
@Component({
  selector: 'app-command-menu-demo',
  standalone: true,
  imports: [CommonModule, InoButtonComponent, InoCommandMenuComponent],
  templateUrl: './command-menu-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuDemoComponent {
  protected readonly groups: InoCommandMenuGroup[] = [
    {
      heading: 'Navigation',
      items: [
        { id: 'home', label: 'Go to home', shortcutLabel: '⌘H' },
        { id: 'settings', label: 'Go to settings', description: 'Account preferences' },
      ],
    },
    {
      heading: 'Actions',
      items: [
        { id: 'logout', label: 'Log out', shortcutLabel: '⌘L' },
        { id: 'archive', label: 'Archive item (locked)', disabled: true },
      ],
    },
  ];

  protected readonly recentItems: InoCommandMenuItem[] = [{ id: 'recent-1', label: 'Reopen last report' }];

  protected liveOpen = false;
  protected emptyResultsOpen = false;
  protected loadingOpen = false;
  protected densityDenseOpen = false;
  protected densityFluidOpen = false;
  protected noHotkeyOpen = false;

  protected lastSelected = '(none yet)';
  protected lastSearch = '(none yet)';

  protected onSelect(item: InoCommandMenuItem): void {
    this.lastSelected = item.id;
  }

  protected onSearch(query: string): void {
    this.lastSearch = query || '(empty)';
  }
}
