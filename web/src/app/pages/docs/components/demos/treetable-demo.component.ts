import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoTreeTableComponent } from '../../../../components/treetable/ino-treetable.component';
import {
  InoTreeTableRow,
  InoTreeTableColumn,
  InoTreeTableSortEvent,
} from '../../../../components/treetable/ino-treetable.types';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-treetable` (INO-452).
 *
 * Demonstrates the WAI-ARIA treegrid pattern (the hardest a11y row in the program):
 * - Tree expansion model (expand/collapse hierarchical rows)
 * - Sortable columns
 * - Frozen first column
 * - States: expanded, sorted, loading, disabled, readonly, invalid
 * - Sizing: dense/fluid row heights, sm/default/lg controls
 *
 * Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`), same pattern as accordion/panel-menu.
 */
@Component({
  selector: 'app-treetable-demo',
  standalone: true,
  imports: [CommonModule, InoTreeTableComponent],
  templateUrl: './treetable-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeTableDemoComponent {
  /** Column definitions for the main demo */
  protected columns: InoTreeTableColumn[] = [
    { field: 'name', header: 'Component', sortable: true, frozen: 'start' },
    { field: 'status', header: 'Status', sortable: true },
    { field: 'assignee', header: 'Assignee', sortable: true },
    { field: 'priority', header: 'Priority', sortable: false },
  ];

  /** Hierarchical data for the main demo */
  protected data: InoTreeTableRow[] = [
    {
      value: 'inputs',
      name: 'Input Components',
      status: 'In Progress',
      assignee: 'Team A',
      priority: 'High',
      children: [
        {
          value: 'text-input',
          name: 'Text Input',
          status: 'Done',
          assignee: 'Alice',
          priority: 'High',
        },
        {
          value: 'textarea',
          name: 'Textarea',
          status: 'Done',
          assignee: 'Bob',
          priority: 'Medium',
        },
        {
          value: 'datepicker',
          name: 'Date Picker',
          status: 'In Progress',
          assignee: 'Carol',
          priority: 'High',
          children: [
            {
              value: 'datepicker-core',
              name: 'Core Functionality',
              status: 'Done',
              assignee: 'Carol',
              priority: 'High',
            },
            {
              value: 'datepicker-range',
              name: 'Range Selection',
              status: 'In Progress',
              assignee: 'Carol',
              priority: 'Medium',
            },
          ],
        },
      ],
    },
    {
      value: 'data-display',
      name: 'Data Display',
      status: 'Planned',
      assignee: 'Team B',
      priority: 'Medium',
      children: [
        {
          value: 'table',
          name: 'Table',
          status: 'In Progress',
          assignee: 'Dave',
          priority: 'High',
        },
        {
          value: 'tree',
          name: 'Tree',
          status: 'Planned',
          assignee: 'Eve',
          priority: 'Low',
        },
      ],
    },
    {
      value: 'navigation',
      name: 'Navigation',
      status: 'Done',
      assignee: 'Team C',
      priority: 'High',
      children: [
        {
          value: 'menu',
          name: 'Menu',
          status: 'Done',
          assignee: 'Frank',
          priority: 'High',
        },
        {
          value: 'breadcrumb',
          name: 'Breadcrumb',
          status: 'Done',
          assignee: 'Grace',
          priority: 'Medium',
        },
      ],
    },
  ];

  /** Minimal data for state demos */
  protected minimalData: InoTreeTableRow[] = [
    {
      value: 'parent',
      name: 'Parent Row',
      status: 'Active',
      assignee: 'User',
      priority: 'Medium',
      children: [
        {
          value: 'child-1',
          name: 'Child Row 1',
          status: 'Done',
          assignee: 'User',
          priority: 'Low',
        },
        {
          value: 'child-2',
          name: 'Child Row 2',
          status: 'In Progress',
          assignee: 'User',
          priority: 'High',
        },
      ],
    },
  ];

  /** Minimal columns for state demos */
  protected minimalColumns: InoTreeTableColumn[] = [
    { field: 'name', header: 'Name', frozen: 'start' },
    { field: 'status', header: 'Status' },
  ];

  /** Empty data for empty state demo */
  protected emptyData: InoTreeTableRow[] = [];

  /** Track last sort event for the event demo */
  protected lastSortEvent = '(none yet)';

  protected onSort(event: InoTreeTableSortEvent): void {
    this.lastSortEvent = `${event.column.header} ${event.direction || 'unsorted'}`;
  }
}
