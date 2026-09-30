import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoFeatureGridComponent, InoFeatureGridItem } from '../../../../components/feature-grid/ino-feature-grid.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-feature-grid` (INO-374, doc 26 §6
 * C5 — marketing-only components with no docs page at all). Mounted in place of the generic
 * props-driven grid on `/docs/components/feature-grid` via `CUSTOM_DEMOS` (`../custom-demos.ts`)
 * because the generic renderer only fills the component's sole `items` array `@Input` with `[]`
 * — an empty grid demonstrates nothing.
 */
@Component({
  selector: 'app-feature-grid-demo',
  standalone: true,
  imports: [CommonModule, InoFeatureGridComponent],
  templateUrl: './feature-grid-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureGridDemoComponent {
  protected readonly fourItems: InoFeatureGridItem[] = [
    { icon: '\u{1F510}', title: 'Bank-grade encryption', description: 'Data encrypted in transit and at rest, audited annually.' },
    { icon: '\u{2696}\u{FE0F}', title: 'Regulatory alignment', description: 'Built for KYB/KYC workflows across payments and banking.' },
    { icon: '\u{26A1}', title: 'Real-time risk scoring', description: 'Underwriting signals update as documents are verified.' },
    { icon: '\u{1F465}', title: 'Human-in-the-loop', description: 'Every automated decision routes to a human approver.' },
  ];

  protected readonly twoItems: InoFeatureGridItem[] = this.fourItems.slice(0, 2);

  protected readonly noItems: InoFeatureGridItem[] = [];
}
