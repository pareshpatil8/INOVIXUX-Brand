/**
 * One virtualized axis of `<ino-virtual-scroller>` — the block axis for vertical scrolling, the
 * inline axis for horizontal scrolling, and both at once in grid (`orientation="both"`) mode.
 *
 * Two modes, deliberately separated because their cost profiles are nothing alike:
 *
 * - **Fixed** (`auto === false`). Every item has the same extent, so offset/index/total are pure
 *   arithmetic with no per-item allocation at all. This is the path a 100k-row KYB result set
 *   takes, and it is why T-1 (Table) can sit on top of this without a size table in memory.
 * - **Auto** (`auto === true`). Per-item extents, seeded from an estimate (or `itemSizeFn`) and
 *   corrected by real measurement after render. Offsets are a prefix-sum table rebuilt lazily:
 *   `measure()` only walks back the `valid` watermark, so a correction at index 9,000 does not
 *   re-sum indices 0..8,999 until something actually asks for an offset past 9,000.
 *
 * Kept free of Angular and of the DOM on purpose — the scroll math is the part most worth being
 * able to reason about (and unit-test) in isolation.
 */

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/** A half-open-ish inclusive render window. `last < first` means "nothing to render". */
export interface InoVirtualRange {
  first: number;
  last: number;
}

export class InoVirtualAxis {
  private count = 0;
  private estimate = 0;
  private auto = false;

  /** Auto mode only: per-item extent, index-aligned with the data. */
  private sizes: number[] = [];
  /** Auto mode only: `offsets[i]` is the start of item `i`; length is `count + 1`. */
  private offsets: number[] = [];
  /** Auto mode only: `offsets[0..valid]` are known-correct; everything past it is stale. */
  private valid = 0;

  get length(): number {
    return this.count;
  }

  get isAuto(): boolean {
    return this.auto;
  }

  /**
   * Re-seed the axis. Callers invoke this when the item count, the estimate, or the sizing mode
   * changes — not on every change-detection pass, because in auto mode it discards every
   * measurement taken so far.
   */
  reset(count: number, estimate: number, auto = false, sizeAt?: (index: number) => number): void {
    this.count = Math.max(0, Math.floor(count));
    this.estimate = estimate > 0 ? estimate : 0;
    this.auto = auto;
    this.valid = 0;

    if (!auto) {
      this.sizes = [];
      this.offsets = [];
      return;
    }

    this.sizes = new Array<number>(this.count);
    for (let i = 0; i < this.count; i++) {
      const seeded = sizeAt?.(i);
      this.sizes[i] = seeded != null && seeded > 0 ? seeded : this.estimate;
    }
    this.offsets = new Array<number>(this.count + 1);
    this.offsets[0] = 0;
  }

  /** Extend the prefix-sum table just far enough to answer the question being asked. */
  private ensure(upTo: number): void {
    const limit = clamp(upTo, 0, this.count);
    while (this.valid < limit) {
      this.offsets[this.valid + 1] = this.offsets[this.valid] + this.sizes[this.valid];
      this.valid++;
    }
  }

  get totalSize(): number {
    if (!this.auto) return this.count * this.estimate;
    this.ensure(this.count);
    return this.offsets[this.count] ?? 0;
  }

  sizeOf(index: number): number {
    if (!this.auto) return this.estimate;
    const size = this.sizes[index];
    return size != null && size > 0 ? size : this.estimate;
  }

  offsetOf(index: number): number {
    const i = clamp(index, 0, this.count);
    if (!this.auto) return i * this.estimate;
    this.ensure(i);
    return this.offsets[i] ?? 0;
  }

  /** Index of the item containing `offset`, clamped into range. */
  indexAt(offset: number): number {
    if (this.count === 0) return 0;
    const target = Math.max(0, offset);
    if (!this.auto) {
      return this.estimate > 0 ? clamp(Math.floor(target / this.estimate), 0, this.count - 1) : 0;
    }
    this.ensure(this.count);
    // Largest `i` with `offsets[i] <= target`.
    let lo = 0;
    let hi = this.count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.offsets[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** The inclusive index window covering `[scrollOffset, scrollOffset + viewportSize)`, plus buffer. */
  rangeAt(scrollOffset: number, viewportSize: number, buffer: number): InoVirtualRange {
    if (this.count === 0 || viewportSize <= 0) return { first: 0, last: -1 };

    const first = this.indexAt(scrollOffset);
    const end = Math.max(0, scrollOffset) + viewportSize;
    let last: number;

    if (!this.auto) {
      last =
        this.estimate > 0 ? clamp(Math.ceil(end / this.estimate) - 1, first, this.count - 1) : first;
    } else {
      this.ensure(this.count);
      last = first;
      while (last + 1 < this.count && this.offsets[last + 1] < end) last++;
    }

    const pad = Math.max(0, Math.floor(buffer));
    return {
      first: Math.max(0, first - pad),
      last: Math.min(this.count - 1, last + pad),
    };
  }

  /**
   * Record a measured extent. Returns the delta against what was previously assumed (0 when
   * nothing meaningful changed), which the component uses for scroll anchoring: if an item
   * *above* the viewport turns out taller than estimated, the content under the user's eye would
   * otherwise jump by exactly this much.
   *
   * The 0.5px deadband is what stops sub-pixel layout noise from driving a measure → re-render →
   * measure loop.
   */
  measure(index: number, size: number): number {
    if (!this.auto || index < 0 || index >= this.count || !(size > 0)) return 0;
    const previous = this.sizes[index] ?? this.estimate;
    if (Math.abs(previous - size) < 0.5) return 0;
    this.sizes[index] = size;
    // `offsets[index]` only depends on sizes 0..index-1, so it survives; everything after it dies.
    if (this.valid > index) this.valid = index;
    return size - previous;
  }
}
