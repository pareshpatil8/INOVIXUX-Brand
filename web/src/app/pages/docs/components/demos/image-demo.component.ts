import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoImageComponent, INO_IMAGE_FITS } from '../../../../components/image/ino-image.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-image` (INO-487).
 *
 * `src`/`alt` are plain strings with no enum `values` for the generated manifest to iterate, and
 * the loading/error-fallback/zoomed states and the lightbox itself need deliberately-triggered
 * conditions (a slow/broken URL, an opened dialog) the generic `*ngComponentOutlet`-with-inputs
 * renderer can't produce — same "generic demo ships empty" gap `avatar`/`badge`/`dataview`
 * already hit. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * The "valid image" sample is a static local asset (`public/assets/demos/image-sample.svg`, same
 * precedent as `avatar-demo.component.ts`'s `avatar-sample.svg`) — no network fetch, so the demo
 * never depends on a third-party host being reachable.
 */
@Component({
  selector: 'app-image-demo',
  standalone: true,
  imports: [CommonModule, InoImageComponent],
  templateUrl: './image-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageDemoComponent {
  /** Every `object-fit` keyword (doc 26 §5 "fit modes"). */
  protected readonly fits = INO_IMAGE_FITS;

  /** Static local asset — see class doc comment. */
  protected readonly sampleImage = '/assets/demos/image-sample.svg';

  /** Deliberately unreachable path — triggers the native `<img>` `(error)` event live, so the
   *  error-fallback state (doc 26 §5) is demonstrated rather than described. */
  protected readonly brokenImage = '/assets/does-not-exist-image.png';
}
