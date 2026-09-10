import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoEmptyStateComponent } from '../../components/empty-state/ino-empty-state.component';

/**
 * List template rendered via the Empty-state template (inventory rows 9 + 12 —
 * `13-mobile-app-patterns.md` §2). No notifications yet in this scaffold (no backend), so the
 * empty state is the only state proven here; a populated list reuses Home's row pattern once
 * there's real data to show.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, InoEmptyStateComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {}
