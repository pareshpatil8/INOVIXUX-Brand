import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoDragdropComponent, InoDragDropItem } from '../../../../components/dragdrop/ino-dragdrop.component';

const SEED_ITEMS: InoDragDropItem[] = [
  { label: 'Invoice review', value: 'invoice-review' },
  { label: 'KYB document check', value: 'kyb-check' },
  { label: 'Risk-flag triage', value: 'risk-triage' },
  { label: 'Compliance sign-off (locked)', value: 'compliance', disabled: true },
  { label: 'Archive', value: 'archive' },
];

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-dragdrop` (INO-491). Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) because the generic props-driven grid cannot supply real
 * `InoDragDropItem[]` source/target data or exercise the keyboard pick-up/move/drop flow — same
 * reason `ino-orderlist` (the closest sibling) has its own hand-authored demo.
 */
@Component({
  selector: 'app-dragdrop-demo',
  standalone: true,
  imports: [CommonModule, InoDragdropComponent],
  templateUrl: './dragdrop-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragdropDemoComponent {
  protected defaultSource: InoDragDropItem[] = SEED_ITEMS.map((i) => ({ ...i }));
  protected defaultTarget: InoDragDropItem[] = [];

  protected cappedSource: InoDragDropItem[] = SEED_ITEMS.map((i) => ({ ...i }));
  protected cappedTarget: InoDragDropItem[] = [];

  protected readonly disabledSource: InoDragDropItem[] = SEED_ITEMS.slice(1).map((i) => ({ ...i }));
  protected readonly disabledTarget: InoDragDropItem[] = [{ ...SEED_ITEMS[0] }];

  protected onDefaultSourceChange(next: InoDragDropItem[]): void {
    this.defaultSource = next;
  }

  protected onDefaultTargetChange(next: InoDragDropItem[]): void {
    this.defaultTarget = next;
  }

  protected onCappedSourceChange(next: InoDragDropItem[]): void {
    this.cappedSource = next;
  }

  protected onCappedTargetChange(next: InoDragDropItem[]): void {
    this.cappedTarget = next;
  }
}
