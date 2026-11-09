import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type InoImagecompareOrientation = 'horizontal' | 'vertical';

/**
 * `<ino-imagecompare>` — a before/after reveal slider over two overlaid images. Contract:
 * INO-489 (INO-31 B5, doc 26 §5 row "ino-imagecompare"); decisions record `SPEC.md` in this
 * directory. No PrimeNG parity component exists for this row.
 *
 * `value` (0–100, default `50`) is "percent of the **before** image shown" — see SPEC.md §2.
 * The before layer is clipped to `value%` along the active axis and sits over a full-bleed
 * after layer; dragging/keying the handle toward the end reveals more of "before."
 *
 * Reuses `<ino-slider>`'s single-thumb pointer-capture drag and APG slider keyboard contract
 * (ArrowRight/Up increments, ArrowLeft/Down decrements, PageUp/Down ×10, Home/End to 0/100),
 * scoped to one handle and one axis (SPEC.md §5).
 *
 * A11y: `role="slider"` on the handle with `aria-valuemin/max/now/valuetext/orientation`; both
 * `<img>` layers are `aria-hidden` since the handle's `aria-valuetext` is the one accessible
 * description of the comparison state (SPEC.md §1).
 */
@Component({
  selector: 'ino-imagecompare',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-imagecompare.component.html',
  styleUrl: './ino-imagecompare.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-imagecompare',
    '[attr.data-orientation]': 'orientation',
    '[class.ino-imagecompare--disabled]': 'disabled',
    '[class.ino-imagecompare--readonly]': 'readonly',
    '[class.ino-imagecompare--dragging]': 'isDragging',
    '[class.ino-imagecompare--at-bounds]': 'isAtBounds()',
    '[style.aspect-ratio]': 'aspectRatio',
  },
})
export class InoImagecompareComponent {
  @Input() beforeSrc = '';
  @Input() afterSrc = '';
  @Input() beforeAlt = '';
  @Input() afterAlt = '';

  /** Fixed corner captions — pinned to the frame's corners, not the clip boundary (SPEC.md §7). */
  @Input() beforeLabel = '';
  @Input() afterLabel = '';

  @Input() orientation: InoImagecompareOrientation = 'horizontal';

  /** Percent of the "before" image shown, `0`–`100`. See SPEC.md §2. */
  @Input({ transform: numberAttribute }) value = 50;
  @Output() valueChange = new EventEmitter<number>();

  @Input({ transform: numberAttribute }) step = 1;

  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Input() ariaLabel = 'Image comparison';

  /** CSS `aspect-ratio` value used while the consumer hasn't fixed the host's own block-size —
   *  see SPEC.md §3. */
  @Input() aspectRatio = '16 / 9';

  protected isDragging = false;
  private draggingFrameEl: HTMLElement | null = null;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  protected isAtBounds(): boolean {
    return this.value <= 0 || this.value >= 100;
  }

  private isRtl(): boolean {
    return getComputedStyle(this.elementRef.nativeElement).direction === 'rtl';
  }

  /** `value` is always "percent of the before image shown, from the logical inline-start" —
   *  `clip-path: inset()` only accepts physical sides, so the inline-start/end pair is resolved
   *  to left/right here under RTL, the same flip `<ino-splitter>`'s drag math documents for its
   *  own horizontal gutter (SPEC.md §4). The vertical (block) axis is direction-independent. */
  protected get clipPath(): string {
    const reveal = 100 - this.value;
    if (this.orientation === 'vertical') {
      return `inset(0 0 ${reveal}% 0)`;
    }
    return this.isRtl() ? `inset(0 0 0 ${reveal}%)` : `inset(0 ${reveal}% 0 0)`;
  }

  private clamp(raw: number): number {
    return Math.min(100, Math.max(0, raw));
  }

  private commit(raw: number): void {
    const clamped = this.clamp(raw);
    if (clamped === this.value) return;
    this.value = clamped;
    this.valueChange.emit(clamped);
  }

  private valueFromPointerEvent(event: PointerEvent, frameEl: HTMLElement): number {
    const rect = frameEl.getBoundingClientRect();
    if (this.orientation === 'vertical') {
      return this.clamp(((event.clientY - rect.top) / rect.height) * 100);
    }
    const fraction = this.isRtl()
      ? (rect.right - event.clientX) / rect.width
      : (event.clientX - rect.left) / rect.width;
    return this.clamp(fraction * 100);
  }

  protected onHandlePointerDown(event: PointerEvent, frameEl: HTMLElement): void {
    if (this.disabled || this.readonly) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging = true;
    this.draggingFrameEl = frameEl;
  }

  protected onHandlePointerMove(event: PointerEvent): void {
    if (this.disabled || this.readonly || !this.isDragging || !this.draggingFrameEl) return;
    this.commit(this.valueFromPointerEvent(event, this.draggingFrameEl));
  }

  protected onHandlePointerUp(event: PointerEvent): void {
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    this.isDragging = false;
    this.draggingFrameEl = null;
  }

  protected onFramePointerDown(event: PointerEvent, frameEl: HTMLElement): void {
    if (this.disabled || this.readonly) return;
    this.commit(this.valueFromPointerEvent(event, frameEl));
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        this.commit(this.value + this.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        this.commit(this.value - this.step);
        break;
      case 'PageUp':
        event.preventDefault();
        this.commit(this.value + this.step * 10);
        break;
      case 'PageDown':
        event.preventDefault();
        this.commit(this.value - this.step * 10);
        break;
      case 'Home':
        event.preventDefault();
        this.commit(0);
        break;
      case 'End':
        event.preventDefault();
        this.commit(100);
        break;
    }
  }

  protected get valueText(): string {
    return `${Math.round(this.value)}% before shown`;
  }

  protected get handleTabIndex(): number {
    return this.disabled ? -1 : 0;
  }
}
