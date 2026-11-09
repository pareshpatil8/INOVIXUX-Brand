import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoAvatarComponent,
  InoAvatarShape,
  INO_AVATAR_SIZES,
} from '../../../../components/avatar/ino-avatar.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-avatar` (INO-458).
 *
 * `image`/`initials` are plain strings with no enum `values` for the generated manifest to
 * iterate, so the generic `*ngComponentOutlet`-with-inputs renderer would only ever show empty
 * circles — the same "generic demo ships empty" gap `badge`/`dataview`/`tree` already hit.
 * Demonstrates the full content-form priority (image > initials > icon > fallback glyph), the
 * image-error fallback state, both shapes, all five sizes, and the decorative/informative
 * accessibility contract. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * The "valid image" sample is a static local asset (`public/assets/demos/avatar-sample.svg`,
 * same precedent as `favicon.svg`) — no network fetch, so the demo never depends on a
 * third-party host being reachable, and no inline markup in this file for the raw-colour lint
 * to trip on (a generic silhouette carries no theme meaning of its own).
 */
@Component({
  selector: 'app-avatar-demo',
  standalone: true,
  imports: [CommonModule, InoAvatarComponent],
  templateUrl: './avatar-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarDemoComponent {
  /** Both shapes for the variants/structure demo. */
  protected readonly shapes: InoAvatarShape[] = ['circle', 'square'];

  /** All five sizes (doc 26 §5 "xs–xl"). */
  protected readonly sizes = INO_AVATAR_SIZES;

  /** Static local asset — see class doc comment. */
  protected readonly sampleImage = '/assets/demos/avatar-sample.svg';

  /** Deliberately unreachable path — triggers the native `<img>` `(error)` event so the
   *  image-error fallback state (doc 26 §5) is demonstrated live rather than described. */
  protected readonly brokenImage = '/assets/does-not-exist-avatar.png';
}
