import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoBadgeComponent,
  InoBadgeVariant,
  InoBadgeSize,
  InoBadgeSeverity,
} from '../../../../components/badge/ino-badge.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-badge` (INO-460).
 *
 * Demonstrates all three variants (dot, count, status) × both sizes (sm, md) × positioned and
 * standalone modes × severity levels (status variant only) × 99+ overflow (count variant).
 * Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`), same pattern as breadcrumb/select-button demos.
 */
@Component({
  selector: 'app-badge-demo',
  standalone: true,
  imports: [CommonModule, InoBadgeComponent],
  templateUrl: './badge-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeDemoComponent {
  /** All three badge variants for size/positioning matrix demos. */
  protected readonly variants: InoBadgeVariant[] = ['dot', 'count', 'status'];

  /** Both sizes for variant demos. */
  protected readonly sizes: InoBadgeSize[] = ['sm', 'md'];

  /** All severity levels for status variant demo. */
  protected readonly severities: InoBadgeSeverity[] = ['info', 'success', 'warning', 'danger'];

  /** Count values to demonstrate 99+ overflow (< 100 shows raw number, ≥ 100 shows "99+"). */
  protected readonly countSamples = [
    { value: 3, label: '3 new notifications' },
    { value: 12, label: '12 new messages' },
    { value: 99, label: '99 items' },
    { value: 100, label: '100 items (displays as 99+)' },
    { value: 142, label: '142 items (displays as 99+)' },
  ];
}
