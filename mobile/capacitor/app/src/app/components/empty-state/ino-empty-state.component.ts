import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoButtonComponent } from '@web-app/components/button/ino-button.component';

/**
 * `<ino-empty-state>` — Empty-state template (`13-mobile-app-patterns.md` §2): centered
 * icon/illustration slot + headline + optional single CTA, `--ino-color-on-surface-muted` icon
 * by default. Covers screen-inventory rows 12 (empty list/notifications) and 13 (error/offline —
 * same composition, different copy+icon per the inventory doc's own note), so both reuse this
 * one component instead of two near-duplicates.
 */
@Component({
  selector: 'ino-empty-state',
  standalone: true,
  imports: [CommonModule, InoButtonComponent],
  templateUrl: './ino-empty-state.component.html',
  styleUrl: './ino-empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoEmptyStateComponent {
  @Input() headline = '';
  @Input() body = '';
  @Input() ctaLabel = '';
  /** 'inbox' for empty-data states, 'offline' for error/offline (inventory row 13). */
  @Input() icon: 'inbox' | 'offline' = 'inbox';

  @Output() ctaClick = new EventEmitter<void>();
}
