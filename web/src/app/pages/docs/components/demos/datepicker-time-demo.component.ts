import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoDatePickerComponent } from '../../../../components/datepicker/ino-datepicker.component';
import { INO_CONTROL_SIZES } from '../../../../components/control-size';
import { DemoConstrainedContainerComponent } from './demo-constrained-container.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-datepicker` time + typed-entry
 * variants (INO-365, doc 26 §4 A2 — "No date+time picker / no enterable date"). Mounted in place
 * of the generic props-driven grid on `/docs/components/datepicker` via `CUSTOM_DEMOS`
 * (`../custom-demos.ts`).
 *
 * Demonstrates the time-picker variants board finding D2 identified as missing:
 * - `showTime` — date + time selection
 * - `timeOnly` — time picker only, no date grid
 * - `showSeconds` — hour:minute:second with spinners
 * - `hourFormat="12"` — 12-hour with AM/PM toggle
 * - `manualEntry` — typed input with locale-aware parsing
 * - `minTime`/`maxTime` — time-axis constraints
 *
 * Mobile parity note (per SPEC.md §9): the time picker is deliberately NOT ported to RN/Flutter —
 * native ports are scoped to single-date selection only, per the documented mobile disposition.
 * No additional mobile work is required for this issue.
 *
 * Also carries the INO-364 overlay-positioning regression demos (positioned ancestor, scrolling
 * ancestor with `appendTo="self"` vs `appendTo="body"`, and — INO-368, doc 26 §6 C2 — a narrow
 * ancestor near a viewport edge) via `<app-demo-constrained-container>` — same slug, same
 * `CUSTOM_DEMOS` mount point, so all three issues' §2 contract coverage lives in one file rather
 * than competing demo components for `datepicker`.
 */
@Component({
  selector: 'app-datepicker-time-demo',
  standalone: true,
  imports: [CommonModule, InoDatePickerComponent, DemoConstrainedContainerComponent],
  templateUrl: './datepicker-time-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatepickerTimeDemoComponent {
  protected readonly sizes = INO_CONTROL_SIZES;

  // Baseline variant — date-only, single selection (INO-386 §2 item 1)
  protected baselineDateValue: Date | null = new Date(2026, 8, 28);

  // Positioning regression (INO-364) — positioned ancestor / scrolling ancestor / body portal
  protected positionedAncestorValue: Date | null = null;
  protected scrollSelfValue: Date | null = null;
  protected scrollBodyValue: Date | null = null;

  // Constrained-container harness (INO-368, doc 26 §6 C2) — narrow ancestor near a viewport edge
  protected narrowAncestorValue: Date | null = null;

  // showTime — date + time
  protected dateTimeValue: Date | null = new Date(2026, 8, 28, 14, 30);

  // timeOnly — just time picker
  protected timeOnlyValue: Date | null = new Date(2026, 8, 28, 9, 15);

  // showSeconds — hour:minute:second
  protected timeWithSecondsValue: Date | null = new Date(2026, 8, 28, 16, 45, 30);

  // 12-hour format
  protected time12hValue: Date | null = new Date(2026, 8, 28, 15, 30); // 3:30 PM

  // manualEntry — typed input
  protected manualEntryValue: Date | null = null;

  // minTime/maxTime constraints (business hours: 9 AM - 5 PM)
  protected businessHoursValue: Date | null = new Date(2026, 8, 28, 10, 0);
  protected readonly minBusinessTime = new Date(2026, 8, 28, 9, 0, 0);
  protected readonly maxBusinessTime = new Date(2026, 8, 28, 17, 0, 0);

  // Range with time
  protected dateTimeRangeValue: Date[] = [
    new Date(2026, 8, 28, 9, 0),
    new Date(2026, 8, 30, 17, 0),
  ];

  // Disabled state
  protected disabledValue: Date | null = new Date(2026, 8, 28, 14, 30);

  // Loading state
  protected loadingValue: Date | null = new Date(2026, 8, 28, 10, 15);

  // Error state
  protected errorValue: Date | null = null;
  protected readonly errorMessage = 'Appointment time must be during business hours';

  // Readonly state (INO-386 §2 item 2)
  protected readonlyValue: Date | null = new Date(2026, 8, 28);

  // Required state (INO-386 §2 item 2)
  protected requiredValue: Date | null = null;

  // Empty state (INO-386 §2 item 2)
  protected emptyValue: Date | null = null;
}
