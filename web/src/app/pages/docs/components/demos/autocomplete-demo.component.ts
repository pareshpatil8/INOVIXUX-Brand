import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoAutocompleteComponent,
  InoAutocompleteOption,
} from '../../../../components/autocomplete/ino-autocomplete.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-autocomplete` (INO-401 QA rejection —
 * `autocomplete` wasn't registered in `CUSTOM_DEMOS`, so the generic renderer's `options` default
 * of `[]` left every box an empty, suggestion-less trigger and `size: InoControlSize` — a type
 * alias — produced no Sizing section at all). Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * The `open`/`no-results`/`searching` boxes below call the component's own public
 * `openPanel(false)` from `ngAfterViewInit` to set the state without an interaction, then force
 * that one OnPush view to render via its own `ChangeDetectorRef.detectChanges()` (a public,
 * per-instance API — not `window.ng`/a debug hook). `focusTrigger=true` was tried first, but
 * sequencing real `focus()` calls across 4 boxes cascades: focusing box 2 blurs box 1, and
 * `onBlur()` unconditionally closes the panel, so only the last-focused box ever stayed open.
 */
@Component({
  selector: 'app-autocomplete-demo',
  standalone: true,
  imports: [CommonModule, InoAutocompleteComponent],
  templateUrl: './autocomplete-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutocompleteDemoComponent implements AfterViewInit {
  @ViewChild('openPanelAc', { read: ElementRef }) private readonly openPanelEl?: ElementRef<HTMLElement>;
  @ViewChild('maxSelectedAc', { read: ElementRef }) private readonly maxSelectedEl?: ElementRef<HTMLElement>;
  @ViewChild('noResultsAc', { read: ElementRef }) private readonly noResultsEl?: ElementRef<HTMLElement>;
  @ViewChild('searchingAc', { read: ElementRef }) private readonly searchingEl?: ElementRef<HTMLElement>;

  protected readonly flatOptions: InoAutocompleteOption[] = [
    { label: 'Alpha', value: 'alpha' },
    { label: 'Bravo', value: 'bravo', disabled: true },
    { label: 'Charlie', value: 'charlie' },
    { label: 'Delta', value: 'delta' },
    { label: 'Echo', value: 'echo' },
  ];

  protected readonly groupedOptions: InoAutocompleteOption[] = [
    { label: 'Apple', value: 'apple', group: 'Fruits' },
    { label: 'Banana', value: 'banana', group: 'Fruits', disabled: true },
    { label: 'Cherry', value: 'cherry', group: 'Fruits' },
    { label: 'Carrot', value: 'carrot', group: 'Vegetables' },
    { label: 'Daikon', value: 'daikon', group: 'Vegetables', disabled: true },
    { label: 'Eggplant', value: 'eggplant', group: 'Vegetables' },
  ];

  // Crosses the default `virtualScrollThreshold` (100) so `<ino-virtual-scroller>` is what
  // actually renders the rows, not the plain `*ngFor` branch.
  protected readonly manyOptions: InoAutocompleteOption[] = Array.from({ length: 120 }, (_, i) => ({
    label: `Item ${String(i + 1).padStart(3, '0')}`,
    value: `item-${i + 1}`,
  }));

  // Variants — single
  protected basicValue = '';
  protected inlineValue = '';
  protected clearableValue = 'charlie';
  protected groupedValue = '';
  protected virtualValue = '';

  // Variants — multiple
  protected multipleValue: string[] = ['alpha', 'charlie'];
  protected maxSelectedValue: string[] = ['alpha', 'charlie'];

  // States
  protected requiredValue = '';
  protected disabledValue = 'alpha';
  protected readonlyValue = 'delta';
  protected loadingValue = 'alpha';
  protected invalidValue = '';
  protected openPanelValue = '';
  protected noResultsValue = 'zzz-no-match';
  protected searchingValue = 'zzz-no-match';
  protected forceSelectionValue = 'alpha';

  // Sizing
  protected smallValue = '';
  protected defaultSizeValue = '';
  protected largeValue = '';

  // Density
  protected densityDenseValue = '';
  protected densityFluidValue = '';

  // Labels
  protected labeledValue = '';
  protected hintValue = '';
  protected errorValue = '';
  protected rtlValue = '';

  ngAfterViewInit(): void {
    // Queued so each runs after its own instance's `ngAfterViewInit` has set up `triggerRef`.
    // Dispatching a synthetic `focus` event at the trigger `<input>` runs the component's own
    // `(focus)="onFocus()"` template binding — the same path a real click/Tab takes, and the
    // dispatch still goes through Angular's zone-wrapped listener, so the OnPush view is marked
    // dirty and renders. A real `.focus()` call was tried first, but moving actual browser focus
    // from box to box fires a real `blur` on the previous box, and `onBlur()` unconditionally
    // closes its panel — only the last-focused box ever stayed open.
    queueMicrotask(() => {
      this.dispatchFocus(this.openPanelEl);
      this.dispatchFocus(this.maxSelectedEl);
      this.dispatchFocus(this.noResultsEl);
      this.dispatchFocus(this.searchingEl);
    });
  }

  private dispatchFocus(ref: ElementRef<HTMLElement> | undefined): void {
    ref?.nativeElement.querySelector('input')?.dispatchEvent(new Event('focus'));
  }
}
