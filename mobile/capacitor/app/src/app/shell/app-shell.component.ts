import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { InoTabBarComponent } from './tab-bar/ino-tab-bar.component';

/**
 * Chrome wrapper for every tab/stack screen: renders the routed screen plus the bottom tab bar.
 * Bottom padding on the outlet leaves room for the fixed-position tab bar (see
 * `ino-tab-bar.component.scss`) so content never renders underneath it.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, InoTabBarComponent],
  template: `
    <div class="app-shell__content">
      <router-outlet></router-outlet>
    </div>
    <ino-tab-bar></ino-tab-bar>
  `,
  styles: [
    `
      .app-shell__content {
        min-height: 100%;
        padding-bottom: calc(64px + var(--ino-safe-area-bottom, 0px));
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {}
