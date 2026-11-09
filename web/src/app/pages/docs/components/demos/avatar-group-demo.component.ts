import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoAvatarGroupComponent,
  InoAvatarGroupItem,
} from '../../../../components/avatar-group/ino-avatar-group.component';
import { InoAvatarShape, INO_AVATAR_SIZES } from '../../../../components/avatar/ino-avatar.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-avatar-group` (INO-458).
 *
 * `avatars: InoAvatarGroupItem[]` hits the same recursive/array-input gap `treetable`/`menu`/
 * `tree` already hit — the generic renderer defaults it to `[]`, which would show nothing at
 * all. Demonstrates the overlap + surplus-count behaviour, sizing, shapes, and the
 * named-vs-unnamed-item accessibility split. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-avatar-group-demo',
  standalone: true,
  imports: [CommonModule, InoAvatarGroupComponent],
  templateUrl: './avatar-group-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarGroupDemoComponent {
  protected readonly shapes: InoAvatarShape[] = ['circle', 'square'];
  protected readonly sizes = INO_AVATAR_SIZES;

  /** Named people — each item's own `alt` means the group announces every name on request
   *  (SPEC.md §4). */
  protected readonly namedPeople: InoAvatarGroupItem[] = [
    { initials: 'JD', alt: 'Jane Doe' },
    { initials: 'AK', alt: 'Amir Khan' },
    { initials: 'RS', alt: 'Riya Shah' },
    { initials: 'TL', alt: 'Tom Lee' },
    { initials: 'MP', alt: 'Maria Perez' },
  ];

  /** No `alt` on any item — relies on the group's own one-line count summary instead of five
   *  redundant "Avatar" announcements (SPEC.md §4). */
  protected readonly unnamedCluster: InoAvatarGroupItem[] = [
    { initials: 'A' },
    { initials: 'B' },
    { initials: 'C' },
  ];
}
