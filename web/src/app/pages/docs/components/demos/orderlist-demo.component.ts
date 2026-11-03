import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoOrderListComponent, InoOrderListOption } from '../../../../components/orderlist/ino-orderlist.component';

const SEED_OPTIONS: InoOrderListOption[] = [
  { label: 'Invoice review', value: 'invoice-review' },
  { label: 'KYB document check', value: 'kyb-check' },
  { label: 'Risk-flag triage', value: 'risk-triage' },
  { label: 'Compliance sign-off (locked)', value: 'compliance', disabled: true },
  { label: 'Archive', value: 'archive' },
];

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-orderlist` (INO-456). Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) because the generic props-driven grid cannot supply real
 * `InoOrderListOption[]` data or exercise the move-button/reorder flow — same reason `ino-listbox`
 * (the closest sibling) has its own hand-authored demo.
 */
@Component({
  selector: 'app-orderlist-demo',
  standalone: true,
  imports: [CommonModule, InoOrderListComponent],
  templateUrl: './orderlist-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListDemoComponent {
  protected comfortableOptions: InoOrderListOption[] = SEED_OPTIONS.map((o) => ({ ...o }));
  protected comfortableValue: string[] = ['risk-triage'];

  protected compactOptions: InoOrderListOption[] = SEED_OPTIONS.map((o) => ({ ...o }));
  protected compactValue: string[] = [];

  protected readonly disabledOptions: InoOrderListOption[] = SEED_OPTIONS.map((o) => ({ ...o }));
  protected readonly disabledValue: string[] = ['invoice-review'];

  protected onComfortableOptionsChange(next: InoOrderListOption[]): void {
    this.comfortableOptions = next;
  }

  protected onComfortableValueChange(next: string[]): void {
    this.comfortableValue = next;
  }

  protected onCompactOptionsChange(next: InoOrderListOption[]): void {
    this.compactOptions = next;
  }

  protected onCompactValueChange(next: string[]): void {
    this.compactValue = next;
  }
}
