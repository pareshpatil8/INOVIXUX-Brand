import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoAvatarComponent, InoAvatarShape, InoAvatarSize } from '../avatar/ino-avatar.component';

/** One avatar's content, as plain data — `ino-avatar-group` renders its own `<ino-avatar>`
 *  instances from this array rather than taking projected `<ino-avatar>` content, so the overlap
 *  and surplus-count layout below can be styled from this component's own stylesheet without an
 *  `::ng-deep` escape hatch (no sanctioned one exists, doc 16 §4.3 Layer 4 / N-11) — same
 *  data-driven shape `ino-meter-group` already uses for its own segment list. See SPEC.md §5. */
export interface InoAvatarGroupItem {
  image?: string;
  initials?: string;
  alt?: string;
}

/**
 * `<ino-avatar-group>` — the "(+group)" half of INO-458 (INO-31 Phase B4). Parity benchmark:
 * PrimeNG 22.1.1 `AvatarGroup` (`specs/primeng/llms-22.1.1.txt` line 32 companion,
 * `https://primeng.dev/avatar#group`) — a benchmark, not a runtime dependency. Contract:
 * `../avatar/SPEC.md` §5, full write-up: `docs/brand/06-angular-components/avatar.md` (shared
 * with `ino-avatar`, same override idiom `toast-container`/`alert.md` already uses).
 *
 * Overlapping avatars with an optional "+N" surplus count when `avatars.length` exceeds `max` —
 * doc 26 §5 row "group overlap + surplus count".
 */
@Component({
  selector: 'ino-avatar-group',
  standalone: true,
  imports: [CommonModule, InoAvatarComponent],
  templateUrl: './ino-avatar-group.component.html',
  styleUrl: './ino-avatar-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-avatar-group',
    role: 'group',
    '[attr.data-size]': 'size',
    '[attr.aria-label]': 'accessibleLabel',
  },
})
export class InoAvatarGroupComponent {
  @Input() avatars: InoAvatarGroupItem[] = [];
  /** Caps the number of avatars rendered; the rest collapse into one trailing "+N" surplus
   *  avatar. `null` (default) renders every item with no cap. */
  @Input() max: number | null = null;
  @Input() shape: InoAvatarShape = 'circle';
  @Input() size: InoAvatarSize = 'default';
  /** Accessible name override for the group's `role="group"` host; defaults to an auto-generated
   *  count summary (`accessibleLabel` below) — see `../avatar/SPEC.md` §5. */
  @Input() ariaLabel = '';

  protected get visibleAvatars(): InoAvatarGroupItem[] {
    return this.max != null ? this.avatars.slice(0, this.max) : this.avatars;
  }

  protected get surplusCount(): number {
    return this.max != null ? Math.max(0, this.avatars.length - this.max) : 0;
  }

  protected get accessibleLabel(): string {
    if (this.ariaLabel) return this.ariaLabel;
    const count = this.avatars.length;
    return count === 1 ? '1 avatar' : `${count} avatars`;
  }
}
