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
 * Dial diameter scale (§2 contract row 3 — "dial sm/md/lg"). A local three-rung union rather than
 * `InoControlSize`: a knob's varying dimension is the dial *diameter*, not a control *height* —
 * like `InoSliderTrackSize` there is no text baseline to align, so the fleet-wide height scale
 * doesn't map. Three rungs because the spec row (doc 26 §5) asks for exactly three.
 */
export type InoKnobSize = 'sm' | 'md' | 'lg';

/** The dial's arc geometry, shared by the component and its template helpers. The dial sweeps
 *  270° clockwise from bottom-left (135° in SVG coordinates, where +y is down so angles grow
 *  clockwise) to bottom-right (405° ≡ 45°), leaving the conventional bottom gap. */
const ARC_START_DEG = 135;
const ARC_SWEEP_DEG = 270;
const DIAL_CENTER = 50;
const DIAL_RADIUS = 40;

/**
 * `<ino-knob>` — circular dial input. Contract: INO-469 (INO-31 Phase B5, doc 26 §5 row
 * `ino-knob`).
 *
 * Rendering: a single SVG (`viewBox 0 0 100 100`) holding a full-sweep range arc, a value arc
 * from `min` to `value`, and a centre value label. All geometry is unit-space; the rendered
 * diameter comes from the host's `--ino-knob-dial` custom property (§2 row 3, dial sm/md/lg), so
 * the SVG scales without any size-dependent math.
 *
 * Pointer interaction: `pointerdown` on the dial captures the pointer (`setPointerCapture`) —
 * the same drag-handle pattern as `ino-slider` — then every `pointermove` maps the pointer's
 * angle around the dial centre to a value. Angles inside the 90° bottom gap snap to the nearer
 * bound (split at the gap's midpoint), so a drag can't jump from max to min across the gap.
 *
 * Keyboard contract (APG slider pattern):
 * - ArrowRight/ArrowUp: increment by `step`
 * - ArrowLeft/ArrowDown: decrement by `step`
 * - PageUp/PageDown: increment/decrement by `step * 10`
 * - Home/End: jump to `min`/`max`
 *
 * WCAG 2.2 AA: `role="slider"` on the focusable dial element, `aria-valuemin/max/now`,
 * `aria-valuetext` carrying the formatted `valueTemplate` output (the spec row names
 * `aria-valuetext` explicitly: a templated display like "75%" must be what the screen reader
 * announces, not the bare number), `aria-label` from `label`/`ariaLabel`,
 * `aria-disabled`/`aria-readonly`, visible focus ring via `:focus-visible`.
 */
@Component({
  selector: 'ino-knob',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-knob.component.html',
  styleUrl: './ino-knob.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-knob',
    '[attr.data-size]': 'size',
    '[class.ino-knob--disabled]': 'disabled',
    '[class.ino-knob--readonly]': 'readonly',
    '[class.ino-knob--invalid]': '!!error',
    '[class.ino-knob--dragging]': 'isDragging',
    '[class.ino-knob--at-min]': 'isAtMin',
    '[class.ino-knob--at-max]': 'isAtMax',
  },
})
export class InoKnobComponent {
  @Input() label = '';
  @Input() hint = '';
  @Input() error = '';
  /** Explicit accessible name when no visible `label` is wanted (icon-only/compact usage). The
   *  spec row's "Labels" cell names both: value label + `aria-label`. `label` wins when set. */
  @Input() ariaLabel = '';
  @Input() size: InoKnobSize = 'md';
  @Input({ transform: numberAttribute }) min = 0;
  @Input({ transform: numberAttribute }) max = 100;
  @Input({ transform: numberAttribute }) step = 1;
  /** Centre-label format string; `{value}` is replaced with the current value. Also the source
   *  of `aria-valuetext`, so a template like `{value}%` is announced as "75%". */
  @Input() valueTemplate = '{value}';
  @Input({ transform: booleanAttribute }) showValue = true;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Input({ transform: numberAttribute }) value = 0;
  @Output() valueChange = new EventEmitter<number>();

  protected readonly knobId = `ino-knob-${++idCounter}`;
  protected readonly hintId = `${this.knobId}-hint`;
  protected readonly errorId = `${this.knobId}-error`;

  protected isDragging = false;

  /** The dial SVG element captured on `pointerdown`, reused as the geometry reference for every
   *  `pointermove` of the drag — same no-ViewChild pattern as `ino-slider.draggingTrackEl`. */
  private draggingDialEl: Element | null = null;

  protected get clampedValue(): number {
    return Math.min(this.max, Math.max(this.min, this.value));
  }

  protected get isAtMin(): boolean {
    return this.clampedValue <= this.min;
  }

  protected get isAtMax(): boolean {
    return this.clampedValue >= this.max;
  }

  protected get fraction(): number {
    if (this.max === this.min) return 0;
    return (this.clampedValue - this.min) / (this.max - this.min);
  }

  /** `valueTemplate` with `{value}` substituted — the centre label text and `aria-valuetext`. */
  protected get formattedValue(): string {
    return this.valueTemplate.replace('{value}', String(this.clampedValue));
  }

  protected get accessibleName(): string {
    return this.label || this.ariaLabel || 'Value';
  }

  private pointAt(deg: number): { x: number; y: number } {
    const rad = (deg * Math.PI) / 180;
    return {
      x: DIAL_CENTER + DIAL_RADIUS * Math.cos(rad),
      y: DIAL_CENTER + DIAL_RADIUS * Math.sin(rad),
    };
  }

  /** SVG arc path from the sweep start to `fraction` of the full 270° sweep. */
  private arcPath(fraction: number): string {
    const sweep = ARC_SWEEP_DEG * fraction;
    const from = this.pointAt(ARC_START_DEG);
    const to = this.pointAt(ARC_START_DEG + sweep);
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${from.x.toFixed(3)} ${from.y.toFixed(3)} A ${DIAL_RADIUS} ${DIAL_RADIUS} 0 ${largeArc} 1 ${to.x.toFixed(3)} ${to.y.toFixed(3)}`;
  }

  protected get rangePath(): string {
    return this.arcPath(1);
  }

  protected get valuePath(): string {
    return this.arcPath(this.fraction);
  }

  /** Indicator dot centre at the current value's angle. */
  protected get indicatorPoint(): { x: number; y: number } {
    return this.pointAt(ARC_START_DEG + ARC_SWEEP_DEG * this.fraction);
  }

  private clampToStep(raw: number): number {
    const stepped = Math.round((raw - this.min) / this.step) * this.step + this.min;
    return Math.min(this.max, Math.max(this.min, stepped));
  }

  private commit(rawValue: number): void {
    const next = this.clampToStep(rawValue);
    if (next === this.value) return;
    this.value = next;
    this.valueChange.emit(next);
  }

  /** Map a pointer position to a value via its angle around the dial centre. Angles that fall in
   *  the 90° bottom gap snap to the nearer bound, split at the gap's midpoint (450° in the
   *  normalized [135°, 495°) range), so a drag never wraps across the gap. */
  private valueFromPointerEvent(event: PointerEvent, dialEl: Element): number {
    const rect = dialEl.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (deg < ARC_START_DEG) deg += 360;
    const end = ARC_START_DEG + ARC_SWEEP_DEG;
    if (deg > end) deg = deg > end + (360 - ARC_SWEEP_DEG) / 2 ? ARC_START_DEG : end;
    const fraction = (deg - ARC_START_DEG) / ARC_SWEEP_DEG;
    return this.min + fraction * (this.max - this.min);
  }

  onDialPointerDown(event: PointerEvent, dialEl: Element): void {
    if (this.disabled || this.readonly) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging = true;
    this.draggingDialEl = dialEl;
    this.commit(this.valueFromPointerEvent(event, dialEl));
  }

  onDialPointerMove(event: PointerEvent): void {
    if (this.disabled || this.readonly || !this.isDragging || !this.draggingDialEl) return;
    this.commit(this.valueFromPointerEvent(event, this.draggingDialEl));
  }

  onDialPointerUp(event: PointerEvent): void {
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    this.isDragging = false;
    this.draggingDialEl = null;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly) return;

    const current = this.clampedValue;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        this.commit(current + this.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        this.commit(current - this.step);
        break;
      case 'PageUp':
        event.preventDefault();
        this.commit(current + this.step * 10);
        break;
      case 'PageDown':
        event.preventDefault();
        this.commit(current - this.step * 10);
        break;
      case 'Home':
        event.preventDefault();
        this.commit(this.min);
        break;
      case 'End':
        event.preventDefault();
        this.commit(this.max);
        break;
    }
  }
}
