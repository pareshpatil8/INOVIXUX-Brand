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
import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';
import { InoGalleriaItemComponent } from './ino-galleria-item.component';

@Component({
  selector: 'ino-galleria',
  standalone: true,
  imports: [CommonModule, InoFocusTrapDirective],
  templateUrl: './ino-galleria.component.html',
  styleUrl: './ino-galleria.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-galleria',
    role: 'region',
    'aria-roledescription': 'gallery',
    '[attr.aria-label]': 'ariaLabel',
    '[attr.data-size]': 'size',
    '[attr.data-loading]': 'loading || null',
    '[attr.data-playing]': 'playing || null',
    '[attr.data-disabled]': 'disabled || null',
    '[attr.aria-disabled]': 'disabled || null',
  },
})
export class InoGalleriaComponent implements AfterContentInit, OnChanges, OnDestroy {
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) autoplay = false;
  @Input({ transform: numberAttribute }) autoplayInterval = 5000;
  @Input({ transform: booleanAttribute }) showThumbnails = true;
  @Input({ transform: booleanAttribute }) showIndicators = true;
  @Input({ transform: booleanAttribute }) showFullscreen = true;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() ariaLabel = 'Gallery';
  @Input({ transform: numberAttribute }) activeIndex?: number;

  @Output() activeIndexChange = new EventEmitter<number>();
  @Output() playingChange = new EventEmitter<boolean>();

  @ContentChildren(InoGalleriaItemComponent) private itemsQuery!: QueryList<InoGalleriaItemComponent>;
  @ViewChild('stageArea') private stageRef?: ElementRef<HTMLElement>;

  protected items: InoGalleriaItemComponent[] = [];
  protected playing = false;
  protected fullscreenActive = false;
  private internalActiveIndex = 0;
  private itemsSub?: Subscription;
  private autoplayTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  private get isControlled(): boolean {
    return this.activeIndex !== undefined;
  }

  protected get activeIdx(): number {
    const raw = this.isControlled ? this.activeIndex! : this.internalActiveIndex;
    return this.clampIndex(raw);
  }

  protected get isAtStart(): boolean {
    return this.activeIdx <= 0;
  }

  protected get isAtEnd(): boolean {
    return this.activeIdx >= this.items.length - 1;
  }

  protected get currentItem(): InoGalleriaItemComponent | undefined {
    return this.items[this.activeIdx];
  }

  protected get rangeLabel(): string {
    const total = this.items.length;
    if (!total) {
      return '';
    }
    return `Image ${this.activeIdx + 1} of ${total}`;
  }

  ngAfterContentInit(): void {
    this.syncItems();
    this.itemsSub = this.itemsQuery.changes.subscribe(() => this.syncItems());
    if (this.autoplay) {
      this.play();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('activeIndex' in changes && this.items.length) {
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.itemsSub?.unsubscribe();
  }

  private syncItems(): void {
    this.items = this.itemsQuery.toArray();
    this.cdr.markForCheck();
  }

  protected goTo(index: number): void {
    if (this.disabled) {
      return;
    }
    const clamped = this.clampIndex(index);
    if (clamped === this.activeIdx) {
      return;
    }
    if (!this.isControlled) {
      this.internalActiveIndex = clamped;
    }
    this.activeIndexChange.emit(clamped);
    this.cdr.markForCheck();
  }

  protected next(): void {
    if (this.activeIdx < this.items.length - 1) {
      this.goTo(this.activeIdx + 1);
    }
  }

  protected prev(): void {
    if (this.activeIdx > 0) {
      this.goTo(this.activeIdx - 1);
    }
  }

  protected play(): void {
    if (this.playing || this.prefersReducedMotion()) {
      return;
    }
    this.playing = true;
    this.playingChange.emit(true);
    this.autoplayTimer = setInterval(() => {
      if (this.activeIdx >= this.items.length - 1) {
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

  protected openFullscreen(): void {
    if (!this.showFullscreen) {
      return;
    }
    this.fullscreenActive = true;
    this.cdr.markForCheck();
  }

  protected closeFullscreen(): void {
    this.fullscreenActive = false;
    this.cdr.markForCheck();
  }

  protected onFullscreenKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeFullscreen();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }
    const rtl = this.isRtl();
    const forwardKey = 'ArrowRight';
    const backwardKey = 'ArrowLeft';

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
        this.goTo(this.items.length - 1);
        return;
      default:
        return;
    }
  }

  private stopTimer(): void {
    if (this.autoplayTimer !== undefined) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }

  private clampIndex(index: number): number {
    if (!this.items.length) {
      return 0;
    }
    return Math.min(Math.max(0, index), this.items.length - 1);
  }

  private isRtl(): boolean {
    const host = this.stageRef?.nativeElement;
    return !!host && getComputedStyle(host).direction === 'rtl';
  }

  private prefersReducedMotion(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
