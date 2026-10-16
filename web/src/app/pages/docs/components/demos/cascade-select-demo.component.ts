import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoCascadeSelectComponent,
  InoCascadeSelectOption,
} from '../../../../components/cascade-select/ino-cascade-select.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-cascade-select` (INO-731, fixing the
 * INO-423 QA rejection). Mounted in place of the generic props-driven grid on
 * `/docs/components/cascade-select` via `CUSTOM_DEMOS` (`../custom-demos.ts`) — the generic
 * renderer's `defaultValueFor()` returns `[]` for the `options` tree input and `''` for every
 * string input, so every generic example box rendered an unlabeled trigger over an empty tree:
 * nothing to drill into, no breadcrumb, no `aria-activedescendant`, and (because `error` is
 * string-typed, not boolean) no invalid example either. The component's whole contract — leaf-only
 * selection, drill-in/go-back, the breadcrumb trail, the `open-level` state (SPEC.md §5) — is
 * unexercisable without a real option tree, which is what this demo supplies.
 */
@Component({
  selector: 'app-cascade-select-demo',
  standalone: true,
  imports: [CommonModule, InoCascadeSelectComponent],
  templateUrl: './cascade-select-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CascadeSelectDemoComponent implements AfterViewInit {
  @ViewChild('drilledInCascade', { read: ElementRef })
  private readonly drilledInRef?: ElementRef<HTMLElement>;

  @ViewChild('emptyCascade', { read: ElementRef })
  private readonly emptyRef?: ElementRef<HTMLElement>;

  /** Geographic hierarchy — the SPEC.md §3 worked example ("Asia / India / Maharashtra"). Carries
   *  a disabled leaf, a disabled parent, and one root-level leaf (`Antarctica`, selectable without
   *  drilling at all) so every row kind in the selection model is on the page. */
  protected readonly regions: InoCascadeSelectOption[] = [
    {
      label: 'Asia',
      value: 'asia',
      children: [
        {
          label: 'India',
          value: 'india',
          children: [
            { label: 'Maharashtra', value: 'mh' },
            { label: 'Karnataka', value: 'ka' },
            { label: 'Kerala (no coverage yet)', value: 'kl', disabled: true },
          ],
        },
        {
          label: 'Singapore',
          value: 'sg',
          children: [
            { label: 'Central', value: 'sg-central' },
            { label: 'West', value: 'sg-west' },
          ],
        },
        {
          label: 'Japan',
          value: 'jp',
          children: [
            { label: 'Kanto', value: 'jp-kanto' },
            { label: 'Kansai', value: 'jp-kansai' },
          ],
        },
      ],
    },
    {
      label: 'Europe',
      value: 'europe',
      children: [
        {
          label: 'Germany',
          value: 'de',
          children: [
            { label: 'Bavaria', value: 'de-by' },
            { label: 'Hesse', value: 'de-he' },
          ],
        },
        {
          label: 'Ireland',
          value: 'ie',
          children: [
            { label: 'Dublin', value: 'ie-d' },
            { label: 'Cork', value: 'ie-c' },
          ],
        },
      ],
    },
    {
      label: 'North America',
      value: 'north-america',
      children: [
        {
          label: 'United States',
          value: 'us',
          children: [
            { label: 'California', value: 'us-ca' },
            { label: 'New York', value: 'us-ny' },
          ],
        },
        { label: 'Canada (not launched)', value: 'ca', disabled: true },
      ],
    },
    { label: 'Antarctica (no sub-regions)', value: 'antarctica' },
  ];

  /** Second tree for the custom-option-template variant — `#optionTemplate` gets the whole option,
   *  so a row can render more than its label (here: a SKU code beside the name). */
  protected readonly catalogue: InoCascadeSelectOption[] = [
    {
      label: 'Payments',
      value: 'payments',
      children: [
        { label: 'Card acquiring', value: 'PAY-100' },
        { label: 'Direct debit', value: 'PAY-200' },
      ],
    },
    {
      label: 'Identity',
      value: 'identity',
      children: [
        { label: 'KYC screening', value: 'IDV-100' },
        { label: 'Document capture', value: 'IDV-200' },
      ],
    },
  ];

  // Variants / structure
  protected basicValue = '';
  protected preselectedValue = 'mh';
  protected catalogueValue = 'IDV-100';

  // States (static snapshots — hover / focus-visible / active are live on every enabled trigger)
  protected readonly disabledValue = 'mh';
  protected readonly readonlyValue = 'us-ca';
  protected readonly invalidValue = '';
  protected readonly loadingValue = '';

  /** Empty tree, for the "No options found." panel state. */
  protected readonly noOptions: InoCascadeSelectOption[] = [];

  protected onBasicValueChange(value: string): void {
    this.basicValue = value;
  }

  protected onPreselectedValueChange(value: string): void {
    this.preselectedValue = value;
  }

  protected onCatalogueValueChange(value: string): void {
    this.catalogueValue = value;
  }

  /** Pre-opens the two panels whose state can only be seen while the popup is up: the drilled-in
   *  `open-level` state (SPEC.md §5 — breadcrumb bar + back button, which only render below root)
   *  and the empty-tree "No options found." message.
   *
   *  Both use **non-bubbling** `click` events rather than `element.click()`. The element's own
   *  template `(click)` binding still fires (it is the event target) and, being zone-patched,
   *  re-renders the OnPush component exactly as a user click would — the same reason
   *  `TreeSelectDemoComponent`/`ListboxDemoComponent` drive their pre-opened panels through real
   *  DOM events instead of calling the component's methods directly. What `bubbles: false` avoids
   *  is the second half of a real click: `InoCascadeSelectComponent`'s
   *  `@HostListener('document:click')` close-on-outside-click, which every *other* instance on
   *  this page would also receive and (correctly) answer by closing. With two panels meant to be
   *  up at once, a bubbling open of the second one closes the first. A real user click anywhere on
   *  the page still dismisses both, which is the documented behaviour.
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      // Open the drilled-in example at root, then — one macrotask later, once that level has
      // rendered — activate its first parent row ("Asia") to push a breadcrumb level.
      this.clickWithoutBubbling(
        this.drilledInRef?.nativeElement.querySelector<HTMLElement>('.ino-field__control--trigger'),
      );
      this.clickWithoutBubbling(
        this.emptyRef?.nativeElement.querySelector<HTMLElement>('.ino-field__control--trigger'),
      );
      setTimeout(() => {
        this.clickWithoutBubbling(
          this.drilledInRef?.nativeElement.querySelector<HTMLElement>(
            '.ino-field__option--parent',
          ),
        );
      });
    });
  }

  private clickWithoutBubbling(element: HTMLElement | null | undefined): void {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true }));
  }
}
