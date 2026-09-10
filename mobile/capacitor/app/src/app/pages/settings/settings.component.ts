import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { InoCardComponent } from '@web-app/components/card/ino-card.component';
import { InoToggleComponent } from '@web-app/components/toggle/ino-toggle.component';
import { ThemeService } from '@web-app/services/theme.service';

import { InoConfirmActionSheetComponent } from '../../components/confirm-action-sheet/ino-confirm-action-sheet.component';

/**
 * Settings / account template (`13-mobile-app-patterns.md` §2, inventory row 10 — grouped
 * `ino-card` sections, list-row pattern inside each group, reusing the List template's row
 * pattern per that doc). Last tab-bar position per the pattern's "3–5 items" cap (§1).
 *
 * Theme toggle reuses `web/`'s `ThemeService` directly (import via `@web-app/*`, no
 * re-implementation) per INO-88's scope. Its persistence is `localStorage`, which works inside a
 * Capacitor WebView (it's a real, persistent per-origin store there, not a no-op) — but
 * `13-mobile-app-patterns.md` §3 calls for swapping that specifically for the Capacitor
 * `Preferences` API (already a declared dependency, `package.json`, unused so far). Not swapped
 * in this pass: that requires either an injectable storage seam inside `ThemeService` itself
 * (a `web/` change, outside this track's file boundary) or a parallel mobile-only theme service
 * that duplicates its toggle logic — a real decision, flagged rather than picked silently.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    InoCardComponent,
    InoToggleComponent,
    InoConfirmActionSheetComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  protected readonly theme = this.themeService.theme;

  protected deleteConfirmOpen = false;

  protected onThemeToggle(): void {
    this.themeService.toggle();
  }

  protected onDeleteAccount(): void {
    this.deleteConfirmOpen = false;
    // No auth/account backend wired (product/backend work, out of this design-system track's
    // scope, same note sign-in.component.ts carries) — returns to sign-in as the closest stand-in
    // for "account removed."
    this.router.navigateByUrl('/sign-in');
  }
}
