import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoListboxComponent, InoListboxOption } from '../../../../components/listbox/ino-listbox.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-listbox` (INO-524, fixing INO-512
 * QA gaps). Mounted in place of the generic props-driven grid on `/docs/components/listbox` via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) — the generic renderer's `defaultValueFor()` returns `[]`
 * for the `options` array and forces every boolean `@Input` (including `filter`, whose component
 * default is `true`) to `false`, so every example rendered "No options." with zero `role="option"`
 * rows and no filter input. This demo supplies real `InoListboxOption[]` data (with a disabled row
 * and a grouped run) and explicit `[filter]="true"` so single-selection, multiple-selection
 * (checkboxes), and the filtered-to-zero-results state can all be exercised and screenshotted.
 */
@Component({
  selector: 'app-listbox-demo',
  standalone: true,
  imports: [CommonModule, InoListboxComponent],
  templateUrl: './listbox-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListboxDemoComponent implements AfterViewInit {
  @ViewChild('filteredEmptyListbox', { read: ElementRef })
  private readonly filteredEmptyListboxRef?: ElementRef<HTMLElement>;

  protected readonly fruitOptions: InoListboxOption[] = [
    { label: 'Apple', value: 'apple', group: 'Fruit' },
    { label: 'Banana', value: 'banana', group: 'Fruit' },
    { label: 'Cherry', value: 'cherry', group: 'Fruit' },
    { label: 'Durian (out of stock)', value: 'durian', group: 'Fruit', disabled: true },
    { label: 'Carrot', value: 'carrot', group: 'Vegetable' },
    { label: 'Daikon', value: 'daikon', group: 'Vegetable' },
    { label: 'Edamame', value: 'edamame', group: 'Vegetable' },
  ];

  // Single-selection
  protected singleValue: string = 'banana';

  // Multiple-selection (checkboxes)
  protected multipleValue: string[] = ['cherry', 'carrot'];

  protected onSingleValueChange(value: string | string[]): void {
    this.singleValue = value as string;
  }

  protected onMultipleValueChange(value: string | string[]): void {
    this.multipleValue = value as string[];
  }

  // Filtered-to-zero-results — query matches nothing in fruitOptions
  protected readonly filteredEmptyQuery = 'zz-no-match';

  // States
  protected disabledValue: string = 'apple';
  protected readonlyValue: string = 'banana';
  protected invalidValue: string = '';
  protected loadingValue: string = '';

  /** Drives the filter box to a real zero-result query on load, the same way a user typing
   *  `zz-no-match` would — so the filtered-empty state is visible/screenshotable without
   *  requiring a QA pass to type it in manually. Dispatching this during the initial
   *  `ngAfterViewInit` itself (rather than deferred) lands inside the app's first `tick()`
   *  already in progress, so the `OnPush` listbox never gets a follow-up check — deferring one
   *  macrotask puts the dispatch in a normal, independent zone turn, exactly like a real
   *  keystroke, so the component's own `(input)` handling + change detection run as usual. */
  ngAfterViewInit(): void {
    setTimeout(() => {
      const input = this.filteredEmptyListboxRef?.nativeElement.querySelector<HTMLInputElement>(
        '.ino-field__filter',
      );
      if (input) {
        input.value = this.filteredEmptyQuery;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
}
