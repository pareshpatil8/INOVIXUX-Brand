import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { InoControlSize } from '../control-size';
import { InoCarouselItemComponent } from './ino-carousel-item.component';

export type InoCarouselOrientation = 'horizontal' | 'vertical';

/**
 * `<ino-carousel>` — an APG "Carousel" region driven by content-projected `<ino-carousel-item>`
 * children (INO-483 / INO-31 B5, doc 26 §5 row). See SPEC.md for the full decision record;
 * summary below.
 *
 * Controlled/uncontrolled: bind `[activeIndex]` + `(activeIndexChange)` for a controlled carousel
 * (the consumer owns `startIndex`); omit `activeIndex` for uncontrolled mode, where the component
 * owns it starting at 0. Index-based, matching `ino-tabs` (SPEC.md §1).
 *
 * `visibleCount` + `step` make this a sliding window, not a page grid (SPEC.md §2). `autoplay` is
 * opt-in, never starts under `prefers-reduced-motion: reduce`, and pauses itself if a
 * non-`circular` timer tick would run past the last stop (SPEC.md §3).
 */
@Component({
  selector: 'ino-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-carousel.component.html',
  styleUrl: './ino-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-carousel',
    role: 'region',
    'aria-roledescription': 'carousel',
    '[attr.aria-label]': 'ariaLabel',
    '[attr.data-size]': 'size',
    '[attr.data-orientation]': 'orientation',
    '[attr.data-playing]': 'playing || null',
    '[attr.data-at-start]': 'isAtStart || null',
    '[attr.data-at-end]': 'isAtEnd || null',
  },
})
export class InoCarouselComponent implements AfterContentInit, OnChanges, OnDestroy {
  @Input() orientation: InoCarouselOrientation = 'horizontal';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: numberAttribute }) visibleCount = 1;
  @Input({ transform: numberAttribute }) step = 1;
  @Input({ transform: booleanAttribute }) autoplay = false;
  @Input({ transform: numberAttribute }) autoplayInterval = 5000;
  @Input({ transform: booleanAttribute }) circular = false;
  @Input({ transform: booleanAttribute }) showIndicators = true;
  @Input({ transform: booleanAttribute }) showNavigation = true;
  @Input() ariaLabel = 'Carousel';
  @Input({ transform: numberAttribute }) activeIndex?: number;

  @Output() activeIndexChange = new EventEmitter<number>();
  @Output() playingChange = new EventEmitter<boolean>();

  @ContentChildren(InoCarouselItemComponent) private itemsQuery!: QueryList<InoCarouselItemComponent>;
  @ViewChild('track') private trackRef?: ElementRef<HTMLElement>;

  protected items: InoCarouselItemComponent[] = [];
  protected playing = false;
  private internalStartIndex = 0;
  private itemsSub?: Subscription;
  private autoplayTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  private get isControlled(): boolean {
    return this.activeIndex !== undefined;
  }

  protected get startIndex(): number {
    const raw = this.isControlled ? this.activeIndex! : this.internalStartIndex;
    return this.clampStart(raw);
  }

  protected get maxStart(): number {
    return Math.max(0, this.items.length - this.visibleCount);
  }

  protected get isAtStart(): boolean {
    return this.startIndex <= 0;
  }

  protected get isAtEnd(): boolean {
    return this.startIndex >= this.maxStart;
  }

  /** Stops the indicator strip can jump to — every `step`-sized position from 0 up to
   *  `maxStart`, always including `maxStart` itself even when it falls off the step grid, so the
   *  trailing item(s) stay reachable by indicator (SPEC.md §2). */
  protected get stops(): number[] {
    const stops: number[] = [];
    for (let i = 0; i <= this.maxStart; i += this.step) {
      stops.push(i);
    }
    if (stops[stops.length - 1] !== this.maxStart) {
      stops.push(this.maxStart);
    }
    return stops;
  }

  protected get currentStopIndex(): number {
    return this.stops.indexOf(this.startIndex);
  }

  protected get rangeLabel(): string {
    const total = this.items.length;
    if (!total) {
      return '';
    }
    const first = this.startIndex + 1;
    const last = Math.min(this.startIndex + this.visibleCount, total);
    return first === last ? `Slide ${first} of ${total}` : `Slides ${first}-${last} of ${total}`;
  }

  ngAfterContentInit(): void {
    this.syncItems();
    this.itemsSub = this.itemsQuery.changes.subscribe(() => this.syncItems());
    if (this.autoplay) {
      this.play();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['activeIndex'] || changes['visibleCount']) && this.items.length) {
      this.applyVisibleState();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.itemsSub?.unsubscribe();
  }

  private syncItems(): void {
    this.items = this.itemsQuery.toArray();
    this.applyVisibleState();
    this.cdr.markForCheck();
  }

  private applyVisibleState(): void {
    const start = this.startIndex;
    const end = start + this.visibleCount;
    this.items.forEach((item, index) => {
      item.visible = index >= start && index < end;
      item.position = index;
      item.total = this.items.length;
    });
  }

  protected goTo(index: number): void {
    const clamped = this.clampStart(index);
    if (clamped === this.startIndex) {
      return;
    }
    if (!this.isControlled) {
      this.internalStartIndex = clamped;
      this.applyVisibleState();
      this.cdr.markForCheck();
    }
    this.activeIndexChange.emit(clamped);
  }

  protected next(): void {
    const next = this.startIndex + this.step;
    if (next > this.maxStart) {
      if (this.circular) {
        this.goTo(0);
      } else {
        this.goTo(this.maxStart);
        this.autoPauseAtBounds();
      }
      return;
    }
    this.goTo(next);
  }

  protected prev(): void {
    const prev = this.startIndex - this.step;
    if (prev < 0) {
      this.goTo(this.circular ? this.maxStart : 0);
      return;
    }
    this.goTo(prev);
  }

  /** Autoplay reaching a non-circular end pauses itself rather than idling at the last slide
   *  forever with a "Pause" control that has nothing left to advance — `at-bounds` (doc 26 §5
   *  row) is the natural place autoplay stops (SPEC.md §3). */
  private autoPauseAtBounds(): void {
    if (this.playing) {
      this.pause();
    }
  }

  protected play(): void {
    if (this.playing || this.prefersReducedMotion()) {
      return;
    }
    this.playing = true;
    this.playingChange.emit(true);
    this.autoplayTimer = setInterval(() => {
      if (!this.circular && this.isAtEnd) {
        this.pause();
        return;
      }
      this.next();
    }, this.autoplayInterval);
    this.cdr.markForCheck();
  }

  protected pause(): void {
    if (!this.playing) {
      return;
    }
    this.playing = false;
    this.playingChange.emit(false);
    this.stopTimer();
    this.cdr.markForCheck();
  }

  protected togglePlaying(): void {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  private stopTimer(): void {
    if (this.autoplayTimer !== undefined) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const horizontal = this.orientation === 'horizontal';
    const rtl = horizontal && this.isRtl();
    const forwardKey = horizontal ? 'ArrowRight' : 'ArrowDown';
    const backwardKey = horizontal ? 'ArrowLeft' : 'ArrowUp';

    switch (event.key) {
      case forwardKey:
        event.preventDefault();
        rtl ? this.prev() : this.next();
        return;
      case backwardKey:
        event.preventDefault();
        rtl ? this.next() : this.prev();
        return;
      case 'Home':
        event.preventDefault();
        this.goTo(0);
        return;
      case 'End':
        event.preventDefault();
        this.goTo(this.maxStart);
        return;
      default:
        return;
    }
  }

  private clampStart(index: number): number {
    if (!this.items.length) {
      return 0;
    }
    return Math.min(Math.max(0, index), this.maxStart);
  }

  private isRtl(): boolean {
    const host = this.trackRef?.nativeElement;
    return !!host && getComputedStyle(host).direction === 'rtl';
  }

  /** Motion contract (DoD row 7) + APG carousel reduced-motion requirement: read from JS because
   *  autoplay is a script-driven timer, not a CSS animation the stylesheet's media query could
   *  otherwise reach — same idiom as `ino-tabs.component.ts`'s own `prefersReducedMotion()`. */
  private prefersReducedMotion(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
