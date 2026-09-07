import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface InoFeatureGridItem {
  icon: string;
  title: string;
  description: string;
}

/**
 * `<ino-feature-grid>` — 4-column static description grid.
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3.
 *
 * Deliberately uses flat `--ino-color-surface` for cards, not `-raised` — v5 reserves "raised"
 * for live-data surfaces (dashboard/metric panels) only. Preserve that distinction; it is the
 * system's depth hierarchy, not an arbitrary style choice.
 */
@Component({
  selector: 'ino-feature-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-feature-grid.component.html',
  styleUrl: './ino-feature-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoFeatureGridComponent {
  @Input() items: InoFeatureGridItem[] = [];
}
