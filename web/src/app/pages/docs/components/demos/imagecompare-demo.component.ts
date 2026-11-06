import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoImagecompareComponent } from '../../../../components/imagecompare/ino-imagecompare.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-imagecompare` (INO-489).
 *
 * The generic renderer ships every `string` input as `''` and can't enumerate the `orientation`
 * type-alias union, so the live example would render two empty, unstyled image layers with no
 * orientation axis at all. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * Images are local static SVG assets (`imagecompare-before.svg` / `imagecompare-after.svg`), not
 * a network fetch — same "no network dependency for a demo" posture `image-demo.component.ts`
 * documents for its own sample.
 */
@Component({
  selector: 'app-imagecompare-demo',
  standalone: true,
  imports: [CommonModule, InoImagecompareComponent],
  templateUrl: './imagecompare-demo.component.html',
  styleUrls: ['./demo-shared.scss'],
  styles: [
    `
      .imagecompare-stage {
        max-width: 420px;
        margin-inline: auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagecompareDemoComponent {
  protected readonly beforeSrc = '/assets/demos/imagecompare-before.svg';
  protected readonly afterSrc = '/assets/demos/imagecompare-after.svg';

  protected horizontalValue = 50;
  protected verticalValue = 50;
  protected disabledValue = 35;
}
