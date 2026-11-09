import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

/** `circle` (the PrimeNG default, people) and `square` (the PrimeNG "square" prop, entities/orgs) —
 *  doc 26 §5 row "shapes". */
export type InoAvatarShape = 'circle' | 'square';

/** Five-step scale, not the shared Wave 0 `InoControlSize` (sm/default/lg) — doc 26 §5 names
 *  "xs–xl" explicitly for this component, and an avatar is decorative media sized by content
 *  density (a comment-thread row vs. a profile header), not a form control height. See SPEC.md §2. */
export type InoAvatarSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl';
export const INO_AVATAR_SIZES: readonly InoAvatarSize[] = ['xs', 'sm', 'default', 'lg', 'xl'] as const;

/**
 * `<ino-avatar>` — INO-458 (INO-31 Phase B4). Parity benchmark: PrimeNG 22.1.1 `Avatar`
 * (`specs/primeng/llms-22.1.1.txt` line 32, `https://primeng.dev/avatar`) — PrimeNG is a
 * benchmark, **not a runtime dependency**. Contract: SPEC.md, full write-up:
 * `docs/brand/06-angular-components/avatar.md`.
 *
 * Three content forms, resolved in a fixed priority order so a caller can supply more than one
 * input and still get one sane result: `image` (until it errors) > `initials` > projected
 * `[icon]` content > a built-in generic-person glyph. See SPEC.md §1.
 *
 * Presentational and non-interactive — no `tabindex`, no click handling, same precedent as
 * `ino-tag`/`ino-meter-group`. See SPEC.md §3 for the carried/N-A state breakdown.
 */
@Component({
  selector: 'ino-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-avatar.component.html',
  styleUrl: './ino-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-avatar',
    '[attr.data-shape]': 'shape',
    '[attr.data-size]': 'size',
    '[attr.role]': 'hostRole',
    '[attr.aria-label]': 'hostAriaLabel',
    '[attr.aria-hidden]': 'decorative || null',
  },
})
export class InoAvatarComponent implements OnChanges {
  /** Image URL. Takes priority over `initials`/`icon` until it fails to load (§ `imageFailed`
   *  below) — doc 26 §5's "image-error fallback" state. */
  @Input() image = '';
  /** Explicit initials text, e.g. `'JD'`. Never derived from `alt` automatically — locale-aware
   *  "first letter of each word" extraction is a caller decision, not this component's; see
   *  SPEC.md §1. */
  @Input() initials = '';
  /** Accessible name for the `image` form (native `<img alt>`) and the fallback accessible name
   *  for the `initials`/`icon` forms when `ariaLabel` is not set. See SPEC.md §4. */
  @Input() alt = '';
  /** Explicit accessible name override for the `initials`/`icon` forms, e.g. `'Jane Doe, offline'`
   *  when the initials alone don't carry enough context. Ignored for the `image` form (native
   *  `alt` already carries the name there) and when `decorative` is set. */
  @Input() ariaLabel = '';
  @Input() shape: InoAvatarShape = 'circle';
  @Input() size: InoAvatarSize = 'default';
  /** Marks the avatar purely decorative — `aria-hidden`, no accessible name in any form. For an
   *  avatar sitting next to a name/label that already announces the same information (e.g. a
   *  table row's own text column), so the avatar doesn't double-announce it. See SPEC.md §4. */
  @Input({ transform: booleanAttribute }) decorative = false;

  protected imageFailed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['image']) this.imageFailed = false;
  }

  protected onImageError(): void {
    this.imageFailed = true;
  }

  protected get showImage(): boolean {
    return !!this.image && !this.imageFailed;
  }

  protected get showInitials(): boolean {
    return !this.showImage && !!this.initials;
  }

  /** `null` for the `image` form — the native `<img>` already carries the implicit `img` role
   *  (or `presentation` when `alt=""`); adding `role="img"` to the host as well would be a
   *  redundant double node in the accessibility tree. The `initials`/icon forms have no native
   *  semantics of their own, so the host supplies `role="img"` instead. */
  protected get hostRole(): string | null {
    if (this.decorative || this.showImage) return null;
    return 'img';
  }

  /** `null` for the `image` form (native `alt` carries the name there) and when `decorative`.
   *  Otherwise falls back to a generic `'Avatar'` rather than shipping silently nameless —
   *  informative-by-default, matching the component's non-`decorative` default. See SPEC.md §4. */
  protected get hostAriaLabel(): string | null {
    if (this.decorative || this.showImage) return null;
    return this.ariaLabel || this.alt || 'Avatar';
  }
}
