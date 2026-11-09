import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoDataViewComponent, InoDataViewLayout } from '../../../../components/dataview/ino-dataview.component';
import {
  InoDataViewGridItemDirective,
  InoDataViewListItemDirective,
} from '../../../../components/dataview/ino-dataview.templates';
import { InoPaginatorPageEvent } from '../../../../components/paginator/ino-paginator.component';

interface DemoCompany {
  id: number;
  name: string;
  status: 'Active' | 'Pending' | 'Closed';
}

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-dataview` (INO-454). Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) — the generic renderer's `defaultValueFor()` returns `[]`
 * for the `value` array and has no way to project `ng-template` item-template content (the same
 * gap `keyfilter`'s own comment in `custom-demos.ts` records for a different component), so the
 * generic grid would render nothing but an empty state on every variant. This demo supplies real
 * `DemoCompany[]` data and both item templates so list, grid, paginator, loading, and empty can all
 * be exercised and screenshotted.
 */
@Component({
  selector: 'app-dataview-demo',
  standalone: true,
  imports: [CommonModule, InoDataViewComponent, InoDataViewListItemDirective, InoDataViewGridItemDirective],
  templateUrl: './dataview-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataViewDemoComponent {
  protected readonly companies: DemoCompany[] = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    name: `Company ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`,
    status: i % 7 === 0 ? 'Closed' : i % 3 === 0 ? 'Pending' : 'Active',
  }));

  // Layout switch — live, two-way bound
  protected layout: InoDataViewLayout = 'list';
  protected onLayoutChange(layout: InoDataViewLayout): void {
    this.layout = layout;
  }

  // Paginator integration
  protected first = 0;
  protected readonly pageSize = 6;
  protected onPage(event: InoPaginatorPageEvent): void {
    this.first = event.first;
  }

  // Sizing
  protected readonly smallSet = this.companies.slice(0, 4);
}
