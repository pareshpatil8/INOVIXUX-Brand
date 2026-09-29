import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';
import { computeOverlayPlacement } from '../overlay/overlay-position';

let idCounter = 0;

export type InoDatePickerSelectionMode = 'single' | 'range' | 'multiple';
type InoDatePickerView = 'date' | 'month' | 'year';

/** One cell in the date grid (WAI-ARIA APG "Date Picker Dialog" `role="gridcell"`). */
interface InoDateCell {
  date: Date;
  day: number;
  inMonth: boolean;
  disabled: boolean;
  today: boolean;
  selected: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
  tabbable: boolean;
}

function sameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Adds `n` months, clamping the day-of-month so e.g. Jan 31 + 1 month lands on Feb 28/29, not Mar 3. */
function addMonths(d: Date, n: number): Date {
  const day = d.getDate();
  const c = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
  const daysInTarget = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate();
  c.setDate(Math.min(day, daysInTarget));
  return c;
}

function addYears(d: Date, n: number): Date {
  return addMonths(d, n * 12);
}

/**
 * `<ino-datepicker>` — labeled date / date-range / multi-date control with an optional time
 * picker. Contract: INO-31 T-8 (Tier 1, Form group), 4-day estimate per
 * `docs/brand/17-phase-2-implementation-program.md` line 142.
 * **Parity benchmark:** PrimeNG 22.1.1 `DatePicker` (`specs/primeng/llms-22.1.1.txt` line 52,
 * route `https://primeng.dev/datepicker`) — benchmark only, **not a runtime dependency**.
 *
 * Follows this repo's existing `@Input() value` / `@Output() valueChange` banana-in-a-box
 * convention (see `ino-input`'s doc comment) rather than a `ControlValueAccessor` — no Reactive/
 * Template-driven Forms module is wired up anywhere in this repo yet.
 *
 * `value`'s shape depends on `selectionMode` (documented in full in SPEC.md §1):
 *   - `single`   → `Date | null`
 *   - `range`    → `Date[]` of length 0, 1 (start only, still picking) or 2 (`[start, end]`)
 *   - `multiple` → `Date[]`, unordered as typed but emitted sorted ascending
 *
 * Overlay (default, `inline=false`) reuses `<ino-modal>`'s hand-rolled WAI-ARIA dialog pattern
 * (backdrop click / Escape / focus-trap) but anchors the panel under the trigger field instead of
 * centering it, and composes `InoFocusTrapDirective` (the reusable primitive `ino-modal` itself
 * predates) rather than re-hand-rolling Tab containment a third time. `inline=true` renders the
 * calendar grid directly with no popup/backdrop/focus-trap at all.
 *
 * Overlay positioning (INO-364): the overlay markup lives *inside* the trigger's own
 * `position:relative` wrapper (`.ino-field__control-wrap`), not as a sibling of it — a
 * `position:absolute` element resolves against its nearest positioned ancestor, and a sibling of
 * the wrapper has none inside the component, so it used to anchor to whatever positioned ancestor
 * happened to exist on the *host page* instead. `appendTo="body"` (default `"self"`) instead
 * reparents the overlay to `document.body` at runtime and switches it to `position:fixed` with
 * coordinates from the shared `computeOverlayPlacement` (`../overlay/overlay-position.ts`, same
 * primitive `<ino-popover>`/`<ino-confirm-popup>`/`[inoTooltip]` use, `align: 'start'` so the panel
 * stays flush with the trigger's inline-start edge rather than centering) — the escape hatch for a
 * trigger inside a `overflow:hidden`/scrolling ancestor, which clips a `position:fixed` descendant
 * exactly as it clips a `position:absolute` one since both stay in the DOM subtree either way.
 *
 * Keyboard grid navigation follows the WAI-ARIA APG "Date Picker Dialog" pattern: a roving
 * `tabindex` (`focusedDate` — one cell is `tabindex="0"`, the rest `-1`), Left/Right = ±1 day,
 * Up/Down = ±1 week, Home/End = start/end of the visible week, PageUp/PageDown = ±1 month,
 * Shift+PageUp/PageDown = ±1 year, Enter/Space = select, Escape = close the overlay (no-op inline).
 *
 * Locale contract (SPEC.md §2): month/weekday names come from `Intl.DateTimeFormat(locale, …)`,
 * never a hardcoded English array, so a non-English `locale` input isn't silently mistranslated.
 * First-day-of-week reads `Intl.Locale(locale).weekInfo.firstDay` where the runtime supports it
 * (Chromium/Node 20+); falls back to Monday (`1`) — the common APAC/India convention this
 * repo's `en-IN` default targets — everywhere else.
 */
@Component({
  selector: 'ino-datepicker',
  standalone: true,
  imports: [CommonModule, InoFocusTrapDirective],
  templateUrl: './ino-datepicker.component.html',
  styleUrl: './ino-datepicker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-datepicker',
    '[attr.data-size]': 'size',
    '[attr.data-inline]': 'inline || null',
    '[class.ino-datepicker--loading]': 'loading',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoDatePickerComponent implements OnChanges, OnDestroy {
  @Input() label = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() placeholder = 'Select date';
  @Input() size: InoControlSize = 'default';
  @Input() selectionMode: InoDatePickerSelectionMode = 'single';
  @Input() value: Date | Date[] | null = null;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input({ transform: booleanAttribute }) showTime = false;
  @Input({ transform: booleanAttribute }) timeOnly = false;
  @Input({ transform: booleanAttribute }) showSeconds = false;
  @Input({ transform: booleanAttribute }) manualEntry = false;
  @Input() hourFormat: '12' | '24' = '24';
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() minTime: Date | null = null;
  @Input() maxTime: Date | null = null;
  @Input() disabledDates: Date[] = [];
  @Input() disabledDayOfWeek: number[] = [];
  @Input() locale = 'en-IN';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input() closeOnEscape = true;
  @Input() closeOnBackdrop = true;
  /** `'body'` reparents the overlay to `document.body` — see the class doc comment's "Overlay
   *  positioning" paragraph. */
  @Input() appendTo: 'self' | 'body' = 'self';

  @Output() valueChange = new EventEmitter<Date | Date[] | null>();
  @Output() openChange = new EventEmitter<boolean>();

  @ViewChild('grid') private gridRef?: ElementRef<HTMLElement>;
  @ViewChild('trigger') private triggerRef?: ElementRef<HTMLElement>;
  @ViewChild('overlay') private overlayRef?: ElementRef<HTMLElement>;

  protected readonly fieldId = `ino-datepicker-${++idCounter}`;
  protected readonly hintId = `${this.fieldId}-hint`;
  protected readonly errorId = `${this.fieldId}-error`;
  protected readonly headingId = `${this.fieldId}-heading`;

  protected panelOpen = false;
  protected view: InoDatePickerView = 'date';
  protected viewDate = startOfDay(new Date());
  protected focusedDate = startOfDay(new Date());
  protected yearRangeStart = Math.floor(new Date().getFullYear() / 12) * 12;
  protected manualInputValue = '';
  /** `appendTo="body"` only — `position:fixed` coordinates written onto the reparented overlay. */
  protected portalTop = 0;
  protected portalLeft = 0;

  private readonly cdr = inject(ChangeDetectorRef);

  /** Range mode, mid-pick: the first endpoint the user already clicked. */
  private pendingRangeStart: Date | null = null;
  /** The date/endpoint the time spinners currently edit — see SPEC.md §4. */
  private activeEditDate: Date | null = null;
  private previouslyFocused: HTMLElement | null = null;
  /** `appendTo="body"` only — whether the overlay is currently reparented + listened-to. */
  private portalActive = false;
  private readonly onViewportChange = (): void => this.updatePortalPosition();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.syncViewFromValue();
    }
    if (changes['inline']) {
      this.panelOpen = this.inline;
    }
  }

  // ---------------------------------------------------------------------
  // Open / close (overlay mode only)
  // ---------------------------------------------------------------------

  toggleOpen(): void {
    if (this.disabled || this.readonly || this.loading || this.inline) {
      return;
    }
    this.panelOpen ? this.requestClose() : this.openPanel();
  }

  openPanel(): void {
    if (this.inline || this.panelOpen) {
      return;
    }
    this.syncViewFromValue();
    this.panelOpen = true;
    this.openChange.emit(true);
    if (typeof document !== 'undefined') {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
    }
    // Zoneless: CD runs via the render scheduler, not a microtask, so a queued microtask would
    // fire before the *ngIf-gated grid renders and find nothing. Force the render synchronously.
    this.cdr.detectChanges();
    this.focusGrid();
    if (this.appendTo === 'body') {
      // *ngIf hasn't attached the overlay's view yet on this tick — deferred one macrotask past
      // the pending render, same reasoning as <ino-popover>'s reposition() doc comment.
      setTimeout(() => this.activatePortal());
    }
  }

  requestClose(): void {
    if (this.inline || !this.panelOpen) {
      return;
    }
    this.panelOpen = false;
    this.openChange.emit(false);
    this.pendingRangeStart = null;
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
    this.deactivatePortal();
  }

  ngOnDestroy(): void {
    this.deactivatePortal();
  }

  // ---------------------------------------------------------------------
  // appendTo="body" portal — reparent the overlay past any clipping/positioned ancestor and
  // drive it with `position:fixed` coordinates instead of the default in-flow `absolute`.
  // ---------------------------------------------------------------------

  private activatePortal(): void {
    const el = this.overlayRef?.nativeElement;
    if (!el || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }
    document.body.appendChild(el);
    this.portalActive = true;
    this.updatePortalPosition();
    window.addEventListener('resize', this.onViewportChange);
    window.addEventListener('scroll', this.onViewportChange, true);
  }

  private deactivatePortal(): void {
    if (!this.portalActive) {
      return;
    }
    this.portalActive = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onViewportChange);
      window.removeEventListener('scroll', this.onViewportChange, true);
    }
    const el = this.overlayRef?.nativeElement;
    if (typeof document !== 'undefined' && el?.parentNode === document.body) {
      // Angular's own view-destroy removeChild call still finds and removes this node correctly
      // wherever it currently lives; this pre-emptive removal only matters for the moment between
      // `panelOpen` flipping false and that destroy actually running, so the portaled panel doesn't
      // linger visibly at a stale position under `document.body`.
      document.body.removeChild(el);
    }
  }

  private updatePortalPosition(): void {
    const trigger = this.triggerRef?.nativeElement;
    const panel = this.overlayRef?.nativeElement;
    if (!trigger || !panel || typeof window === 'undefined') {
      return;
    }
    const placement = computeOverlayPlacement(
      trigger.getBoundingClientRect(),
      { width: panel.offsetWidth, height: panel.offsetHeight },
      'bottom',
      { width: window.innerWidth, height: window.innerHeight },
      8,
      8,
      'start',
    );
    this.portalTop = placement.top;
    this.portalLeft = placement.left;
    this.cdr.markForCheck();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape) {
      event.stopPropagation();
      this.requestClose();
    }
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.requestClose();
    }
  }

  // ---------------------------------------------------------------------
  // View drill: date grid <-> month grid <-> year grid
  // ---------------------------------------------------------------------

  showMonthPicker(): void {
    this.view = 'month';
  }

  showYearPicker(): void {
    this.yearRangeStart = Math.floor(this.viewDate.getFullYear() / 12) * 12;
    this.view = 'year';
  }

  pickMonth(monthIndex: number): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), monthIndex, 1);
    this.view = 'date';
  }

  pickYear(year: number): void {
    this.viewDate = new Date(year, this.viewDate.getMonth(), 1);
    this.view = 'month';
  }

  protected get years(): number[] {
    return Array.from({ length: 12 }, (_, i) => this.yearRangeStart + i);
  }

  yearRangeLabel(): string {
    return `${this.yearRangeStart} – ${this.yearRangeStart + 11}`;
  }

  yearPageBack(): void {
    this.yearRangeStart -= 12;
  }

  yearPageForward(): void {
    this.yearRangeStart += 12;
  }

  protected get monthNames(): string[] {
    const fmt = new Intl.DateTimeFormat(this.locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2000, i, 1)));
  }

  protected get headerLabel(): string {
    return new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(this.viewDate);
  }

  // ---------------------------------------------------------------------
  // Month navigation
  // ---------------------------------------------------------------------

  goToPreviousMonth(): void {
    this.viewDate = addMonths(this.viewDate, -1);
  }

  goToNextMonth(): void {
    this.viewDate = addMonths(this.viewDate, 1);
  }

  // ---------------------------------------------------------------------
  // Date grid
  // ---------------------------------------------------------------------

  private firstDayOfWeek(): number {
    try {
      // Intl.Locale#weekInfo is not yet in TS's DOM lib types; feature-detected at runtime.
      const info = (new Intl.Locale(this.locale) as unknown as { weekInfo?: { firstDay: number } })
        .weekInfo;
      if (info && typeof info.firstDay === 'number') {
        return info.firstDay % 7; // Intl: 1=Mon..7=Sun -> JS Date#getDay(): 0=Sun..6=Sat
      }
    } catch {
      /* Intl.Locale unsupported — fall through to the documented default. */
    }
    return 1; // Monday — this repo's en-IN / APAC default, see class doc comment §Locale.
  }

  protected get weekdayLabels(): string[] {
    const first = this.firstDayOfWeek();
    const fmt = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });
    // 1970-01-04 was a Sunday; offset from there to land on any weekday index.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(1970, 0, 4 + ((first + i) % 7))));
  }

  protected get weeks(): InoDateCell[][] {
    const first = this.firstDayOfWeek();
    const monthStart = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
    const offset = (monthStart.getDay() - first + 7) % 7;
    const gridStart = addDays(monthStart, -offset);

    const weeks: InoDateCell[][] = [];
    let cursor = gridStart;
    for (let w = 0; w < 6; w++) {
      const row: InoDateCell[] = [];
      for (let d = 0; d < 7; d++) {
        row.push(this.buildCell(cursor));
        cursor = addDays(cursor, 1);
      }
      weeks.push(row);
    }
    return weeks;
  }

  /** `weeks` always renders a fixed 6x7 grid, so the position IS the identity — reusing the
   *  row/cell at each index lets Angular patch bindings on the existing DOM node instead of
   *  destroying and recreating it every time `weeks` is re-evaluated (it returns fresh object
   *  literals on every read, since `buildCell` has no memoization). Without this, a later
   *  change-detection pass — e.g. the render scheduler's own follow-up tick after a manual
   *  `detectChanges()` in `onGridKeydown` — tears down and rebuilds the very cell that was
   *  just focused, dropping focus to <body> a frame later. */
  protected trackByIndex(index: number): number {
    return index;
  }

  /** Whether `date` falls within the fixed 6-week window the `weeks` getter renders for the
   *  current `viewDate`, including its leading/trailing overflow days from adjacent months. */
  private isDateInCurrentGrid(date: Date): boolean {
    const first = this.firstDayOfWeek();
    const monthStart = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
    const offset = (monthStart.getDay() - first + 7) % 7;
    const gridStart = addDays(monthStart, -offset);
    const gridEnd = addDays(gridStart, 41);
    return date >= gridStart && date <= gridEnd;
  }

  private buildCell(date: Date): InoDateCell {
    const today = sameDay(date, new Date());
    const disabled = this.isDateDisabled(date);
    const { start, end } = this.rangeEndpoints();
    return {
      date,
      day: date.getDate(),
      inMonth: date.getMonth() === this.viewDate.getMonth(),
      disabled,
      today,
      selected: this.isSelected(date),
      rangeStart: sameDay(start, date),
      rangeEnd: sameDay(end, date),
      inRange: !!start && !!end && date > startOfDay(start) && date < startOfDay(end),
      tabbable: sameDay(date, this.focusedDate),
    };
  }

  private rangeEndpoints(): { start: Date | null; end: Date | null } {
    if (this.selectionMode !== 'range' || !Array.isArray(this.value)) {
      return { start: null, end: null };
    }
    return { start: this.value[0] ?? null, end: this.value[1] ?? null };
  }

  isDateDisabled(date: Date): boolean {
    const day = startOfDay(date);
    if (this.minDate && day < startOfDay(this.minDate)) {
      return true;
    }
    if (this.maxDate && day > startOfDay(this.maxDate)) {
      return true;
    }
    if (this.disabledDayOfWeek.includes(day.getDay())) {
      return true;
    }
    return this.disabledDates.some((d) => sameDay(d, day));
  }

  private isSelected(date: Date): boolean {
    if (this.selectionMode === 'single') {
      return sameDay(this.value as Date | null, date);
    }
    if (Array.isArray(this.value)) {
      return this.value.some((d) => sameDay(d, date));
    }
    return false;
  }

  selectDate(cell: InoDateCell): void {
    if (cell.disabled || this.disabled || this.readonly) {
      return;
    }
    this.focusedDate = cell.date;
    if (!cell.inMonth) {
      this.viewDate = new Date(cell.date.getFullYear(), cell.date.getMonth(), 1);
    }

    if (this.selectionMode === 'single') {
      const next = this.mergeTime(cell.date, (this.value as Date | null) ?? undefined);
      this.value = next;
      this.activeEditDate = next;
      this.valueChange.emit(next);
      if (!this.showTime) {
        this.requestClose();
      }
      return;
    }

    if (this.selectionMode === 'range') {
      const current = Array.isArray(this.value) ? this.value : [];
      if (!this.pendingRangeStart || current.length !== 1) {
        const start = this.mergeTime(cell.date);
        this.pendingRangeStart = start;
        this.activeEditDate = start;
        this.value = [start];
        this.valueChange.emit(this.value);
        return;
      }
      const start = this.pendingRangeStart;
      const clicked = this.mergeTime(cell.date);
      const [rangeStart, rangeEnd] = clicked < start ? [clicked, start] : [start, clicked];
      this.pendingRangeStart = null;
      this.activeEditDate = rangeEnd;
      this.value = [rangeStart, rangeEnd];
      this.valueChange.emit(this.value);
      if (!this.showTime) {
        this.requestClose();
      }
      return;
    }

    // multiple
    const list = Array.isArray(this.value) ? [...this.value] : [];
    const idx = list.findIndex((d) => sameDay(d, cell.date));
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      const next = this.mergeTime(cell.date);
      list.push(next);
      this.activeEditDate = next;
    }
    list.sort((a, b) => a.getTime() - b.getTime());
    this.value = list;
    this.valueChange.emit(list);
  }

  private mergeTime(date: Date, from?: Date): Date {
    const merged = new Date(date);
    if (this.showTime || this.timeOnly) {
      const source = from ?? this.activeEditDate;
      const seconds = this.showSeconds ? (source?.getSeconds() ?? 0) : 0;
      merged.setHours(source?.getHours() ?? 0, source?.getMinutes() ?? 0, seconds, 0);
    } else {
      merged.setHours(0, 0, 0, 0);
    }
    return merged;
  }

  // ---------------------------------------------------------------------
  // Time picker
  // ---------------------------------------------------------------------

  protected get timeTarget(): Date {
    return this.activeEditDate ?? (this.selectionMode === 'single' ? (this.value as Date) : null) ?? this.viewDate;
  }

  protected get displayHour(): number {
    const h = this.timeTarget.getHours();
    if (this.hourFormat === '12') {
      const h12 = h % 12;
      return h12 === 0 ? 12 : h12;
    }
    return h;
  }

  protected get displayMinute(): number {
    return this.timeTarget.getMinutes();
  }

  protected get displaySecond(): number {
    return this.timeTarget.getSeconds();
  }

  protected get isPm(): boolean {
    return this.timeTarget.getHours() >= 12;
  }

  adjustHour(delta: number): void {
    const step = this.hourFormat === '12' ? 12 : 24;
    const next = new Date(this.timeTarget);
    next.setHours((next.getHours() + delta + step) % step);
    this.applyTimeEdit(next);
  }

  adjustMinute(delta: number): void {
    const next = new Date(this.timeTarget);
    next.setMinutes((next.getMinutes() + delta + 60) % 60);
    this.applyTimeEdit(next);
  }

  adjustSecond(delta: number): void {
    const next = new Date(this.timeTarget);
    next.setSeconds((next.getSeconds() + delta + 60) % 60);
    this.applyTimeEdit(next);
  }

  toggleAmPm(): void {
    const next = new Date(this.timeTarget);
    next.setHours((next.getHours() + 12) % 24);
    this.applyTimeEdit(next);
  }

  private applyTimeEdit(next: Date): void {
    if (this.isTimeDisabled(next)) {
      return;
    }
    this.activeEditDate = next;
    if (this.selectionMode === 'single') {
      this.value = next;
      this.valueChange.emit(next);
    } else if (Array.isArray(this.value) && this.value.length) {
      const list = [...this.value];
      const idx = list.findIndex((d) => sameDay(d, this.activeEditDate));
      if (idx >= 0) {
        list[idx] = next;
      } else {
        list[list.length - 1] = next;
      }
      list.sort((a, b) => a.getTime() - b.getTime());
      this.value = list;
      this.valueChange.emit(list);
    }
  }

  private isTimeDisabled(date: Date): boolean {
    if (!this.showTime && !this.timeOnly) {
      return false;
    }
    const timeValue = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
    if (this.minTime) {
      const minTimeValue = this.minTime.getHours() * 3600 + this.minTime.getMinutes() * 60 + this.minTime.getSeconds();
      if (timeValue < minTimeValue) {
        return true;
      }
    }
    if (this.maxTime) {
      const maxTimeValue = this.maxTime.getHours() * 3600 + this.maxTime.getMinutes() * 60 + this.maxTime.getSeconds();
      if (timeValue > maxTimeValue) {
        return true;
      }
    }
    return false;
  }

  confirmTime(): void {
    this.requestClose();
  }

  // ---------------------------------------------------------------------
  // Manual entry — typed date/time input with locale-aware parsing
  // ---------------------------------------------------------------------

  onManualInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.manualInputValue = input.value;
  }

  onManualInputBlur(): void {
    if (!this.manualInputValue.trim()) {
      return;
    }
    const parsed = this.parseManualInput(this.manualInputValue);
    if (parsed) {
      if (this.selectionMode === 'single') {
        this.value = parsed;
        this.valueChange.emit(parsed);
        this.syncViewFromValue();
      }
    }
  }

  private parseManualInput(input: string): Date | null {
    try {
      if (this.timeOnly) {
        return this.parseTimeInput(input);
      }
      const parts = input.split(/[\s,]+/);
      let dateStr = parts[0];
      let timeStr = parts[1];

      if (this.showTime && parts.length === 1 && /\d{1,2}:\d{2}/.test(input)) {
        timeStr = input;
        dateStr = new Intl.DateTimeFormat(this.locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      }

      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        const localeParsed = this.parseLocaleDate(input);
        if (localeParsed) {
          return localeParsed;
        }
        return null;
      }

      if (timeStr && (this.showTime || this.timeOnly)) {
        const time = this.parseTimeInput(timeStr);
        if (time) {
          parsed.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
        }
      }

      if (this.isDateDisabled(parsed) || this.isTimeDisabled(parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private parseTimeInput(input: string): Date | null {
    const match = input.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i);
    if (!match) {
      return null;
    }

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const ampm = match[4]?.toUpperCase();

    if (ampm) {
      if (ampm === 'PM' && hours < 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      return null;
    }

    const date = this.timeOnly ? new Date() : (this.value instanceof Date ? new Date(this.value) : new Date());
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  private parseLocaleDate(input: string): Date | null {
    try {
      const parts = input.split(/[\/\-\.]/);
      if (parts.length !== 3) {
        return null;
      }

      const now = new Date();
      let day: number, month: number, year: number;

      if (this.locale.startsWith('en-US')) {
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }

      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      const date = new Date(year, month, day);
      if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  }

  protected get inputMask(): string {
    if (this.timeOnly) {
      return this.showSeconds
        ? (this.hourFormat === '12' ? '99:99:99 AA' : '99:99:99')
        : (this.hourFormat === '12' ? '99:99 AA' : '99:99');
    }
    const dateMask = this.locale.startsWith('en-US') ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
    if (this.showTime) {
      const timeMask = this.showSeconds
        ? (this.hourFormat === '12' ? 'HH:MM:SS AA' : 'HH:MM:SS')
        : (this.hourFormat === '12' ? 'HH:MM AA' : 'HH:MM');
      return `${dateMask} ${timeMask}`;
    }
    return dateMask;
  }

  // ---------------------------------------------------------------------
  // Keyboard grid navigation — WAI-ARIA APG "Date Picker Dialog"
  // ---------------------------------------------------------------------

  onGridKeydown(event: KeyboardEvent, cell: InoDateCell): void {
    let next: Date | null = null;
    // PageUp/PageDown explicitly page the displayed month/year, so they must always move
    // `viewDate` to the target's month even when that month's overflow days already happen to
    // render inside the current 6-week grid (see the `weeks` getter). Arrow/Home/End only ever
    // move within or adjacent to the focused week, so for them the grid should re-paginate
    // ONLY when the target actually falls outside what's currently rendered.
    let forceRepaginate = false;
    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(this.focusedDate, -1);
        break;
      case 'ArrowRight':
        next = addDays(this.focusedDate, 1);
        break;
      case 'ArrowUp':
        next = addDays(this.focusedDate, -7);
        break;
      case 'ArrowDown':
        next = addDays(this.focusedDate, 7);
        break;
      case 'Home':
        next = addDays(this.focusedDate, -((this.focusedDate.getDay() - this.firstDayOfWeek() + 7) % 7));
        break;
      case 'End':
        next = addDays(
          this.focusedDate,
          6 - ((this.focusedDate.getDay() - this.firstDayOfWeek() + 7) % 7),
        );
        break;
      case 'PageUp':
        next = event.shiftKey ? addYears(this.focusedDate, -1) : addMonths(this.focusedDate, -1);
        forceRepaginate = true;
        break;
      case 'PageDown':
        next = event.shiftKey ? addYears(this.focusedDate, 1) : addMonths(this.focusedDate, 1);
        forceRepaginate = true;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDate(cell);
        return;
      default:
        return;
    }
    event.preventDefault();
    this.focusedDate = next;
    const resolved = next as Date;
    if (forceRepaginate || !this.isDateInCurrentGrid(resolved)) {
      this.viewDate = new Date(resolved.getFullYear(), resolved.getMonth(), 1);
    }
    // Same zoneless render-timing issue as openPanel(): force the [tabindex] update to commit
    // before querying for it, otherwise focusGrid() re-focuses the stale cell (or, after a month
    // page destroys it, focuses nothing and focus falls back to <body>).
    this.cdr.detectChanges();
    this.focusGrid();
  }

  private focusGrid(): void {
    const container = this.gridRef?.nativeElement;
    if (!container) {
      return;
    }
    const active = container.querySelector<HTMLElement>('[tabindex="0"]');
    active?.focus();
  }

  // ---------------------------------------------------------------------
  // Trigger display value (overlay mode)
  // ---------------------------------------------------------------------

  protected get displayValue(): string {
    const dateOpts: Intl.DateTimeFormatOptions = this.timeOnly ? {} : { year: 'numeric', month: 'short', day: 'numeric' };
    const timeOpts: Intl.DateTimeFormatOptions = (this.showTime || this.timeOnly)
      ? {
          hour: 'numeric',
          minute: '2-digit',
          ...(this.showSeconds ? { second: '2-digit' } : {}),
          hour12: this.hourFormat === '12'
        }
      : {};
    const fmt = new Intl.DateTimeFormat(this.locale, { ...dateOpts, ...timeOpts });

    if (this.selectionMode === 'single') {
      return this.value instanceof Date ? fmt.format(this.value) : '';
    }
    if (!Array.isArray(this.value) || !this.value.length) {
      return '';
    }
    if (this.selectionMode === 'range') {
      const [start, end] = this.value;
      if (start && end) {
        return `${fmt.format(start)} – ${fmt.format(end)}`;
      }
      return start ? `${fmt.format(start)} – …` : '';
    }
    // multiple
    if (this.value.length <= 2) {
      return this.value.map((d) => fmt.format(d)).join(', ');
    }
    return `${this.value.length} dates selected`;
  }

  private syncViewFromValue(): void {
    const anchor = this.selectionMode === 'single'
      ? (this.value as Date | null)
      : Array.isArray(this.value) && this.value.length
        ? this.value[this.value.length - 1]
        : null;
    if (anchor instanceof Date) {
      this.viewDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      this.focusedDate = startOfDay(anchor);
      this.activeEditDate = anchor;
    }
  }
}
