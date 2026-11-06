import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoCarouselComponent } from '../../../../components/carousel/ino-carousel.component';
import { InoCarouselItemComponent } from '../../../../components/carousel/ino-carousel-item.component';

/**
 * Hand-authored carousel demo for the §2 Component Publish Contract coverage (doc 26 §2). The
 * generic renderer mounts via `*ngComponentOutlet` with `[inputs]` only and cannot project the
 * `<ino-carousel-item>` children a carousel is entirely built from — same content-projection gap
 * `toolbar`/`accordion`/`splitter` all hit. See `carousel/SPEC.md` for the full decision record.
 */
@Component({
  selector: 'docs-carousel-demo',
  standalone: true,
  imports: [CommonModule, InoCarouselComponent, InoCarouselItemComponent],
  template: `
    <div class="demo-section">
      <h3 class="demo-heading">Basic (one slide at a time)</h3>
      <ino-carousel ariaLabel="Basic carousel">
        <ino-carousel-item *ngFor="let slide of slides" class="demo-slide">{{ slide }}</ino-carousel-item>
      </ino-carousel>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">N visible + step (3 visible, advances by 1)</h3>
      <ino-carousel ariaLabel="Peek carousel" [visibleCount]="3" [step]="1">
        <ino-carousel-item *ngFor="let slide of slides" class="demo-slide">{{ slide }}</ino-carousel-item>
      </ino-carousel>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Circular</h3>
      <p class="demo-note">Next/Previous never disable — they wrap around at either end.</p>
      <ino-carousel ariaLabel="Circular carousel" [circular]="true">
        <ino-carousel-item *ngFor="let slide of slides" class="demo-slide">{{ slide }}</ino-carousel-item>
      </ino-carousel>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Autoplay (opt-in)</h3>
      <p class="demo-note">
        A visible pause control is always shown while autoplay is on (APG carousel requirement).
        Autoplay never starts at all when the OS "reduce motion" setting is on.
      </p>
      <ino-carousel ariaLabel="Autoplay carousel" [autoplay]="true" [autoplayInterval]="3000" [circular]="true">
        <ino-carousel-item *ngFor="let slide of slides" class="demo-slide">{{ slide }}</ino-carousel-item>
      </ino-carousel>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Vertical orientation</h3>
      <div style="max-height: 220px">
        <ino-carousel ariaLabel="Vertical carousel" orientation="vertical">
          <ino-carousel-item *ngFor="let slide of slides" class="demo-slide">{{ slide }}</ino-carousel-item>
        </ino-carousel>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Sizing — item gap scales</h3>
      <p class="demo-note">The gap between visible items grows with <code>size</code>: sm → default → lg.</p>
      <div class="demo-size-row" *ngFor="let size of sizes">
        <span class="demo-size-label">{{ size }}</span>
        <ino-carousel [ariaLabel]="size + ' carousel'" [size]="size" [visibleCount]="3">
          <ino-carousel-item *ngFor="let slide of slides" class="demo-slide">{{ slide }}</ino-carousel-item>
        </ino-carousel>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Controlled (externally driven activeIndex)</h3>
      <p class="demo-note">Current slide: {{ controlledIndex + 1 }} of {{ slides.length }}</p>
      <ino-carousel
        ariaLabel="Controlled carousel"
        [activeIndex]="controlledIndex"
        (activeIndexChange)="controlledIndex = $event"
      >
        <ino-carousel-item *ngFor="let slide of slides" class="demo-slide">{{ slide }}</ino-carousel-item>
      </ino-carousel>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Keyboard Navigation</h3>
      <p class="demo-note">
        Tab into the track below, then use <kbd>←</kbd> / <kbd>→</kbd> to move by one step,
        <kbd>Home</kbd> / <kbd>End</kbd> to jump to the first/last stop.
      </p>
      <ino-carousel ariaLabel="Keyboard navigation example">
        <ino-carousel-item *ngFor="let slide of slides" class="demo-slide">{{ slide }}</ino-carousel-item>
      </ino-carousel>
    </div>
  `,
  styles: [
    `
      .demo-section {
        margin-block-end: var(--ino-space-6);
      }

      .demo-heading {
        margin-block-start: 0;
        margin-block-end: var(--ino-space-3);
        font-size: var(--ino-font-size-md);
        font-weight: var(--ino-font-weight-semibold);
        color: var(--ino-color-on-surface);
      }

      .demo-note {
        margin-block-end: var(--ino-space-3);
        padding: var(--ino-space-3);
        background-color: var(--ino-color-surface-sunken);
        border-radius: var(--ino-radius-sm);
        font-size: var(--ino-font-size-sm);
        color: var(--ino-color-on-surface-muted);
      }

      .demo-note kbd {
        padding: 2px 6px;
        background-color: var(--ino-color-surface);
        border: 1px solid var(--ino-color-border);
        border-radius: var(--ino-radius-xs);
        font-family: var(--ino-font-family-mono);
        font-size: 0.9em;
      }

      .demo-slide {
        display: flex;
        align-items: center;
        justify-content: center;
        inline-size: 160px;
        block-size: 100px;
        background-color: var(--ino-color-surface-raised);
        border: 1px solid var(--ino-color-border);
        border-radius: var(--ino-radius-sm);
        color: var(--ino-color-on-surface);
        font-weight: var(--ino-font-weight-semibold);
      }

      .demo-size-row {
        display: flex;
        align-items: center;
        gap: var(--ino-space-4);
        margin-block-end: var(--ino-space-4);
      }

      .demo-size-label {
        inline-size: 48px;
        flex-shrink: 0;
        font-size: var(--ino-font-size-sm);
        color: var(--ino-color-on-surface-muted);
      }
    `,
  ],
})
export class CarouselDemoComponent {
  readonly slides = ['Slide 1', 'Slide 2', 'Slide 3', 'Slide 4', 'Slide 5'];
  readonly sizes: ('sm' | 'default' | 'lg')[] = ['sm', 'default', 'lg'];
  controlledIndex = 0;
}
