import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoGalleriaComponent } from '../../../../components/galleria/ino-galleria.component';
import { InoGalleriaItemComponent } from '../../../../components/galleria/ino-galleria-item.component';

@Component({
  selector: 'app-galleria-demo',
  standalone: true,
  imports: [CommonModule, InoGalleriaComponent, InoGalleriaItemComponent],
  template: `
    <div class="demo-section">
      <h3>Basic Gallery</h3>
      <ino-galleria ariaLabel="Gallery demo">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Loading State</h3>
      <ino-galleria [loading]="true" ariaLabel="Loading gallery">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Autoplay Enabled</h3>
      <ino-galleria [autoplay]="true" [autoplayInterval]="3000" ariaLabel="Autoplay gallery">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Compact (Small)</h3>
      <ino-galleria size="sm" ariaLabel="Compact gallery">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Large</h3>
      <ino-galleria size="lg" ariaLabel="Large gallery">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Without Thumbnails</h3>
      <ino-galleria [showThumbnails]="false" ariaLabel="Gallery without thumbnails">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Without Indicators</h3>
      <ino-galleria [showIndicators]="false" ariaLabel="Gallery without indicators">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Disabled Fullscreen</h3>
      <ino-galleria [showFullscreen]="false" ariaLabel="Gallery without fullscreen">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Disabled State</h3>
      <ino-galleria disabled ariaLabel="Disabled gallery">
        <ino-galleria-item
          *ngFor="let item of images"
          [src]="item.src"
          [alt]="item.alt"
          [caption]="item.caption"
        >
        </ino-galleria-item>
      </ino-galleria>
    </div>

    <div class="demo-section">
      <h3>Gallery - Density Comparison</h3>
      <p class="demo-note">
        Density is read from the nearest ancestor's <code>[data-density]</code> (SPEC.md §10),
        not a component input — <code>dense</code> shrinks controls to 36px and thumbnails to
        64px, <code>fluid</code> (the default) uses 48px controls and 96px thumbnails.
      </p>
      <div class="density-row">
        <div data-density="dense" class="density-pane">
          <p class="density-label">dense</p>
          <ino-galleria ariaLabel="Dense gallery">
            <ino-galleria-item
              *ngFor="let item of images"
              [src]="item.src"
              [alt]="item.alt"
              [caption]="item.caption"
            >
            </ino-galleria-item>
          </ino-galleria>
        </div>
        <div data-density="fluid" class="density-pane">
          <p class="density-label">fluid</p>
          <ino-galleria ariaLabel="Fluid gallery">
            <ino-galleria-item
              *ngFor="let item of images"
              [src]="item.src"
              [alt]="item.alt"
              [caption]="item.caption"
            >
            </ino-galleria-item>
          </ino-galleria>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .demo-section {
        margin-bottom: 2rem;
      }

      h3 {
        margin-bottom: 1rem;
      }

      .demo-note {
        margin-bottom: 1rem;
        color: var(--ino-color-on-surface-muted);
      }

      .density-row {
        display: flex;
        gap: var(--ino-space-4);
        flex-wrap: wrap;
      }

      .density-pane {
        flex: 1 1 320px;
        min-width: 0;
      }

      .density-label {
        margin: 0 0 0.5rem;
        font-weight: 500;
      }

      ino-galleria {
        display: block;
        width: 100%;
        height: 400px;
      }

      :host([size='sm']) ino-galleria {
        height: 250px;
      }

      :host([size='lg']) ino-galleria {
        height: 600px;
      }
    `,
  ],
})
export class GalleriaDemoComponent {
  images = [
    {
      src: 'https://images.unsplash.com/photo-1577720643272-265cfc6a3db7?w=800&h=600&fit=crop',
      alt: 'Sunset over mountains',
      caption: 'Sunset over mountains',
    },
    {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      alt: 'Mountain landscape',
      caption: 'Mountain landscape',
    },
    {
      src: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&h=600&fit=crop',
      alt: 'Desert dunes',
      caption: 'Desert dunes',
    },
    {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      alt: 'Forest landscape',
      caption: 'Forest landscape',
    },
    {
      src: 'https://images.unsplash.com/photo-1520763185298-1b434c919eba?w=800&h=600&fit=crop',
      alt: 'Ocean waves',
      caption: 'Ocean waves',
    },
  ];
}
