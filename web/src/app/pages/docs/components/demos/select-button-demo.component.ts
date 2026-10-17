import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoSelectButtonComponent,
  InoSelectButtonOption,
} from '../../../../components/select-button/ino-select-button.component';

interface PayoutRule {
  readonly id: string;
  readonly counterparty: string;
  readonly limit: string;
}

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-select-button` (INO-746, QA rejection
 * on INO-411 — every section of the shipped page rendered an empty shell: zero
 * `<ino-select-button-option>` elements anywhere, in all three themes).
 *
 * One generic-renderer gap accounts for all of it: `options: InoSelectButtonOption[]` gets `[]`
 * from `defaultValueFor()` in `../docs-component-detail.component.ts`, and this component's entire
 * visible surface is `*ngFor="let option of options"` — so the Live example, the Density axis, the
 * Size axis and the States section each rendered a labelled, empty `<div>`. Two further gaps sit
 * behind it and would have surfaced the moment the first was fixed: `size: InoControlSize` is a
 * type alias the manifest extractor records as `"values": null` (no size row is generated), and
 * `multiple` — the input that decides between the radiogroup and the checkbox-group pattern, i.e.
 * the component's two variants — is not in `STATE_INPUT_NAMES`.
 *
 * Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`), same remediation as INO-707 (toggle-button)
 * and INO-731 (cascade-select). There is no static `docs/brand/06-angular-components/previews/`
 * card for this component to mirror, so the option copy below is drawn from the narrative contract
 * `docs/brand/06-angular-components/select-button.md` instead.
 *
 * Every group is two-way bound via `[(value)]`, and no caption asserts a particular selection
 * unless the instance genuinely cannot change it (disabled / readonly) — a "value = x" claim next
 * to a group a reviewer has already clicked is the kind of stale assertion a QA pass should not
 * have to second-guess. Value fields are typed `string | string[]` because that is `value`'s own
 * type: the single-select groups carry a `string`, the multi-select ones a `string[]`, and a
 * two-way binding has to be assignable in both directions.
 */
@Component({
  selector: 'app-select-button-demo',
  standalone: true,
  imports: [CommonModule, InoSelectButtonComponent],
  templateUrl: './select-button-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectButtonDemoComponent {
  /** Single-select (radiogroup) — the default mode. */
  protected readonly settlementWindows: InoSelectButtonOption[] = [
    { label: 'Instant', value: 'instant' },
    { label: 'Same day', value: 'same-day' },
    { label: 'Next day', value: 'next-day' },
  ];

  /** Multi-select (group of checkboxes) — `multiple` flips both the ARIA pattern and the input
   *  type, so the same option list serves both variants. */
  protected readonly cardNetworks: InoSelectButtonOption[] = [
    { label: 'Visa', value: 'visa' },
    { label: 'Mastercard', value: 'mastercard' },
    { label: 'Amex', value: 'amex' },
    { label: 'UnionPay', value: 'unionpay' },
  ];

  /** Icon-only — `ariaLabel` per option is mandatory here (SPEC.md §7, WCAG 4.1.2): the visible
   *  text is dropped from the DOM entirely in this mode, so without it each segment would reach AT
   *  as an unnamed radio. The icon glyph itself is `aria-hidden`. */
  protected readonly alignments: InoSelectButtonOption[] = [
    { label: 'Left', value: 'left', icon: '⇤', ariaLabel: 'Align left' },
    { label: 'Center', value: 'center', icon: '↔', ariaLabel: 'Align center' },
    { label: 'Right', value: 'right', icon: '⇥', ariaLabel: 'Align right' },
  ];

  /** `equalWidth` — the segments divide the container rather than taking natural content width,
   *  which is why the labels here are deliberately uneven in length. */
  protected readonly periods: InoSelectButtonOption[] = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Billing month', value: 'month' },
  ];

  /** Per-option `disabled` while the group itself stays live — the state the group-level
   *  `disabled` input cannot express, and the realistic one (a rail this account is not
   *  provisioned for). */
  protected readonly railsWithOneUnavailable: InoSelectButtonOption[] = [
    { label: 'SEPA instant', value: 'sepa-inst' },
    { label: 'SEPA credit', value: 'sepa-ct' },
    { label: 'Faster Payments', value: 'fps', disabled: true },
  ];

  protected readonly icons: InoSelectButtonOption[] = [
    { label: 'List', value: 'list', icon: '☰', ariaLabel: 'List view' },
    { label: 'Grid', value: 'grid', icon: '☷', ariaLabel: 'Grid view' },
  ];

  /** Labels — a long option label, to show the segment's `text-overflow: ellipsis` rather than a
   *  group that reflows or overflows its container. */
  protected readonly longLabels: InoSelectButtonOption[] = [
    { label: 'Settle to the originating funding account', value: 'origin' },
    { label: 'Settle to the nominated treasury account', value: 'treasury' },
  ];

  protected readonly rtlOptions: InoSelectButtonOption[] = [
    { label: 'فوري', value: 'instant' },
    { label: 'نفس اليوم', value: 'same-day' },
    { label: 'اليوم التالي', value: 'next-day' },
  ];

  /** Dense-table usage (§2 contract row) — a two-segment per-row decision. */
  protected readonly ruleModes: InoSelectButtonOption[] = [
    { label: 'Allow', value: 'allow' },
    { label: 'Review', value: 'review' },
  ];

  // Variants
  protected singleValue: string | string[] = 'same-day';
  protected multiValue: string | string[] = ['visa', 'mastercard'];
  protected iconOnlyValue: string | string[] = 'center';
  protected equalWidthValue: string | string[] = 'week';

  // States — the two locked groups are seeded with a selection and never reassigned, so their
  // captions stay true.
  protected readonly disabledValue: string | string[] = 'same-day';
  protected readonly readonlyValue: string | string[] = 'same-day';
  protected perOptionDisabledValue: string | string[] = 'sepa-ct';
  protected readonly readonlyMultiValue: string | string[] = ['visa', 'amex'];

  // Sizing
  protected smValue: string | string[] = 'same-day';
  protected defaultValue: string | string[] = 'same-day';
  protected lgValue: string | string[] = 'same-day';

  // Density
  protected denseValue: string | string[] = 'grid';
  protected fluidValue: string | string[] = 'grid';

  // Labels
  protected groupLabelValue: string | string[] = 'instant';
  protected ariaLabelValue: string | string[] = 'instant';
  protected longLabelValue: string | string[] = 'origin';
  protected rtlValue: string | string[] = 'same-day';

  /** Dense-table usage — kept at `size="default"`, which in this page's dense register resolves to
   *  exactly the 32px floor the accessibility contract promises; `size="sm"` would be 28px there,
   *  under the minimum target (tokens.css §12). */
  protected readonly payoutRules: readonly PayoutRule[] = [
    { id: 'cp-8841', counterparty: 'Northwind Freight', limit: '$25,000' },
    { id: 'cp-8842', counterparty: 'Helvetia Mutual', limit: '$5,000' },
    { id: 'cp-8843', counterparty: 'Tasman Logistics', limit: '$120,000' },
  ];

  private readonly ruleModeById = new Map<string, string>([
    ['cp-8841', 'allow'],
    ['cp-8842', 'review'],
    ['cp-8843', 'review'],
  ]);

  protected ruleMode(id: string): string {
    return this.ruleModeById.get(id) ?? 'allow';
  }

  protected setRuleMode(id: string, value: string | string[]): void {
    this.ruleModeById.set(id, Array.isArray(value) ? (value[0] ?? '') : value);
  }

  /** Readout for the multi-select group: `value` is an array there, and printing it back is the
   *  clearest way to show that the checkbox variant accumulates rather than replaces. */
  protected get multiReadout(): string {
    return Array.isArray(this.multiValue)
      ? this.multiValue.length
        ? this.multiValue.join(', ')
        : '(none)'
      : String(this.multiValue);
  }
}
