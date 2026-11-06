import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoLabelComponent } from '../label/ino-label.component';

let idCounter = 0;

/**
 * Track thickness scale (§2 contract row 3 — "track sm/md"). Deliberately **not**
 * `InoControlSize` (`sm | default | lg`): a slider's varying dimension is track *thickness*, not a
 * control *height* — there is no text baseline to align, so the three-rung height scale used by
 * every text-entry control doesn't map cleanly here. The spec row (doc 26 §5) asks for exactly two
 * rungs, so this is a local, narrower union rather than a mis-fitted reuse of the fleet-wide scale.
 */
export type InoSliderTrackSize = 'sm' | 'md';

/** Which thumb is active during a drag/keyboard interaction. `'lower'` is the only thumb in
 * single mode; range mode uses both. */
export type InoSliderThumb = 'lower' | 'upper';

/**
 * `<ino-slider>` — single-value or dual-thumb range slider. Contract: INO-408 (INO-31 Phase B1,
 * doc 26 §5 row `ino-slider`).
 *
 * `range={true}` switches `value` from a plain `number` to a `[number, number]` tuple — the same
 * union-by-mode-flag shape `ino-autocomplete`'s `multiple` input uses for its `value: string |
 * string[]` (see that component's doc comment). The lower thumb is clamped to never exceed the
 * upper thumb and vice versa; thumbs cannot cross.
 *
 * Pointer interaction: `pointerdown` on a thumb captures the pointer (`setPointerCapture`) so
 * `pointermove`/`pointerup` keep firing on that element even if the cursor leaves it — the standard
 * drag-handle pattern, avoids a document-level listener. `pointerdown` on the track itself jumps the
 * nearest thumb to that position (click-to-set), matching native `<input type=range>` behavior.
 *
 * Keyboard contract (APG slider pattern), per thumb:
 * - ArrowRight/ArrowUp: increment by `step`
 * - ArrowLeft/ArrowDown: decrement by `step`
 * - PageUp/PageDown: increment/decrement by `step * 10`
 * - Home/End: jump to `min`/`max`
 *
 * WCAG 2.2 AA: `role="slider"` on **each thumb** (not the host), `aria-valuemin/max/now`,
 * `aria-orientation`, `aria-label` derived from `label` (plus "minimum"/"maximum" in range mode),
 * `aria-disabled`/`aria-readonly`, visible focus ring via `:focus-visible`.
 */
@Component({
  selector: 'ino-slider',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-slider.component.html',
  styleUrl: './ino-slider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-slider',
    '[attr.data-track-size]': 'trackSize',
    '[class.ino-slider--vertical]': 'vertical',
    '[class.ino-slider--disabled]': 'disabled',
    '[class.ino-slider--readonly]': 'readonly',
    '[class.ino-slider--invalid]': '!!error',
    '[class.ino-slider--dragging]': 'isDragging',
    '[class.ino-slider--at-min]': 'isAnyThumbAtMin()',
    '[class.ino-slider--at-max]': 'isAnyThumbAtMax()',
  },
})
export class InoSliderComponent {
  @Input() label = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() trackSize: InoSliderTrackSize = 'md';
  @Input({ transform: numberAttribute }) min = 0;
  @Input({ transform: numberAttribute }) max = 100;
  @Input({ transform: numberAttribute }) step = 1;
  @Input({ transform: booleanAttribute }) range = false;
  @Input({ transform: booleanAttribute }) vertical = false;
  @Input({ transform: booleanAttribute }) showMarks = false;
  @Input({ transform: booleanAttribute }) showTooltip = false;
  @Input({ transform: booleanAttribute }) showMinMaxLabels = false;
  @Input({ transform: booleanAttribute }) showValueLabel = false;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  /** Plain `number` in single mode (default), `[number, number]` when `range={true}`. Mirrors
   *  `ino-autocomplete`'s `value: string | string[]` mode-flag convention. */
  @Input() value: number | [number, number] = 0;
  @Output() valueChange = new EventEmitter<number | [number, number]>();

  protected readonly sliderId = `ino-slider-${++idCounter}`;
  protected readonly hintId = `${this.sliderId}-hint`;
  protected readonly errorId = `${this.sliderId}-error`;

  protected isDragging = false;
  protected activeThumb: InoSliderThumb | null = null;

  /** The pointer-captured element for the in-progress drag (the thumb button itself). Reused as
   *  the geometry reference in {@link valueFromPointerEvent} via its closest track ancestor, so no
   *  `ViewChild`/template-ref plumbing is needed for the common drag path; `onTrackPointerDown`
   *  passes the track element directly since a click-to-jump has no captured thumb yet. */
  private draggingTrackEl: HTMLElement | null = null;

  protected get lowerValue(): number {
    return this.range ? (this.value as [number, number])[0] : (this.value as number);
  }

  protected get upperValue(): number | null {
    return this.range ? (this.value as [number, number])[1] : null;
  }

  protected percentFor(val: number): number {
    if (this.max === this.min) return 0;
    return ((val - this.min) / (this.max - this.min)) * 100;
  }

  /** Fill span between 0 and the value (single mode) or between the two thumbs (range mode). */
  protected get fillStartPercent(): number {
    return this.range ? this.percentFor(this.lowerValue) : 0;
  }

  protected get fillEndPercent(): number {
    return this.range ? this.percentFor(this.upperValue as number) : this.percentFor(this.lowerValue);
  }

  protected get marks(): number[] {
    if (!this.showMarks || this.step <= 0) return [];
    const marks: number[] = [];
    const count = Math.round((this.max - this.min) / this.step);
    // Guard against a caller pairing `showMarks` with a very small step relative to the range —
    // rendering thousands of tick nodes would be a self-inflicted perf/visual problem, not a real
    // use case, so cap and let the caller pick a coarser `step` for marks instead.
    const cappedCount = Math.min(count, 100);
    for (let i = 0; i <= cappedCount; i++) {
      marks.push(this.min + i * this.step);
    }
    return marks;
  }

  protected isAtMin(val: number): boolean {
    return val <= this.min;
  }

  protected isAtMax(val: number): boolean {
    return val >= this.max;
  }

  protected isAnyThumbAtMin(): boolean {
    return this.isAtMin(this.lowerValue) || (this.range && this.isAtMin(this.upperValue as number));
  }

  protected isAnyThumbAtMax(): boolean {
    return this.isAtMax(this.lowerValue) || (this.range && this.isAtMax(this.upperValue as number));
  }

  protected ariaLabelFor(thumb: InoSliderThumb): string {
    if (!this.range) return this.label || 'Value';
    const suffix = thumb === 'lower' ? 'minimum' : 'maximum';
    return this.label ? `${this.label} (${suffix})` : `${suffix === 'minimum' ? 'Minimum' : 'Maximum'} value`;
  }

  protected valueOf(thumb: InoSliderThumb): number {
    return thumb === 'lower' ? this.lowerValue : (this.upperValue as number);
  }

  private clampToStep(raw: number): number {
    const stepped = Math.round((raw - this.min) / this.step) * this.step + this.min;
    return Math.min(this.max, Math.max(this.min, stepped));
  }

  private commit(thumb: InoSliderThumb, rawValue: number): void {
    const clamped = this.clampToStep(rawValue);

    if (!this.range) {
      this.value = clamped;
      this.valueChange.emit(clamped);
      return;
    }

    const [lower, upper] = this.value as [number, number];
    if (thumb === 'lower') {
      const next: [number, number] = [Math.min(clamped, upper), upper];
      this.value = next;
      this.valueChange.emit(next);
    } else {
      const next: [number, number] = [lower, Math.max(clamped, lower)];
      this.value = next;
      this.valueChange.emit(next);
    }
  }

  private valueFromPointerEvent(event: PointerEvent, trackEl: HTMLElement): number {
    const rect = trackEl.getBoundingClientRect();
    const fraction = this.vertical
      ? (rect.bottom - event.clientY) / rect.height
      : (event.clientX - rect.left) / rect.width;
    const clampedFraction = Math.min(1, Math.max(0, fraction));
    return this.min + clampedFraction * (this.max - this.min);
  }

  onThumbPointerDown(event: PointerEvent, thumb: InoSliderThumb, trackEl: HTMLElement): void {
    if (this.disabled || this.readonly) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging = true;
    this.activeThumb = thumb;
    this.draggingTrackEl = trackEl;
  }

  onThumbPointerMove(event: PointerEvent, thumb: InoSliderThumb): void {
    if (this.disabled || this.readonly || !this.isDragging || this.activeThumb !== thumb || !this.draggingTrackEl) return;
    this.commit(thumb, this.valueFromPointerEvent(event, this.draggingTrackEl));
  }

  onThumbPointerUp(event: PointerEvent): void {
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    this.isDragging = false;
    this.activeThumb = null;
    this.draggingTrackEl = null;
  }

  onTrackPointerDown(event: PointerEvent, trackEl: HTMLElement): void {
    if (this.disabled || this.readonly) return;
    const target = this.valueFromPointerEvent(event, trackEl);
    const thumb: InoSliderThumb =
      this.range && Math.abs(target - (this.upperValue as number)) < Math.abs(target - this.lowerValue)
        ? 'upper'
        : 'lower';
    this.commit(thumb, target);
  }

  onKeyDown(event: KeyboardEvent, thumb: InoSliderThumb): void {
    if (this.disabled || this.readonly) return;

    const current = this.valueOf(thumb);
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        this.commit(thumb, current + this.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        this.commit(thumb, current - this.step);
        break;
      case 'PageUp':
        event.preventDefault();
        this.commit(thumb, current + this.step * 10);
        break;
      case 'PageDown':
        event.preventDefault();
        this.commit(thumb, current - this.step * 10);
        break;
      case 'Home':
        event.preventDefault();
        this.commit(thumb, this.min);
        break;
      case 'End':
        event.preventDefault();
        this.commit(thumb, this.max);
        break;
    }
  }

  onThumbFocus(thumb: InoSliderThumb): void {
    this.activeThumb = thumb;
  }

  onThumbBlur(): void {
    if (!this.isDragging) this.activeThumb = null;
  }

  protected get displayValueLabel(): string {
    return this.range ? `${this.lowerValue} – ${this.upperValue}` : `${this.lowerValue}`;
  }
}
