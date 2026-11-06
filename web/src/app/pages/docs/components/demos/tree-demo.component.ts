import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoTreeComponent, InoTreeNode } from '../../../../components/tree/ino-tree.component';

const ORG_CHART: InoTreeNode[] = [
  {
    label: 'Engineering',
    value: 'engineering',
    children: [
      { label: 'Payments platform', value: 'payments-platform' },
      { label: 'Risk & fraud', value: 'risk-fraud' },
      { label: 'Core banking (locked)', value: 'core-banking', disabled: true },
    ],
  },
  {
    label: 'Compliance',
    value: 'compliance',
    children: [
      { label: 'KYB review', value: 'kyb-review' },
      { label: 'AML monitoring', value: 'aml-monitoring' },
    ],
  },
  { label: 'Design', value: 'design' },
];

const PERMISSION_TREE: InoTreeNode[] = [
  {
    label: 'Transaction data',
    value: 'transactions',
    children: [
      { label: 'View transactions', value: 'transactions.view' },
      { label: 'Export transactions', value: 'transactions.export' },
      { label: 'Reverse transactions (locked)', value: 'transactions.reverse', disabled: true },
    ],
  },
  {
    label: 'Customer records',
    value: 'customers',
    children: [
      { label: 'View customer profile', value: 'customers.view' },
      { label: 'Edit customer profile', value: 'customers.edit' },
    ],
  },
];

const MINIMAL_NODES: InoTreeNode[] = [
  {
    label: 'Engineering',
    value: 'engineering',
    children: [{ label: 'Payments platform', value: 'payments-platform' }],
  },
  { label: 'Design', value: 'design' },
];

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-tree` (INO-450). Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) — `nodes: InoTreeNode[]` is the same recursive-array gap
 * `treetable`/`menu`/`panel-menu`/`breadcrumb`/`cascade-select` all hit: `defaultValueFor()` gives
 * it an empty `[]`, so the generic single-axis `@Input` grid would render an empty, unexpandable
 * shell with no rows, no expand/collapse, no selection, and no filter match to demonstrate. See
 * `tree/SPEC.md` for the full state/sizing contract this demo exercises.
 */
@Component({
  selector: 'app-tree-demo',
  standalone: true,
  imports: [CommonModule, InoTreeComponent],
  templateUrl: './tree-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeDemoComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  protected basicNodes: InoTreeNode[] = ORG_CHART.map((n) => ({ ...n }));
  protected basicValue = '';

  protected multipleNodes: InoTreeNode[] = ORG_CHART.map((n) => ({ ...n }));
  protected multipleValue: string[] = [];

  protected checkboxNodes: InoTreeNode[] = PERMISSION_TREE.map((n) => ({ ...n }));
  protected checkboxValue: string[] = ['transactions.view'];

  protected lazyNodes: InoTreeNode[] = [
    { label: 'Archived reports', value: 'archived-reports', hasChildren: true },
    { label: 'Design', value: 'design' },
  ];
  protected lazyValue = '';

  protected compactNodes: InoTreeNode[] = MINIMAL_NODES.map((n) => ({ ...n }));
  protected fluidNodes: InoTreeNode[] = MINIMAL_NODES.map((n) => ({ ...n }));

  protected readonly disabledNodes: InoTreeNode[] = MINIMAL_NODES.map((n) => ({ ...n }));
  protected readonly disabledValue = 'payments-platform';

  protected readonly readonlyNodes: InoTreeNode[] = MINIMAL_NODES.map((n) => ({ ...n }));
  protected readonly readonlyValue = 'payments-platform';

  protected readonly invalidNodes: InoTreeNode[] = MINIMAL_NODES.map((n) => ({ ...n }));

  protected readonly loadingNodes: InoTreeNode[] = MINIMAL_NODES.map((n) => ({ ...n }));

  protected readonly emptyNodes: InoTreeNode[] = [];

  protected onBasicValueChange(value: string | string[]): void {
    this.basicValue = value as string;
  }

  protected onMultipleValueChange(value: string | string[]): void {
    this.multipleValue = value as string[];
  }

  protected onCheckboxValueChange(value: string | string[]): void {
    this.checkboxValue = value as string[];
  }

  protected onLazyValueChange(value: string | string[]): void {
    this.lazyValue = value as string;
  }

  /** Simulates an async children fetch — sets the node's own `loading` flag (renders a spinner in
   *  place of its expand chevron), then pushes a *new* `nodes` array back in with `children`
   *  populated. See `tree/SPEC.md` §4.
   *
   *  `markForCheck()` after the `setTimeout` callback is required, not optional: this component
   *  emits the mutation from an OnPush view's own macrotask callback, not from a template-bound
   *  event, so nothing else marks it dirty for the next tick — same gotcha
   *  `TreeSelectDemoComponent.onLoadChildren` documents for the identical lazy-load pattern. */
  protected onLoadChildren(node: InoTreeNode): void {
    node.loading = true;
    this.lazyNodes = [...this.lazyNodes];
    setTimeout(() => {
      node.loading = false;
      node.children = [
        { label: 'Q1 close', value: 'q1-close' },
        { label: 'Q2 close', value: 'q2-close' },
      ];
      this.lazyNodes = [...this.lazyNodes];
      this.cdr.markForCheck();
    }, 600);
  }
}
