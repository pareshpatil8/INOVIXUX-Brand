import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type InoButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

/**
 * `ino-button` — attribute-selector component applied to a native `<button>` or `<a>`, not a
 * wrapper element. Contract: docs/brand/12-branding-completeness-checklist.md §8 build order #1
 * (INO-83). Kept on the native tag (Angular Material's `mat-button` pattern) rather than a custom
 * `<ino-button>` element so `type="submit"`, `disabled`, `href`, and native keyboard/focus
 * behavior all keep working for free — a wrapped element would have to re-implement all of that.
 *
 * `variant` is a closed union bound only to token-derived styles (09-design-system-standards.md
 * §5) — never a raw color:
 *   - `primary`   — filled with `--ino-gradient-accent`, the identity accent register.
 *   - `secondary` — bordered, surface-raised fill; for the non-primary action in a pair.
 *   - `ghost`     — transparent until hover; for tertiary/low-emphasis actions.
 *   - `icon`      — square, `--ino-target-comfortable` box, no visible label — caller MUST supply
 *                   a native `aria-label` (or `aria-labelledby`) directly on the host element,
 *                   same as any other icon-only button; this component does not infer one.
 *
 * `loading` shows an inert spinner and blocks interaction (implemented via `[attr.disabled]`, not
 * the `disabled` DOM property, so it applies correctly to both `<button>` and `<a>` hosts) without
 * removing the label from the DOM, so the accessible name doesn't disappear mid-action.
 *
 * Anchor-as-button caveat: `[attr.disabled]` on `<a>` blocks pointer clicks via CSS
 * (`pointer-events: none` below) but does not stop keyboard activation the way real `disabled`
 * does on `<button>` — if a disabled/loading state needs to be keyboard-safe on an anchor, guard
 * the `(click)` handler in the consuming template too.
 */
@Component({
  selector: 'button[ino-button], a[ino-button]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-button.component.html',
  styleUrl: './ino-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-btn',
    '[class.ino-btn--primary]': "variant === 'primary'",
    '[class.ino-btn--secondary]': "variant === 'secondary'",
    '[class.ino-btn--ghost]': "variant === 'ghost'",
    '[class.ino-btn--icon]': "variant === 'icon'",
    '[class.ino-btn--loading]': 'loading',
    '[attr.aria-busy]': 'loading || null',
    '[attr.disabled]': "(disabled || loading) ? '' : null",
  },
})
export class InoButtonComponent {
  @Input() variant: InoButtonVariant = 'primary';
  @Input() disabled = false;
  @Input() loading = false;
}
