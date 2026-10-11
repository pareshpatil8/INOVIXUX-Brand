import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoTreeSelectComponent,
  InoTreeSelectNode,
} from '../../../../components/treeselect/ino-treeselect.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-treeselect` (INO-533, fixing INO-528
 * QA gaps). Mounted in place of the generic props-driven grid on `/docs/components/treeselect` via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) — the generic renderer's `defaultValueFor()` returns `[]`
 * for the `nodes` array input and forces every boolean `@Input` (including `filter`, whose
 * component default is `true`) to `false`, so every generic example box opened to "No options."
 * with zero `role="tree"`/`role="treeitem"` rows. `error` is also string-typed, so the generic
 * renderer's boolean-only `STATE_INPUT_NAMES` filter never produced an invalid/error example
 * either. This demo supplies a real `InoTreeSelectNode[]` tree so single/multiple/checkbox
 * selection, cascading tri-state checkboxes, lazy-loaded children, filtering, the invalid state,
 * and sizing can all be exercised and screenshotted on the live page.
 */
@Component({
  selector: 'app-treeselect-demo',
  standalone: true,
  imports: [CommonModule, InoTreeSelectComponent],
  templateUrl: './treeselect-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeSelectDemoComponent implements AfterViewInit {
  @ViewChild('filteredEmptyTreeSelect', { read: ElementRef })
  private readonly filteredEmptyTreeSelectRef?: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly orgNodes: InoTreeSelectNode[] = [
    {
      label: 'Engineering',
      value: 'engineering',
      children: [
        {
          label: 'Frontend',
          value: 'frontend',
          children: [
            { label: 'Web', value: 'web' },
            { label: 'Mobile', value: 'mobile' },
          ],
        },
        {
          label: 'Backend',
          value: 'backend',
          children: [
            { label: 'API', value: 'api' },
            { label: 'Database (on-call only)', value: 'database', disabled: true },
          ],
        },
      ],
    },
    {
      label: 'Design',
      value: 'design',
      children: [
        { label: 'Product design', value: 'product-design' },
        { label: 'Brand', value: 'brand' },
      ],
    },
    { label: 'Support', value: 'support' },
  ];

  // Single-selection
  protected singleValue: string = 'web';

  // Multiple-selection (flat membership, no cascade)
  protected multipleValue: string[] = ['web', 'brand'];

  // Checkbox selection — 'web' and 'api' checked leaves 'Frontend'/'Backend'/'Engineering' in the
  // partial ("mixed") tri-state, since neither branch has every child checked.
  protected checkboxValue: string[] = ['web', 'api'];

  // Filtered-to-zero-results — query matches nothing in orgNodes
  protected readonly filteredEmptyQuery = 'zz-no-match';

  // States
  protected disabledValue: string = 'web';
  protected readonlyValue: string = 'brand';
  protected invalidValue: string = '';
  protected loadingValue: string = '';

  // Lazy children — 'Archived projects' has hasChildren=true and no loaded children until
  // loadChildren fires.
  protected lazyNodes: InoTreeSelectNode[] = [
    { label: 'Active projects', value: 'active-projects' },
    { label: 'Archived projects', value: 'archived-projects', hasChildren: true },
  ];
  protected lazyValue: string = '';

  protected onSingleValueChange(value: string | string[]): void {
    this.singleValue = value as string;
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

  protected onLoadChildren(node: InoTreeSelectNode): void {
    this.lazyNodes = this.lazyNodes.map((n) =>
      n.value === node.value ? { ...n, loading: true } : n,
    );
    setTimeout(() => {
      this.lazyNodes = this.lazyNodes.map((n) =>
        n.value === node.value
          ? {
              ...n,
              loading: false,
              children: [
                { label: '2024 roadmap', value: 'roadmap-2024' },
                { label: '2023 roadmap', value: 'roadmap-2023' },
              ],
            }
          : n,
      );
      this.cdr.markForCheck();
    }, 600);
  }

  /** Opens the trigger with a real `.click()` (so the component's own (click) handler + OnPush
   *  change detection run exactly as they would for a user click, same as any real open), then —
   *  one further macrotask later, once that render has landed — dispatches a real `input` event
   *  carrying a zero-match query into the now-rendered filter box. Same two-step rationale as
   *  `ListboxDemoComponent.ngAfterViewInit`: a synchronous call from this lifecycle hook can't
   *  itself make an OnPush child re-render, but a zone-patched DOM event dispatched to one of its
   *  own template listeners can. */
  ngAfterViewInit(): void {
    setTimeout(() => {
      const host = this.filteredEmptyTreeSelectRef?.nativeElement;
      const trigger = host?.querySelector<HTMLButtonElement>('.ino-field__control--trigger');
      trigger?.click();
      setTimeout(() => {
        const input = host?.querySelector<HTMLInputElement>('.ino-field__filter');
        if (input) {
          input.value = this.filteredEmptyQuery;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
  }
}
