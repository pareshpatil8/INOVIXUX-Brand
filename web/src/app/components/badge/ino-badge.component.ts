import { ChangeDetectionStrategy, Component, Input, booleanAttribute, numberAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Three badge variants per doc 26 §5: `dot` (simple indicator), `count` (numeric with overflow),
 *  `status` (labeled status indicator). */
export type InoBadgeVariant = 'dot' | 'count' | 'status';

/** Two-step size scale — doc 26 §5 "sm/md". Unlike avatar's 5-step scale, badge uses only two
 *  sizes aligned with dense/fluid density modes. */
export type InoBadgeSize = 'sm' | 'md';

/** Severity levels for status variant — maps to semantic color roles. */
export type InoBadgeSeverity = 'info' | 'success' | 'warning' | 'danger';

/**
 * `<ino-badge>` — INO-460 (INO-31 Phase B4). Parity benchmark: PrimeNG 22.1.1 `Badge`
 * (`specs/primeng/llms-22.1.1.txt`, `https://primeng.dev/badge`) — PrimeNG is a
 * benchmark, **not a runtime dependency**.
 *
 * Three usage modes per doc 26 §5:
 * 1. **Dot** — simple presence indicator (e.g. unread marker, online status)
 * 2. **Count** — numeric badge with 99+ overflow for counts ≥ 100
 * 3. **Status** — labeled status indicator with severity colors
 *
 * Can be used standalone or positioned on a child element. For positioned mode, the parent
 * container should be positioned (`position: relative`) — see SCSS for positioning logic.
 *
 * **A11y contract (doc 26 §5):**
 * - Count variant requires `ariaLabel` (e.g. "3 notifications") for screen readers
 * - Status variant label is already visible text, no extra label needed
 * - Dot variant is decorative, `aria-hidden` by default unless `ariaLabel` is provided
 * - Dynamic count changes should be announced via live region (caller responsibility — guidance
 *   in component docs)
 */
@Component({
  selector: 'ino-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-badge.component.html',
  styleUrl: './ino-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-badge',
    '[attr.data-variant]': 'variant',
    '[attr.data-size]': 'size',
    '[attr.data-severity]': 'severity',
    '[attr.role]': 'hostRole',
    '[attr.aria-label]': 'hostAriaLabel',
    '[attr.aria-hidden]': 'hostAriaHidden',
  },
})
export class InoBadgeComponent {
  /** Badge variant — `dot` (indicator only), `count` (numeric), `status` (labeled with severity). */
  @Input() variant: InoBadgeVariant = 'count';

  /** Size — `sm` (dense mode, 16px height) or `md` (fluid mode, 20px height). */
  @Input() size: InoBadgeSize = 'md';

  /** Severity color for `status` variant — maps to semantic `--ino-color-*` roles. Ignored for
   *  `dot` and `count` variants (those use fixed colors). */
  @Input() severity: InoBadgeSeverity = 'info';

  /** Numeric value for `count` variant. Displays "99+" when value ≥ 100 (doc 26 §5 "max+ overflow").
   *  Ignored for `dot` and `status` variants. */
  @Input({ transform: numberAttribute }) value: number | null = null;

  /** Status label text for `status` variant (e.g. "Active", "Pending"). Ignored for `dot` and
   *  `count` variants. */
  @Input() label = '';

  /** Accessible label — **required for `count` variant** (e.g. "3 new notifications"), optional
   *  for `dot` (makes it informative instead of decorative), ignored for `status` (visible label
   *  is already accessible text). */
  @Input() ariaLabel = '';

  /** Display count with 99+ overflow logic. */
  protected get displayValue(): string {
    if (this.variant !== 'count' || this.value === null) return '';
    return this.value >= 100 ? '99+' : String(this.value);
  }

  /** `status` is a visible text label, no extra role needed. `count` and `dot` are non-semantic
   *  markers, so they get `role="status"` (a live region role indicating dynamic state) when they
   *  carry meaning. Dot without ariaLabel is decorative and gets no role. */
  protected get hostRole(): string | null {
    if (this.variant === 'status') return null;
    if (this.variant === 'dot' && !this.ariaLabel) return null;
    return 'status';
  }

  /** `count` variant requires an accessible label (doc 26 §5). `status` has visible text, no extra
   *  label needed. `dot` without ariaLabel is decorative. */
  protected get hostAriaLabel(): string | null {
    if (this.variant === 'status') return null;
    if (this.variant === 'count') {
      return this.ariaLabel || (this.value !== null ? `${this.value}` : null);
    }
    return this.ariaLabel || null;
  }

  /** Dot without ariaLabel is decorative and hidden from assistive tech. Other variants are
   *  informative by default. */
  protected get hostAriaHidden(): boolean | null {
    if (this.variant === 'dot' && !this.ariaLabel) return true;
    return null;
  }
}
