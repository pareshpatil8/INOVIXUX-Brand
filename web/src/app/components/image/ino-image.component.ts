import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  booleanAttribute,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';
import { InoSkeletonComponent } from '../skeleton/ino-skeleton.component';

/** `object-fit` keyword, applied only while a caller sets `width` and/or `height` — doc 26 §5
 *  row "intrinsic + fit modes". With neither set the image renders at its own intrinsic size and
 *  `fit` has nothing to do. */
export type InoImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export const INO_IMAGE_FITS: readonly InoImageFit[] = ['cover', 'contain', 'fill', 'none', 'scale-down'] as const;

/** Zoom bounds/step for the lightbox (SPEC.md §3) — 1x is "fit", 4x is the ceiling past which a
 *  raster photo is mostly noise. */
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

let imageIdCounter = 0;

/**
 * `<ino-image>` — INO-487 (INO-31 Phase B5). Parity benchmark: PrimeNG 22.1.1 `Image`
 * (`specs/primeng/llms-22.1.1.txt`, route `https://primeng.dev/image`) — PrimeNG is a benchmark,
 * **not a runtime dependency**. Contract: SPEC.md, full write-up:
 * `docs/brand/06-angular-components/image.md`.
 *
 * A `<figure>` wrapping a lazy-loaded `<img>`, an optional projected `[caption]` (`<figcaption>`),
 * and an optional projected `[fallback]` shown in place of a broken image — same error-fallback
 * precedent as `ino-avatar`'s `imageFailed` flag, but there is no further fallback chain here (an
 * image with no `src`/that fails to load has nothing else to show but the fallback slot or this
 * component's own built-in glyph). Clicking the image (when `previewable`) opens an internal
 * lightbox `<ino-modal>`-style dialog with zoom/rotate controls — web-only, per doc 26 §5's "Port
 * both (base render; lightbox web-only)" note; see SPEC.md §6.
 */
@Component({
  selector: 'ino-image',
  standalone: true,
  imports: [CommonModule, InoFocusTrapDirective, InoSkeletonComponent],
  templateUrl: './ino-image.component.html',
  styleUrl: './ino-image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-image',
    '[attr.data-state]': 'state()',
  },
})
export class InoImageComponent implements OnChanges, OnDestroy {
  /** Image URL. */
  @Input() src = '';
  /** Accessible name for the `<img>` — required by the §2 Labels contract (doc 26 §5 row
   *  "`alt` required"); not type-enforced (same convention as `ino-avatar`'s `alt`), but an empty
   *  value is a contract violation a caller must fix, not a decorative-image signal — this
   *  component has no `decorative` input. */
  @Input() alt = '';
  /** `object-fit`, applied only when `width` and/or `height` constrain the box away from the
   *  image's own intrinsic aspect ratio. See SPEC.md §2. */
  @Input() fit: InoImageFit = 'cover';
  /** CSS length, e.g. `'320px'` / `'100%'`. Unset (default): the image renders at its intrinsic
   *  size — doc 26 §5's "intrinsic" sizing mode. */
  @Input() width = '';
  /** CSS length override, independent of `width`. */
  @Input() height = '';
  /** Native `loading` attribute — doc 26 §5's "lazy load" row. `'eager'` for above-the-fold
   *  callers (e.g. a hero image) that would otherwise pay a layout-shift tax waiting on an
   *  IntersectionObserver that fires immediately anyway. */
  @Input() loading: 'lazy' | 'eager' = 'lazy';
  /** Enables the click-to-open zoom/rotate lightbox — doc 26 §5's "preview-on-click lightbox"
   *  row. Off for thumbnails in a context that already has its own larger-preview affordance
   *  (e.g. a table cell), so this component never fights a caller's own click handler. */
  @Input({ transform: booleanAttribute }) previewable = true;

  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  protected readonly imageLoaded = signal(false);
  protected readonly imageFailed = signal(false);
  protected readonly lightboxOpen = signal(false);
  protected readonly zoom = signal(ZOOM_MIN);
  protected readonly rotation = signal(0);

  /** Doc 26 §5's own named "zoomed" state — true once the caller has zoomed past the 1x fit. */
  protected readonly zoomed = computed(() => this.zoom() > ZOOM_MIN);
  protected readonly lightboxTransform = computed(
    () => `scale(${this.zoom()}) rotate(${this.rotation()}deg)`,
  );
  protected readonly canZoomIn = computed(() => this.zoom() < ZOOM_MAX);
  protected readonly canZoomOut = computed(() => this.zoom() > ZOOM_MIN);

  protected readonly dialogId = `ino-image-lightbox-${++imageIdCounter}`;

  /** Doc 26 §5's own named state set, exposed as `[data-state]` for QA/visual-regression grep —
   *  same convention `ino-avatar`'s `[data-shape]`/`[data-size]` host attrs already use. `zoomed`
   *  only applies while the lightbox is open; the thumbnail itself is otherwise `loading` (src set,
   *  not yet loaded/failed), `error-fallback`, or `default`. */
  protected readonly state = computed(() => {
    if (this.lightboxOpen() && this.zoomed()) return 'zoomed';
    if (this.imageFailed()) return 'error-fallback';
    if (this.src && !this.imageLoaded()) return 'loading';
    return 'default';
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src']) {
      // Mirrors ino-avatar's ngOnChanges reset — swapping to a new URL always gets a fresh
      // load/error attempt instead of staying stuck on a previous image's outcome.
      this.imageLoaded.set(false);
      this.imageFailed.set(false);
    }
  }

  ngOnDestroy(): void {
    this.releaseScrollLock();
  }

  protected onLoad(): void {
    this.imageLoaded.set(true);
  }

  protected onError(): void {
    this.imageFailed.set(true);
  }

  protected openLightbox(): void {
    if (!this.previewable || !this.src || this.imageFailed()) {
      return;
    }
    this.resetView();
    this.lightboxOpen.set(true);
    this.lockScroll();
    this.opened.emit();
  }

  protected closeLightbox(): void {
    if (!this.lightboxOpen()) {
      return;
    }
    this.lightboxOpen.set(false);
    this.releaseScrollLock();
    this.closed.emit();
  }

  /**
   * Zoom-in/out, rotate-left/right and reset (buttons) plus the documented keyboard
   * equivalents — SPEC.md §4 "lightbox keyboard map". `Escape` is handled here rather than by
   * `[inoFocusTrap]`, same division of responsibility as `<ino-modal>` (focus-trap/SPEC.md §3):
   * the trap owns no dismissal keys, only the dialog that knows its own dismiss policy does.
   */
  protected onLightboxKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.stopPropagation();
        this.closeLightbox();
        break;
      case '+':
      case '=':
        event.preventDefault();
        this.zoomIn();
        break;
      case '-':
      case '_':
        event.preventDefault();
        this.zoomOut();
        break;
      case '0':
        event.preventDefault();
        this.resetView();
        break;
      case 'r':
        event.preventDefault();
        this.rotateClockwise();
        break;
      case 'R':
        event.preventDefault();
        this.rotateCounterClockwise();
        break;
    }
  }

  protected zoomIn(): void {
    this.zoom.update((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  }

  protected zoomOut(): void {
    this.zoom.update((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  }

  protected rotateClockwise(): void {
    this.rotation.update((r) => (r + 90) % 360);
  }

  protected rotateCounterClockwise(): void {
    this.rotation.update((r) => (r - 90 + 360) % 360);
  }

  protected resetView(): void {
    this.zoom.set(ZOOM_MIN);
    this.rotation.set(0);
  }

  private lockScroll(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  private releaseScrollLock(): void {
    // Idempotent on purpose: closeLightbox() flips `lightboxOpen` to false *before* calling this,
    // so gating on that signal here would mean a normal close never restores page scroll (it only
    // "worked" via ngOnDestroy, which runs before the flip). Resetting unconditionally is harmless
    // when nothing was ever locked.
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}
