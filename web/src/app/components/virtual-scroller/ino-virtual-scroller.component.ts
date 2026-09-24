import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  booleanAttribute,
  inject,
  numberAttribute,
} from '@angular/core';

import { InoVirtualAxis, InoVirtualRange } from './virtual-axis';
import {
  InoVirtualScrollerEmptyDirective,
  InoVirtualScrollerFooterDirective,
  InoVirtualScrollerHeaderDirective,
  InoVirtualScrollerItemDirective,
  InoVirtualScrollerLoaderDirective,
} from './ino-virtual-scroller.templates';

export type InoVirtualScrollerSize = 'sm' | 'default' | 'lg';
export type InoVirtualScrollerOrientation = 'vertical' | 'horizontal' | 'both';
export type InoVirtualScrollerAlign = 'start' | 'center' | 'end' | 'auto';

export interface InoVirtualScrollerLazyLoadEvent extends InoVirtualRange {
  /** Grid mode only: the rendered column window, so a lazy source can fetch cells, not just rows. */
  firstColumn: number;
  lastColumn: number;
}

export interface InoVirtualScrollerScrollOptions {
  behavior?: ScrollBehavior;
  align?: InoVirtualScrollerAlign;
}

/** Logical scroll offsets — `inline` is direction-normalised, so it is >= 0 in RTL too. */
export interface InoVirtualScrollerScrollPosition {
  block: number;
  inline: number;
}

interface RenderedRow {
  index: number;
  key: unknown;
  item: unknown;
  placeholder: boolean;
}

const STORAGE_PREFIX = 'ino-virtual-scroller:';

/**
 * `<ino-virtual-scroller>` — renders only the slice of a collection that is actually on screen.
 *
 * Built for INO-155 (Table): a KYB result set is routinely tens of thousands of rows, and the
 * decision that makes the rest of the Table issue tractable is that row windowing lives *here*,
 * once, rather than inside the Table's own rendering path.
 *
 * Three things it does that a naive windowing implementation does not:
 *
 * - **Variable item extent.** `autoSize` seeds every item from an estimate (or `itemSizeFn`),
 *   then corrects it from real post-render measurement and anchors the scroll offset so
 *   correcting an item *above* the fold does not yank the content under the reader's eye.
 * - **Scroll-position restoration.** `scrollRestorationKey` persists the logical offset across
 *   destroy/recreate — the reviewer who opens a company file from row 4,120 and comes back
 *   lands on row 4,120, not on row 1.
 * - **RTL correctness.** Offsets are logical throughout: the DOM is positioned with
 *   `inset-inline-start`, and `scrollLeft` is normalised on read and de-normalised on write, so
 *   an Arabic or Hebrew locale scrolls the right way without a second code path.
 *
 * Sizing comes from the Wave 0 control-height scale, resolved from the DOM rather than from a
 * constant: a hidden probe element is sized by the same custom properties the rows are, and its
 * measured rect is what the scroll math uses. Change `size`, change density, change theme — the
 * JS follows, and there is no number in this file to drift out of sync with `tokens.css`.
 *
 * Web-only by design — see `SPEC.md` in this directory (plan rev 10 §5, desktop-idiom rule).
 */
@Component({
  selector: 'ino-virtual-scroller',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-virtual-scroller.component.html',
  styleUrl: './ino-virtual-scroller.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size',
    '[attr.data-orientation]': 'orientation',
    '[attr.data-disabled]': 'disabled || null',
    '[attr.data-readonly]': 'readonly || null',
    '[attr.data-invalid]': 'invalid || null',
    '[attr.data-busy]': 'loading || null',
  },
})
export class InoVirtualScrollerComponent implements OnChanges, AfterViewChecked, OnDestroy {
  // ---------------------------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------------------------

  /** Rows. In `orientation="both"` this is a row-major 2-D array. In `lazy` mode it may be sparse. */
  @Input() items: readonly unknown[] = [];

  /**
   * Fixed extent of one item along the scrolling axis, in px. Leave at 0 to inherit the
   * `size` × density control-height scale — which is the recommended setting, because a literal
   * here is exactly the kind of invented local sizing value the DoD's row 3 forbids.
   */
  @Input({ transform: numberAttribute }) itemSize = 0;

  /** Fixed extent of one column, in px, for `horizontal` and `both`. 0 inherits the scale. */
  @Input({ transform: numberAttribute }) columnSize = 0;

  /** `both` only: column count. 0 derives it from the widest rendered row. */
  @Input({ transform: numberAttribute }) columns = 0;

  @Input() orientation: InoVirtualScrollerOrientation = 'vertical';

  /** Variable item extent: measure each rendered item and correct the offset table. */
  @Input({ transform: booleanAttribute }) autoSize = false;

  /** `autoSize` seed. 0 inherits the control-height scale. Only affects the first paint's accuracy. */
  @Input({ transform: numberAttribute }) estimatedItemSize = 0;

  /** `autoSize` seed, per item — cheaper than a wrong global estimate when extents are known up front. */
  @Input() itemSizeFn: ((item: unknown, index: number) => number) | null = null;

  /** Items rendered beyond each edge of the viewport. Trades memory for blank-on-fling resistance. */
  @Input({ transform: numberAttribute }) buffer = 4;

  /** Identity for `@for` tracking. Defaults to the absolute index. */
  @Input() trackBy: ((index: number, item: unknown) => unknown) | null = null;

  // ---------------------------------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------------------------------

  @Input() size: InoVirtualScrollerSize = 'default';

  /** Any CSS length. Null lets the host box decide, which is what the Table wants. */
  @Input() scrollHeight: string | null = null;
  @Input() scrollWidth: string | null = null;

  /**
   * Milliseconds to coalesce scroll events before re-rendering the window. 0 renders every frame.
   * A non-zero delay is the PrimeNG "Delay" behaviour: fewer renders on a fling, at the cost of a
   * brief buffer-covered gap.
   */
  @Input({ transform: numberAttribute }) delay = 0;

  // ---------------------------------------------------------------------------------------------
  // Lazy + states
  // ---------------------------------------------------------------------------------------------

  @Input({ transform: booleanAttribute }) lazy = false;

  /** `lazy` only: the true collection length, when `items` holds only the loaded window. */
  @Input({ transform: numberAttribute }) totalRecords = 0;

  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) showLoader = false;

  /** Placeholder rows to draw while loading. 0 fills the current window. */
  @Input({ transform: numberAttribute }) loaderItemCount = 0;

  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) invalid = false;

  // ---------------------------------------------------------------------------------------------
  // Accessibility + persistence
  // ---------------------------------------------------------------------------------------------

  /**
   * Role of the scrolling viewport. `group` is the safe default for arbitrary projected content;
   * set `list` when the rows really are a list, or `presentation` when an ancestor (a Table) owns
   * the semantics. See `SPEC.md` §ARIA for why this is an input rather than a constant.
   */
  @Input() role = 'group';

  /** Role of each row wrapper. Must pair with `role` — `listitem` for `list`, `row` for `grid`. */
  @Input() itemRole: string | null = 'listitem';

  @Input() ariaLabel: string | null = null;
  @Input() ariaDescribedBy: string | null = null;

  /** `sessionStorage` key for scroll restoration. Null disables persistence entirely. */
  @Input() scrollRestorationKey: string | null = null;

  /** Defaults applied by `scrollToIndex()` when a call does not override them. */
  @Input() scrollOptions: InoVirtualScrollerScrollOptions = { behavior: 'auto', align: 'start' };

  // ---------------------------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------------------------

  @Output() lazyLoad = new EventEmitter<InoVirtualScrollerLazyLoadEvent>();
  @Output() rangeChange = new EventEmitter<InoVirtualRange>();
  @Output() scrollPositionChange = new EventEmitter<InoVirtualScrollerScrollPosition>();
  @Output() scrollEnd = new EventEmitter<void>();

  // ---------------------------------------------------------------------------------------------
  // Template slots
  // ---------------------------------------------------------------------------------------------

  @ContentChild(InoVirtualScrollerItemDirective) itemDef?: InoVirtualScrollerItemDirective;
  @ContentChild(InoVirtualScrollerLoaderDirective) loaderDef?: InoVirtualScrollerLoaderDirective;
  @ContentChild(InoVirtualScrollerEmptyDirective) emptyDef?: InoVirtualScrollerEmptyDirective;
  @ContentChild(InoVirtualScrollerHeaderDirective) headerDef?: InoVirtualScrollerHeaderDirective;
  @ContentChild(InoVirtualScrollerFooterDirective) footerDef?: InoVirtualScrollerFooterDirective;

  @ViewChild('viewport') private viewportRef?: ElementRef<HTMLElement>;
  @ViewChild('probe') private probeRef?: ElementRef<HTMLElement>;
  @ViewChildren('row') private rowRefs?: QueryList<ElementRef<HTMLElement>>;

  // ---------------------------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------------------------

  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly rowAxis = new InoVirtualAxis();
  private readonly columnAxis = new InoVirtualAxis();

  /** Extents resolved from the token probe, not from constants. */
  private probeBlock = 0;
  private probeInline = 0;

  private viewportBlock = 0;
  private viewportInline = 0;
  private scrollBlock = 0;
  private scrollInline = 0;

  private observers: ResizeObserver[] = [];
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private detachScroll: (() => void) | null = null;
  private measuring = false;
  private restorePending = false;
  private lastEmittedRange: InoVirtualRange = { first: 0, last: -1 };

  /** Bound to the template. */
  protected rows: RenderedRow[] = [];
  protected range: InoVirtualRange = { first: 0, last: -1 };
  protected columnRange: InoVirtualRange = { first: 0, last: -1 };
  protected totalBlock = 0;
  protected totalInline = 0;
  protected offsetBlock = 0;
  protected offsetInline = 0;

  // ---------------------------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------------------------

  ngOnChanges(changes: SimpleChanges): void {
    if ('scrollRestorationKey' in changes) this.restorePending = !!this.scrollRestorationKey;
    this.syncAxes();
    this.updateWindow(false);
  }

  ngAfterViewChecked(): void {
    if (!this.isBrowser || this.measuring) return;

    this.measuring = true;
    try {
      this.attachOnce();
      let dirty = this.readProbe() || this.readViewport();
      if (dirty) this.syncAxes();
      dirty = this.measureRows() || dirty;
      if (this.restorePending && this.restoreScrollPosition()) dirty = true;
      if (dirty) {
        this.updateWindow(false);
        this.cdr.detectChanges();
      }
    } finally {
      this.measuring = false;
    }
  }

  ngOnDestroy(): void {
    this.saveScrollPosition();
    if (this.scrollTimer !== null) clearTimeout(this.scrollTimer);
    this.detachScroll?.();
    for (const observer of this.observers) observer.disconnect();
    this.observers = [];
  }

  // ---------------------------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------------------------

  /** Scroll the given absolute item index into view. Honours `prefers-reduced-motion`. */
  scrollToIndex(index: number, options?: InoVirtualScrollerScrollOptions): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport || this.disabled || this.rowAxis.length === 0) return;

    const clamped = Math.min(Math.max(index, 0), this.rowAxis.length - 1);
    const align = options?.align ?? this.scrollOptions?.align ?? 'start';
    const axis = this.primaryAxis;
    const extent = this.primaryViewportExtent;
    const start = axis.offsetOf(clamped);
    const size = axis.sizeOf(clamped);

    let target = start;
    if (align === 'center') target = start - (extent - size) / 2;
    else if (align === 'end') target = start - (extent - size);
    else if (align === 'auto') {
      const current = this.primaryScrollOffset;
      if (start >= current && start + size <= current + extent) return;
      target = start < current ? start : start - (extent - size);
    }

    this.scrollToOffset(Math.max(0, target), options?.behavior);
  }

  /** Current logical scroll offsets. `inline` is normalised: always >= 0, even in RTL. */
  getScrollPosition(): InoVirtualScrollerScrollPosition {
    return { block: this.scrollBlock, inline: this.scrollInline };
  }

  /** Apply logical scroll offsets, de-normalising `inline` back into RTL's negative `scrollLeft`. */
  setScrollPosition(
    position: Partial<InoVirtualScrollerScrollPosition>,
    behavior?: ScrollBehavior,
  ): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;
    const block = position.block ?? this.scrollBlock;
    const inline = position.inline ?? this.scrollInline;
    viewport.scrollTo({
      top: block,
      left: this.isRtl ? -inline : inline,
      behavior: this.resolveBehavior(behavior),
    });
    this.readScrollOffsets();
    this.updateWindow(false);
  }

  /** Persist the current offset under `scrollRestorationKey`. Called automatically on destroy. */
  saveScrollPosition(): void {
    const key = this.scrollRestorationKey;
    if (!key || !this.isBrowser) return;
    try {
      sessionStorage.setItem(
        STORAGE_PREFIX + key,
        JSON.stringify({ block: this.scrollBlock, inline: this.scrollInline }),
      );
    } catch {
      // Private-browsing / storage-disabled: restoration is an enhancement, never a hard failure.
    }
  }

  /**
   * Re-apply a persisted offset. Returns true when it actually landed — it refuses while the
   * content is still shorter than the saved offset, so a restore issued before the data arrives
   * is retried on the next render rather than silently clamped to the bottom of a short list.
   */
  restoreScrollPosition(): boolean {
    const key = this.scrollRestorationKey;
    const viewport = this.viewportRef?.nativeElement;
    if (!key || !viewport || !this.isBrowser) {
      this.restorePending = false;
      return false;
    }

    let saved: InoVirtualScrollerScrollPosition | null = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
      saved = raw ? (JSON.parse(raw) as InoVirtualScrollerScrollPosition) : null;
    } catch {
      saved = null;
    }
    if (!saved) {
      this.restorePending = false;
      return false;
    }

    const blockRoom = this.totalBlock - this.viewportBlock;
    const inlineRoom = this.totalInline - this.viewportInline;
    if (saved.block > Math.max(0, blockRoom) || saved.inline > Math.max(0, inlineRoom)) return false;

    this.restorePending = false;
    viewport.scrollTop = saved.block;
    viewport.scrollLeft = this.isRtl ? -saved.inline : saved.inline;
    this.readScrollOffsets();
    return true;
  }

  /** Drop every cached measurement and re-seed from the estimate. For a content-level change. */
  refresh(): void {
    this.syncAxes();
    this.updateWindow(false);
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------------------------------------------
  // Template helpers
  // ---------------------------------------------------------------------------------------------

  protected get busy(): boolean {
    return this.loading;
  }

  protected get isEmpty(): boolean {
    return this.rowAxis.length === 0 && !this.loading;
  }

  protected get isGrid(): boolean {
    return this.orientation === 'both';
  }

  protected get scrollsInline(): boolean {
    return this.orientation === 'horizontal' || this.orientation === 'both';
  }

  protected get scrollsBlock(): boolean {
    return this.orientation === 'vertical' || this.orientation === 'both';
  }

  protected get tabIndex(): number {
    return this.disabled ? -1 : 0;
  }

  /** Extent of one rendered row along the block axis, for absolute placement. */
  protected rowExtent(index: number): number | null {
    if (this.orientation === 'horizontal') return null;
    return this.rowAxis.sizeOf(index);
  }

  protected itemContext(row: RenderedRow): Record<string, unknown> {
    const value = this.isGrid ? this.sliceColumns(row.item) : row.item;
    return {
      $implicit: value,
      index: row.index,
      count: this.rowAxis.length,
      columnOffset: this.isGrid ? this.columnRange.first : 0,
      columnSize: this.probeInlineExtent,
      even: row.index % 2 === 0,
      odd: row.index % 2 === 1,
    };
  }

  protected loaderContext(row: RenderedRow): Record<string, unknown> {
    return { $implicit: null, index: row.index, count: this.rowAxis.length };
  }

  protected trackRow = (index: number, row: RenderedRow): unknown => row.key;

  /**
   * Total collection length for `aria-setsize` / `aria-rowcount` — the *real* one, not the
   * rendered one. This is the single most important accessibility fact about a virtual
   * scroller: without it the a11y tree says "item 3 of 30" when it is item 3 of 100,000.
   * In `lazy` mode with an unknown total, -1 is the ARIA-sanctioned "size unknown".
   */
  protected get rowCountForAria(): number {
    if (this.lazy && this.totalRecords <= 0) return -1;
    return this.rowAxis.length;
  }

  /**
   * Polite live-region text naming the rendered window. Sighted users read virtualization off
   * the scrollbar; this is the equivalent signal for a screen-reader user, and it is why the
   * component does not simply lie about `aria-setsize`.
   */
  protected get rangeAnnouncement(): string {
    const total = this.rowAxis.length;
    if (total === 0 || this.range.last < this.range.first) return '';
    const unit = this.isGrid ? 'Rows' : 'Items';
    const totalText = this.rowCountForAria < 0 ? 'many' : total.toLocaleString();
    return `${unit} ${(this.range.first + 1).toLocaleString()} to ${(this.range.last + 1).toLocaleString()} of ${totalText}`;
  }

  // ---------------------------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------------------------

  /**
   * Keyboard map. The viewport is a focusable scroll region (WCAG 2.2 SC 2.1.1 — a mouse-only
   * scroll container is a keyboard trap for the content behind it), so every gesture a wheel can
   * make has a key equivalent.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    const blockStep = this.rowAxis.sizeOf(this.range.first) || this.probeBlockExtent;
    const inlineStep = this.columnAxis.sizeOf(this.columnRange.first) || this.probeInlineExtent;
    // In RTL the inline axis runs right-to-left, so ArrowRight must decrease the logical offset.
    const inlineSign = this.isRtl ? -1 : 1;
    let block: number | null = null;
    let inline: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        if (this.scrollsBlock) block = this.scrollBlock + blockStep;
        break;
      case 'ArrowUp':
        if (this.scrollsBlock) block = this.scrollBlock - blockStep;
        break;
      case 'ArrowRight':
        if (this.scrollsInline) inline = this.scrollInline + inlineStep * inlineSign;
        break;
      case 'ArrowLeft':
        if (this.scrollsInline) inline = this.scrollInline - inlineStep * inlineSign;
        break;
      case 'PageDown':
        block = this.primaryScrollOffset + this.primaryViewportExtent;
        break;
      case 'PageUp':
        block = this.primaryScrollOffset - this.primaryViewportExtent;
        break;
      case 'Home':
        block = 0;
        if (event.ctrlKey) inline = 0;
        break;
      case 'End':
        block = this.primaryTotal - this.primaryViewportExtent;
        if (event.ctrlKey) inline = this.totalInline - this.viewportInline;
        break;
      default:
        return;
    }

    if (block === null && inline === null) return;
    event.preventDefault();

    const primaryIsInline = this.orientation === 'horizontal';
    const next: Partial<InoVirtualScrollerScrollPosition> = {};
    if (block !== null) {
      if (primaryIsInline) next.inline = Math.max(0, block);
      else next.block = Math.max(0, block);
    }
    if (inline !== null) next.inline = Math.max(0, inline);
    this.setScrollPosition(next, 'auto');
  }

  // ---------------------------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------------------------

  private attachOnce(): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport || this.detachScroll) return;

    // Scroll is a firehose: keep it out of the zone entirely and re-enter only when the rendered
    // window actually changes, otherwise every frame of a fling schedules a full CD pass.
    this.zone.runOutsideAngular(() => {
      const onScroll = () => this.handleScroll();
      viewport.addEventListener('scroll', onScroll, { passive: true });
      this.detachScroll = () => viewport.removeEventListener('scroll', onScroll);

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.zone.run(() => this.cdr.markForCheck()));
        observer.observe(viewport);
        if (this.probeRef) observer.observe(this.probeRef.nativeElement);
        this.observers.push(observer);
      }
    });
  }

  private handleScroll(): void {
    const apply = () => {
      this.scrollTimer = null;
      const previous = this.range;
      this.readScrollOffsets();
      this.zone.run(() => {
        this.updateWindow(true);
        if (previous.first !== this.range.first || previous.last !== this.range.last) {
          this.cdr.markForCheck();
        }
      });
    };

    if (this.delay > 0) {
      if (this.scrollTimer !== null) clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(apply, this.delay);
    } else {
      apply();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Measurement — every extent below is read from the DOM, never from a constant
  // ---------------------------------------------------------------------------------------------

  /** Read the token-sized probe. Returns true when the resolved scale changed. */
  private readProbe(): boolean {
    const probe = this.probeRef?.nativeElement;
    if (!probe) return false;
    const rect = probe.getBoundingClientRect();
    if (Math.abs(rect.height - this.probeBlock) < 0.5 && Math.abs(rect.width - this.probeInline) < 0.5) {
      return false;
    }
    this.probeBlock = rect.height;
    this.probeInline = rect.width;
    return true;
  }

  private readViewport(): boolean {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return false;
    const block = viewport.clientHeight;
    const inline = viewport.clientWidth;
    if (block === this.viewportBlock && inline === this.viewportInline) return false;
    this.viewportBlock = block;
    this.viewportInline = inline;
    return true;
  }

  private readScrollOffsets(): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;
    this.scrollBlock = viewport.scrollTop;
    // RTL gives scrollLeft in [-max, 0]; abs() normalises both directions to a logical offset.
    this.scrollInline = Math.abs(viewport.scrollLeft);
  }

  /**
   * `autoSize` correction pass. Measures each rendered row, feeds the delta back into the axis,
   * and anchors: deltas accumulated from rows *above* the current offset are added back to
   * `scrollTop` so the visible content stays put.
   */
  private measureRows(): boolean {
    if (!this.autoSize || this.orientation === 'horizontal') return false;
    const refs = this.rowRefs;
    const viewport = this.viewportRef?.nativeElement;
    if (!refs || !viewport) return false;

    let anchorDelta = 0;
    let changed = false;
    let cursor = 0;

    for (const ref of refs) {
      const row = this.rows[cursor++];
      if (!row || row.placeholder) continue;
      const delta = this.rowAxis.measure(row.index, ref.nativeElement.getBoundingClientRect().height);
      if (delta === 0) continue;
      changed = true;
      if (this.rowAxis.offsetOf(row.index) < this.scrollBlock) anchorDelta += delta;
    }

    if (anchorDelta !== 0) {
      viewport.scrollTop = Math.max(0, viewport.scrollTop + anchorDelta);
      this.readScrollOffsets();
    }
    return changed;
  }

  // ---------------------------------------------------------------------------------------------
  // Windowing
  // ---------------------------------------------------------------------------------------------

  private get probeBlockExtent(): number {
    return this.itemSize > 0 ? this.itemSize : this.probeBlock;
  }

  private get probeInlineExtent(): number {
    return this.columnSize > 0 ? this.columnSize : this.probeInline;
  }

  private get rowCount(): number {
    return this.lazy && this.totalRecords > 0 ? this.totalRecords : this.items.length;
  }

  private get columnCount(): number {
    if (!this.isGrid) return 0;
    if (this.columns > 0) return this.columns;
    let widest = 0;
    for (const row of this.items) {
      if (Array.isArray(row)) widest = Math.max(widest, row.length);
    }
    return widest;
  }

  private get isRtl(): boolean {
    if (!this.isBrowser) return false;
    const element = this.viewportRef?.nativeElement ?? this.host.nativeElement;
    return getComputedStyle(element).direction === 'rtl';
  }

  private get primaryAxis(): InoVirtualAxis {
    return this.orientation === 'horizontal' ? this.columnAxis : this.rowAxis;
  }

  private get primaryViewportExtent(): number {
    return this.orientation === 'horizontal' ? this.viewportInline : this.viewportBlock;
  }

  private get primaryScrollOffset(): number {
    return this.orientation === 'horizontal' ? this.scrollInline : this.scrollBlock;
  }

  private get primaryTotal(): number {
    return this.orientation === 'horizontal' ? this.totalInline : this.totalBlock;
  }

  private syncAxes(): void {
    const blockExtent = this.probeBlockExtent;
    const inlineExtent = this.probeInlineExtent;

    if (this.orientation === 'horizontal') {
      this.rowAxis.reset(0, 0);
      this.columnAxis.reset(this.rowCount, inlineExtent);
    } else {
      const estimate = this.autoSize
        ? this.estimatedItemSize > 0
          ? this.estimatedItemSize
          : blockExtent
        : blockExtent;
      const seed = this.itemSizeFn;
      this.rowAxis.reset(
        this.rowCount,
        estimate,
        this.autoSize,
        seed ? (i) => seed(this.items[i], i) : undefined,
      );
      this.columnAxis.reset(this.columnCount, inlineExtent);
    }
  }

  private updateWindow(fromScroll: boolean): void {
    const blockRange = this.scrollsBlock
      ? this.rowAxis.rangeAt(this.scrollBlock, this.viewportBlock, this.buffer)
      : { first: 0, last: this.rowAxis.length - 1 };

    if (this.orientation === 'horizontal') {
      this.range = this.columnAxis.rangeAt(this.scrollInline, this.viewportInline, this.buffer);
      this.columnRange = { first: 0, last: -1 };
      this.totalInline = this.columnAxis.totalSize;
      this.totalBlock = 0;
      this.offsetInline = this.columnAxis.offsetOf(this.range.first);
      this.offsetBlock = 0;
    } else {
      this.range = blockRange;
      this.columnRange = this.isGrid
        ? this.columnAxis.rangeAt(this.scrollInline, this.viewportInline, this.buffer)
        : { first: 0, last: -1 };
      this.totalBlock = this.rowAxis.totalSize;
      this.totalInline = this.isGrid ? this.columnAxis.totalSize : 0;
      this.offsetBlock = this.rowAxis.offsetOf(this.range.first);
      this.offsetInline = this.isGrid ? this.columnAxis.offsetOf(this.columnRange.first) : 0;
    }

    this.rows = this.buildRows();
    this.emitRangeEffects(fromScroll);
  }

  private buildRows(): RenderedRow[] {
    const { first, last } = this.range;
    if (last < first) return [];

    const showPlaceholders = this.loading && this.showLoader;
    const cap = this.loaderItemCount > 0 ? first + this.loaderItemCount - 1 : last;
    const end = showPlaceholders ? Math.min(last, cap) : last;
    const rows: RenderedRow[] = [];

    for (let index = first; index <= end; index++) {
      const item = this.items[index];
      // In lazy mode an unresolved slot is a placeholder even mid-load, so a partially filled
      // window renders real rows and skeletons side by side rather than blanking wholesale.
      const placeholder = showPlaceholders && (!this.lazy || item == null);
      rows.push({
        index,
        item,
        placeholder,
        key: this.trackBy && !placeholder ? this.trackBy(index, item) : index,
      });
    }
    return rows;
  }

  private emitRangeEffects(fromScroll: boolean): void {
    const { first, last } = this.range;
    if (first === this.lastEmittedRange.first && last === this.lastEmittedRange.last) return;
    this.lastEmittedRange = { first, last };

    this.rangeChange.emit({ first, last });
    if (this.lazy) {
      this.lazyLoad.emit({
        first,
        last,
        firstColumn: this.columnRange.first,
        lastColumn: this.columnRange.last,
      });
    }
    if (fromScroll) {
      this.scrollPositionChange.emit(this.getScrollPosition());
      this.saveScrollPosition();
      if (last >= this.primaryAxis.length - 1 && this.primaryAxis.length > 0) this.scrollEnd.emit();
    }
  }

  private sliceColumns(row: unknown): unknown {
    if (!Array.isArray(row)) return row;
    const { first, last } = this.columnRange;
    return last < first ? [] : row.slice(first, last + 1);
  }

  private scrollToOffset(offset: number, behavior?: ScrollBehavior): void {
    const target: Partial<InoVirtualScrollerScrollPosition> =
      this.orientation === 'horizontal' ? { inline: offset } : { block: offset };
    this.setScrollPosition(target, behavior);
  }

  /** Reduced motion is honoured in JS too — a smooth programmatic scroll is still vestibular motion. */
  private resolveBehavior(behavior?: ScrollBehavior): ScrollBehavior {
    const requested = behavior ?? this.scrollOptions?.behavior ?? 'auto';
    if (requested !== 'smooth' || !this.isBrowser) return requested;
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }
}
