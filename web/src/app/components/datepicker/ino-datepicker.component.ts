import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

export type InoDatepickerMode = 'inline' | 'overlay';

interface InoDatepickerDay {
  date: Date;
  label: string;
  iso: string;
  outsideMonth: boolean;
  today: boolean;
  selected: boolean;
  disabled: boolean;
}

let idCounter = 0;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * `<ino-datepicker>` — one of the four heaviest Tier-1 components (INO-154, INO-31 T-8, Form
 * group). Parity benchmark: PrimeNG 22.1.1 `DatePicker` (`specs/primeng/llms-22.1.1.txt` line 52).
 * Decisions record and build ledger: `SPEC.md` in this directory — **read it before extending this
 * component**, it tracks which variants (range, multiple, time, month/year fast-nav, overlay) have
 * landed and which are still open across sessions.
 *
 * This slice ships single-date selection in `inline` mode only: a WAI-ARIA `grid`-pattern month
 * view with roving-tabindex keyboard navigation, min/max/disabled-date constraints, and a
 * locale-aware weekday/month story (`Intl.DateTimeFormat`, no hardcoded English strings).
 */
@Component({
  selector: 'ino-datepicker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-datepicker.component.html',
  styleUrl: './ino-datepicker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-datepicker',
    '[attr.data-size]': 'size',
    '[attr.data-mode]': 'mode',
    '[attr.data-disabled]': 'disabled || null',
    '[attr.data-readonly]': 'readonly || null',
    '[attr.data-invalid]': 'invalid || null',
    '[attr.data-loading]': 'loading || null',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoDatepickerComponent {
  /** Selected date, or `null` for no selection. */
  @Input() value: Date | null = null;
  /** Earliest selectable date (inclusive). `null` — no lower bound. */
  @Input() minDate: Date | null = null;
  /** Latest selectable date (inclusive). `null` — no upper bound. */
  @Input() maxDate: Date | null = null;
  /** Specific dates disabled independent of `minDate`/`maxDate`. Compared by calendar day. */
  @Input() disabledDates: Date[] = [];
  /** BCP 47 locale tag driving weekday/month names and week-start-day. India/APAC default. */
  @Input() locale = 'en-IN';
  @Input() size: InoControlSize = 'default';
  /** Only `'inline'` ships in this slice — see `SPEC.md` §2. `'overlay'` is reserved, not yet wired. */
  @Input() mode: InoDatepickerMode = 'inline';
  @Input() ariaLabel = 'Choose date';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) loading = false;

  @Output() valueChange = new EventEmitter<Date>();

  protected readonly gridId = `ino-datepicker-grid-${++idCounter}`;

  /** First-of-month cursor for the month currently displayed. Independent of `value` so a user can
   *  browse months without changing the selection. */
  protected viewDate: Date = this.startOfMonth(this.value ?? new Date());

  /** The day cell currently holding the roving tabindex (`tabindex="0"`). */
  protected focusedIso = '';

  protected get interactive(): boolean {
    return !this.disabled && !this.readonly && !this.loading;
  }

  protected get monthLabel(): string {
    return new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(
      this.viewDate,
    );
  }

  protected get weekdayLabels(): string[] {
    const formatter = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });
    const weekStart = this.weekStartsOn();
    return Array.from({ length: 7 }, (_, i) => {
      // 2023-01-01 is a Sunday — a stable reference to format each weekday name from.
      const reference = new Date(Date.UTC(2023, 0, 1 + ((weekStart + i) % 7)));
      return formatter.format(reference);
    });
  }

  protected get weeks(): InoDatepickerDay[][] {
    const weekStart = this.weekStartsOn();
    const first = this.startOfMonth(this.viewDate);
    const firstWeekday = (first.getDay() - weekStart + 7) % 7;
    const gridStart = new Date(first);
    gridStart.setDate(gridStart.getDate() - firstWeekday);

    const days: InoDatepickerDay[] = Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(date.getDate() + i);
      return this.toDay(date);
    });

    const weeks: InoDatepickerDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }

  protected isFocused(day: InoDatepickerDay): boolean {
    return day.iso === (this.focusedIso || this.defaultFocusIso);
  }

  /** Roving tabindex defaults to the selected day (if in view), else today (if in view), else the
   *  1st of the displayed month — always exactly one tab stop in the grid per the ARIA APG
   *  date-picker grid pattern. Computed without depending on `weeks` to avoid a circular getter. */
  private get defaultFocusIso(): string {
    if (this.value && this.startOfMonth(this.value).getTime() === this.startOfMonth(this.viewDate).getTime()) {
      return this.toIso(this.value);
    }
    const today = new Date();
    if (this.startOfMonth(today).getTime() === this.startOfMonth(this.viewDate).getTime()) {
      return this.toIso(today);
    }
    return this.toIso(this.viewDate);
  }

  protected selectDay(day: InoDatepickerDay): void {
    if (!this.interactive || day.disabled) return;
    this.focusedIso = day.iso;
    this.value = day.date;
    this.valueChange.emit(day.date);
    if (day.outsideMonth) {
      this.viewDate = this.startOfMonth(day.date);
    }
  }

  protected goToPreviousMonth(): void {
    if (!this.interactive) return;
    this.viewDate = this.addMonths(this.viewDate, -1);
  }

  protected goToNextMonth(): void {
    if (!this.interactive) return;
    this.viewDate = this.addMonths(this.viewDate, 1);
  }

  protected onKeydown(event: KeyboardEvent, day: InoDatepickerDay): void {
    if (!this.interactive) return;

    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (event.key in deltas) {
      event.preventDefault();
      this.moveFocus(day.date, deltas[event.key]);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const weekStart = this.weekStartsOn();
      const offsetFromWeekStart = (day.date.getDay() - weekStart + 7) % 7;
      const delta = event.key === 'Home' ? -offsetFromWeekStart : 6 - offsetFromWeekStart;
      this.moveFocus(day.date, delta);
      return;
    }

    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const direction = event.key === 'PageUp' ? -1 : 1;
      const months = event.shiftKey ? direction * 12 : direction;
      const next = this.addMonths(day.date, months, 'months');
      this.viewDate = this.startOfMonth(next);
      this.focusedIso = this.toIso(next);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectDay(day);
    }
  }

  private moveFocus(from: Date, deltaDays: number): void {
    const next = new Date(from);
    next.setDate(next.getDate() + deltaDays);
    if (this.startOfMonth(next).getTime() !== this.startOfMonth(this.viewDate).getTime()) {
      this.viewDate = this.startOfMonth(next);
    }
    this.focusedIso = this.toIso(next);
  }

  private addMonths(date: Date, amount: number, _unit?: 'months'): Date {
    const next = new Date(date);
    next.setDate(1);
    next.setMonth(next.getMonth() + amount);
    return next;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private isDisabledDate(date: Date): boolean {
    if (this.minDate && date.getTime() < this.stripTime(this.minDate).getTime()) return true;
    if (this.maxDate && date.getTime() > this.stripTime(this.maxDate).getTime()) return true;
    return this.disabledDates.some((d) => this.isSameDay(d, date));
  }

  private stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toDay(date: Date): InoDatepickerDay {
    const today = this.isSameDay(date, new Date());
    return {
      date,
      label: String(date.getDate()),
      iso: this.toIso(date),
      outsideMonth: date.getMonth() !== this.viewDate.getMonth(),
      today,
      selected: this.value != null && this.isSameDay(date, this.value),
      disabled: this.isDisabledDate(date),
    };
  }

  /** Resolves the locale's week-start day (0 = Sunday) via `Intl.Locale.weekInfo` where available,
   *  falling back to Sunday-start (matches `en-IN`/`en-US`; `en-GB` etc. would report Monday). */
  private weekStartsOn(): number {
    type LocaleWithWeekInfo = Intl.Locale & { weekInfo?: { firstDay: number }; getWeekInfo?: () => { firstDay: number } };
    const locale = new Intl.Locale(this.locale) as LocaleWithWeekInfo;
    const weekInfo = locale.getWeekInfo?.() ?? locale.weekInfo;
    // Intl reports firstDay as 1=Monday..7=Sunday; this component's grid uses 0=Sunday..6=Saturday.
    return weekInfo ? weekInfo.firstDay % 7 : 0;
  }
}
