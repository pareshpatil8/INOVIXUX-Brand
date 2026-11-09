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
 * Icon diameter scale (§2 contract row 3 — "sm/md/lg"). A local three-rung union rather than
 * `InoControlSize`, same reasoning as `InoKnobSize`/`InoSliderTrackSize`: the varying dimension
 * is a star glyph's font size, not a control height against a text baseline.
 */
export type InoRatingSize = 'sm' | 'md' | 'lg';

/**
 * `<ino-rating>` — a `role="radiogroup"` of stars, one radio per integer value from 1 to `count`.
 * Contract: INO-471 (INO-31 Phase B5, doc 26 §5 row `ino-rating`).
 *
 * Selection model: star *N*'s radio represents "rate N"; clicking or arrow-ing to it sets `value`
 * to `N` and every star at index <= `value` renders filled. This is the same native-radiogroup
 * selection semantics `ino-radio-group` uses — exactly one radio is `aria-checked`, picked by
 * `value` — not a drag/continuous input like `ino-slider`/`ino-knob`, because the row names it
 * explicitly: "radiogroup of stars".
 *
 * Hover-preview (row state): hovering any star previews the value that a click there would commit
 * (all stars up to the hovered index render filled) without mutating `value` — pointer-only, reset
 * on `pointerleave`.
 *
 * Clear/cancel toggle (row variant): when `cancelable` is true, clicking the star that already
 * matches `value` clears it to `0` instead of re-committing the same value — no separate cancel
 * icon (see SPEC.md §2 for why).
 *
 * Keyboard contract (APG radiogroup, same roving-tabindex shape as `ino-radio-group`'s native
 * inputs, hand-rolled here because the stars are rendered as styled spans, not native radios):
 * - ArrowRight/ArrowDown: move focus to and select the next star (clamped at `count`)
 * - ArrowLeft/ArrowUp: move focus to and select the previous star (clamped at `1`)
 * - Home/End: jump to the first/last star
 * - Space/Enter: select the focused star (redundant with Arrow selection, kept for direct Tab-in)
 *
 * WCAG 2.2 AA: `role="radiogroup"` with `aria-label`/`aria-describedby` on the container,
 * `role="radio"` + `aria-checked` + `aria-posinset`/`aria-setsize` per star — "value announced"
 * (the row's Labels cell) falls out of native radiogroup semantics: a screen reader landing on
 * the checked star announces its label and position, same as `ino-radio-group`.
 */
@Component({
  selector: 'ino-rating',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-rating.component.html',
  styleUrl: './ino-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-rating',
    '[attr.data-size]': 'size',
    '[class.ino-rating--disabled]': 'disabled',
    '[class.ino-rating--readonly]': 'readonly',
    '[class.ino-rating--invalid]': '!!error',
  },
})
export class InoRatingComponent {
  @Input() label = '';
  @Input() hint = '';
  @Input() error = '';
  /** Explicit accessible name when no visible `label` is wanted. `label` wins when both are set. */
  @Input() ariaLabel = '';
  @Input() size: InoRatingSize = 'md';
  /** Configurable star count (the row's "configurable star count" variant). */
  @Input({ transform: numberAttribute }) count = 5;
  /** Filled-star glyph. Plain text content, not an icon-font dependency — any single glyph or
   *  short string works ("custom icons" variant), e.g. a heart ('♥') for a "likes" rating. */
  @Input() iconFilled = '★';
  /** Empty-star glyph, rendered for every star above the current/previewed value. */
  @Input() iconEmpty = '☆';
  /** Clear/cancel toggle: clicking the already-selected star clears `value` to 0. */
  @Input({ transform: booleanAttribute }) cancelable = false;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  /** Integer 0..count — 0 means "unrated". No half-star increments (the row's "integer values"
   *  variant); see SPEC.md §7 for the deliberate omission vs PrimeNG's half-star support. */
  @Input({ transform: numberAttribute }) value = 0;
  @Output() valueChange = new EventEmitter<number>();

  protected readonly groupId = `ino-rating-${++idCounter}`;
  protected readonly hintId = `${this.groupId}-hint`;
  protected readonly errorId = `${this.groupId}-error`;

  /** Roving-tabindex focus position, 1-based, `null` until the first interaction. Separate from
   *  `value` so a cancel-to-clear click keeps focus on the clicked star rather than jumping to
   *  star 1, and so Tab-in before any interaction lands on the selected star (falling back to
   *  star 1 when `value` is 0). */
  private lastInteractedIndex: number | null = null;

  /** Pointer-hover preview index, `null` when no star is hovered. Never persisted to `value`. */
  protected hoverIndex: number | null = null;

  protected get stars(): number[] {
    return Array.from({ length: this.count }, (_, i) => i + 1);
  }

  /** The value a click/arrow at the current moment would render — the hover preview when one is
   *  active, otherwise the committed `value`. */
  protected get displayValue(): number {
    return this.hoverIndex ?? this.value;
  }

  protected get rovingIndex(): number {
    return this.lastInteractedIndex ?? (this.value > 0 ? this.value : 1);
  }

  protected get accessibleName(): string {
    return this.label || this.ariaLabel || 'Rating';
  }

  protected isFilled(star: number): boolean {
    return star <= this.displayValue;
  }

  protected starLabel(star: number): string {
    return `${star} ${star === 1 ? 'star' : 'stars'}`;
  }

  private commit(star: number, nextValue: number): void {
    this.lastInteractedIndex = star;
    if (nextValue === this.value) return;
    this.value = nextValue;
    this.valueChange.emit(nextValue);
  }

  onStarClick(star: number): void {
    if (this.disabled || this.readonly) return;
    this.commit(star, this.cancelable && star === this.value ? 0 : star);
  }

  onStarEnter(star: number): void {
    if (this.disabled || this.readonly) return;
    this.hoverIndex = star;
  }

  onGroupLeave(): void {
    this.hoverIndex = null;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const next = Math.min(this.count, this.rovingIndex + 1);
        this.commit(next, next);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const prev = Math.max(1, this.rovingIndex - 1);
        this.commit(prev, prev);
        break;
      }
      case 'Home':
        event.preventDefault();
        this.commit(1, 1);
        break;
      case 'End':
        event.preventDefault();
        this.commit(this.count, this.count);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        this.commit(this.rovingIndex, this.rovingIndex);
        break;
    }
  }
}
