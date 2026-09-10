import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * `<ino-tab-bar>` — bottom tab bar, the mobile-only chrome piece with no web/ equivalent (web/
 * uses `<ino-nav>`, a top bar; per `docs/brand/13-mobile-app-patterns.md` §1, mobile's primary
 * nav is a bottom tab bar instead). Everything else in this app reuses web/ components directly
 * via the `@web-app/*` path alias — this one is new because the pattern itself is new.
 *
 * 3 of the 4 slots the pattern doc's §2 tab-bar composition calls for: Home, Notifications,
 * Settings. Slot 2 ("second core surface") is deliberately omitted — per
 * `docs/brand/15-mobile-screen-inventory.md` §2 it's a product-scope question, not a branding
 * decision, and out of this track's remit (same call the React Native track made).
 *
 * Icons are inline SVG matching Lucide's stroke construction (round cap/join, 1.5px stroke) per
 * `docs/brand/14-icon-system.md` — same approach `ino-nav`'s theme-toggle icons already use in
 * web/, since no `lucide-angular` package is wired into either workspace yet.
 */
@Component({
  selector: 'ino-tab-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './ino-tab-bar.component.html',
  styleUrl: './ino-tab-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoTabBarComponent {
  protected readonly tabs = [
    { label: 'Home', href: '/home', icon: 'home' as const },
    { label: 'Notifications', href: '/notifications', icon: 'bell' as const },
    { label: 'Settings', href: '/settings', icon: 'settings' as const },
  ];
}
