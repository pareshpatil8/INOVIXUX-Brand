import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

import { InoEmptyStateComponent } from '../../components/empty-state/ino-empty-state.component';

/**
 * Error/offline template (`13-mobile-app-patterns.md` §2, inventory row 13). "Reuses the
 * empty-state template rather than inventing a new one" per `15-mobile-screen-inventory.md`
 * row 13 — same `<ino-empty-state>` composition as Notifications' empty list, different icon +
 * copy + a retry CTA. Not a real nav destination in a shipped app (it renders inline inside
 * whichever screen failed to load), but kept as its own pushable screen here — same as every
 * other template in this scaffold — so it's a real, running component rather than a code comment.
 */
@Component({
  selector: 'app-error-offline',
  standalone: true,
  imports: [CommonModule, InoEmptyStateComponent],
  templateUrl: './error-offline.component.html',
  styleUrl: './error-offline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorOfflineComponent {
  private readonly location = inject(Location);

  protected retry(): void {
    this.location.back();
  }
}
