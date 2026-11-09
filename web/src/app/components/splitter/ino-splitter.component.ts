import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  QueryList,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { InoSplitterPanelComponent } from './ino-splitter-panel.component';

export type InoSplitterOrientation = 'horizontal' | 'vertical';

/**
 * `<ino-splitter>` — resizable panes for dashboard layouts (INO-445, INO-31 Phase B2, doc 26 §5
 * row `ino-splitter`). Content-projected `<ino-splitter-panel>` children (`ContentChildren`,
 * same container/leaf split `ino-tabs`/`ino-tab-panel` already establishes) — see
 * `ino-splitter-panel.component.ts` and `SPEC.md` for why the panel stays a dumb leaf.
 *
 * Gutters are **not** DOM siblings of the projected panels — plain Angular content projection
 * (`<ng-content>`) cannot interleave extra elements between specific projected nodes. Instead the
 * panel row and the gutter layer are two separate, absolutely-stacked children: panels lay out
 * with real `flex-basis` percentages, and each gutter is a zero-footprint overlay positioned with
 * `inset-inline-start`/`inset-block-start` at the cumulative percentage boundary between its two
 * neighbours. See `SPEC.md` §1.
 *
 * Nesting (variant list: "nested") needs no special wiring — an `<ino-splitter>` placed inside an
 * `<ino-splitter-panel>`'s projected content is just another block-level descendant; each
 * splitter instance only ever reads its own direct `ContentChildren`, so a perpendicular or
 * parallel nested splitter composes for free.
 */
@Component({
  selector: 'ino-splitter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-splitter.component.html',
  styleUrl: './ino-splitter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-splitter',
    '[attr.data-orientation]': 'orientation',
    '[class.ino-splitter--disabled]': 'disabled',
    '[class.ino-splitter--dragging]': 'draggingGutterIndex !== null',
    '[attr.aria-disabled]': 'disabled ? "true" : null',
  },
})
export class InoSplitterComponent implements AfterContentInit, OnDestroy {
  /** Panel flow direction. `'horizontal'` (default) lays panels out side by side, divided by
   *  vertical gutter lines; `'vertical'` stacks them, divided by horizontal gutter lines. Note
   *  this names the PANELS' axis, not the gutter's own visual orientation — a horizontal
   *  splitter's gutter is a vertical line, per the WAI-ARIA APG `separator` definition (SPEC.md
   *  §4), the same inversion `ino-divider`'s own orientation input does not have because a
   *  divider has no panels to be "between." */
  @Input() orientation: InoSplitterOrientation = 'horizontal';
  /** Percentage points moved per Arrow-key press on a focused gutter. */
  @Input({ transform: numberAttribute }) resizeStep = 5;
  @Input({ transform: booleanAttribute }) disabled = false;
  /** Gutters stay focusable (roving-tabindex-free here — every gutter is tab-stoppable, there is
   *  no single active one) but drag/keyboard resize/collapse all no-op — the same "focusable but
   *  inert" contract `ino-tabs`'s own `readonly` documents for a single control. */
  @Input({ transform: booleanAttribute }) readonly = false;

  /** Emits the full panel size array (percentages, index-aligned to panel order) once a resize or
   *  collapse/expand settles — on pointerup/keyup/toggle, not on every intermediate pointermove
   *  frame, so a consumer persisting layout to a backend isn't spammed mid-drag. */
  @Output() sizesChange = new EventEmitter<number[]>();
  @Output() panelCollapsedChange = new EventEmitter<{ index: number; collapsed: boolean }>();

  @ContentChildren(InoSplitterPanelComponent) private panelsQuery!: QueryList<InoSplitterPanelComponent>;

  protected panels: InoSplitterPanelComponent[] = [];
  protected draggingGutterIndex: number | null = null;

  private panelsSub?: Subscription;
  private readonly preCollapseSize = new Map<InoSplitterPanelComponent, number>();

  private dragStartBefore = 0;
  private dragStartAfter = 0;
  private dragStartPos = 0;
  private dragContainerSize = 0;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngAfterContentInit(): void {
    this.syncPanels();
    this.panelsSub = this.panelsQuery.changes.subscribe(() => this.syncPanels());
  }

  ngOnDestroy(): void {
    this.panelsSub?.unsubscribe();
  }

  /** Gutter `gi` sits between `panels[gi]` and `panels[gi+1]`. Empty/single-panel splitters
   *  (contract point 2's "empty" state) resolve to zero gutters automatically. */
  protected get gutterIndices(): number[] {
    return this.panels.length > 1 ? Array.from({ length: this.panels.length - 1 }, (_, i) => i) : [];
  }

  /** Sum of every panel's current `flexBasis` up to (exclusive of) `index` — the inline/block
   *  offset, in percent, where a gutter or panel boundary at that position sits. */
  protected cumulativeOffset(index: number): number {
    let sum = 0;
    for (let i = 0; i < index; i++) {
      sum += this.panels[i]?.flexBasis ?? 0;
    }
    return sum;
  }

  /** Initial distribution: explicit `size`s are honoured, the remaining percentage splits evenly
   *  among panels that omitted it, then the whole row is normalized to sum to exactly 100 — see
   *  SPEC.md §2. Re-run on every `ContentChildren.changes` tick (panels added/removed at runtime
   *  reset to a fresh even/explicit split rather than trying to preserve a user's in-progress
   *  drag across a structural change — SPEC.md §7's documented scope limit). */
  private syncPanels(): void {
    this.panels = this.panelsQuery.toArray();
    this.preCollapseSize.clear();

    const count = this.panels.length;
    if (count === 0) {
      this.cdr.markForCheck();
      return;
    }
    if (count === 1) {
      this.panels[0].flexBasis = 100;
      this.cdr.markForCheck();
      return;
    }

    const explicitTotal = this.panels.reduce((sum, p) => sum + (p.size ?? 0), 0);
    const unsetCount = this.panels.filter((p) => p.size === null).length;
    const evenShare = unsetCount > 0 ? Math.max(0, 100 - explicitTotal) / unsetCount : 0;
    const raw = this.panels.map((p) => Math.max(p.size ?? evenShare, p.minSize));

    const rawTotal = raw.reduce((sum, v) => sum + v, 0);
    const scale = rawTotal > 0 ? 100 / rawTotal : 0;
    this.panels.forEach((panel, i) => {
      panel.flexBasis = raw[i] * scale;
      panel.collapsed = false;
    });
    this.cdr.markForCheck();
  }

  private isRtl(): boolean {
    return getComputedStyle(this.elementRef.nativeElement).direction === 'rtl';
  }

  private currentSizes(): number[] {
    return this.panels.map((p) => p.flexBasis);
  }

  /** Shared clamp: moves the boundary between `panels[gutterIndex]` and `panels[gutterIndex+1]`
   *  so `panels[gutterIndex]`'s share becomes `rawBeforeSize`, never pushing either side below its
   *  own `minSize`, and never changing the pair's combined total. */
  private resizeGutter(gutterIndex: number, rawBeforeSize: number): void {
    const before = this.panels[gutterIndex];
    const after = this.panels[gutterIndex + 1];
    const total = before.flexBasis + after.flexBasis;
    const clamped = Math.min(Math.max(rawBeforeSize, before.minSize), total - after.minSize);
    before.flexBasis = clamped;
    after.flexBasis = total - clamped;
    this.cdr.markForCheck();
  }

  protected onGutterPointerDown(event: PointerEvent, gutterIndex: number, trackEl: HTMLElement): void {
    if (this.disabled || this.readonly) return;
    const before = this.panels[gutterIndex];
    const after = this.panels[gutterIndex + 1];
    if (before.collapsed || after.collapsed) return;

    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.draggingGutterIndex = gutterIndex;
    this.dragStartBefore = before.flexBasis;
    this.dragStartAfter = after.flexBasis;
    this.dragStartPos = this.orientation === 'horizontal' ? event.clientX : event.clientY;
    this.dragContainerSize =
      this.orientation === 'horizontal' ? trackEl.clientWidth : trackEl.clientHeight;
    document.body.classList.add(
      this.orientation === 'horizontal' ? 'ino-splitter-resizing-x' : 'ino-splitter-resizing-y'
    );
    this.cdr.markForCheck();
  }

  protected onGutterPointerMove(event: PointerEvent, gutterIndex: number): void {
    if (this.draggingGutterIndex !== gutterIndex || this.dragContainerSize === 0) return;
    const pos = this.orientation === 'horizontal' ? event.clientX : event.clientY;
    let deltaPercent = ((pos - this.dragStartPos) / this.dragContainerSize) * 100;
    if (this.orientation === 'horizontal' && this.isRtl()) {
      deltaPercent = -deltaPercent;
    }
    this.resizeGutter(gutterIndex, this.dragStartBefore + deltaPercent);
  }

  protected onGutterPointerUp(event: PointerEvent, gutterIndex: number): void {
    if (this.draggingGutterIndex !== gutterIndex) return;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    this.draggingGutterIndex = null;
    document.body.classList.remove('ino-splitter-resizing-x', 'ino-splitter-resizing-y');
    this.sizesChange.emit(this.currentSizes());
    this.cdr.markForCheck();
  }

  protected onGutterKeydown(event: KeyboardEvent, gutterIndex: number): void {
    if (this.disabled || this.readonly) return;
    const before = this.panels[gutterIndex];
    const after = this.panels[gutterIndex + 1];
    if (before.collapsed || after.collapsed) return;

    const rtl = this.orientation === 'horizontal' && this.isRtl();
    const forwardKey = this.orientation === 'horizontal' ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
    const backwardKey = this.orientation === 'horizontal' ? (rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';

    switch (event.key) {
      case forwardKey:
        event.preventDefault();
        this.resizeGutter(gutterIndex, before.flexBasis + this.resizeStep);
        break;
      case backwardKey:
        event.preventDefault();
        this.resizeGutter(gutterIndex, before.flexBasis - this.resizeStep);
        break;
      case 'Home':
        event.preventDefault();
        this.resizeGutter(gutterIndex, before.minSize);
        break;
      case 'End':
        event.preventDefault();
        this.resizeGutter(gutterIndex, before.flexBasis + after.flexBasis - after.minSize);
        break;
      default:
        return;
    }
    this.sizesChange.emit(this.currentSizes());
  }

  /** A panel's collapse toggle lives on its nearer gutter: the gutter right after it for every
   *  panel except the last, whose toggle lives on the gutter right before it (SPEC.md §5).
   *  Two plain boolean checks rather than one method returning a freshly-allocated array —
   *  `*ngFor` tracks non-primitive items by reference by default, so a method returning a new
   *  `{...}` literal every change-detection pass would make Angular destroy and recreate the
   *  toggle `<button>` on every tick (losing focus mid-interaction) even though nothing about it
   *  actually changed. */
  protected hasBeforeToggle(gutterIndex: number): boolean {
    return !!this.panels[gutterIndex]?.collapsible;
  }

  protected hasAfterToggle(gutterIndex: number): boolean {
    const lastIndex = this.panels.length - 1;
    return gutterIndex === lastIndex - 1 && !!this.panels[lastIndex]?.collapsible;
  }

  protected round(value: number): number {
    return Math.round(value);
  }

  protected chevron(side: 'before' | 'after', collapsed: boolean): string {
    if (this.orientation === 'horizontal') {
      const pointsTowardStart = side === 'before' ? !collapsed : collapsed;
      const rtl = this.isRtl();
      const pointsLogicalStart = rtl ? !pointsTowardStart : pointsTowardStart;
      return pointsLogicalStart ? '‹' : '›';
    }
    const pointsUp = side === 'before' ? !collapsed : collapsed;
    return pointsUp ? '▴' : '▾';
  }

  protected toggleLabel(side: 'before' | 'after', collapsed: boolean): string {
    const panelWord = side === 'before' ? 'panel before' : 'panel after';
    return collapsed ? `Expand ${panelWord} gutter` : `Collapse ${panelWord} gutter`;
  }

  protected toggleCollapse(panelIndex: number, side: 'before' | 'after'): void {
    if (this.disabled || this.readonly) return;
    const panel = this.panels[panelIndex];
    if (!panel?.collapsible) return;

    const neighborIndex = side === 'before' ? panelIndex + 1 : panelIndex - 1;
    const neighbor = this.panels[neighborIndex];
    if (!neighbor) return;

    if (!panel.collapsed) {
      this.preCollapseSize.set(panel, panel.flexBasis);
      neighbor.flexBasis = neighbor.flexBasis + panel.flexBasis;
      panel.flexBasis = 0;
      panel.collapsed = true;
    } else {
      const restore = this.preCollapseSize.get(panel) ?? panel.minSize;
      const give = Math.min(restore, Math.max(0, neighbor.flexBasis - neighbor.minSize));
      neighbor.flexBasis = neighbor.flexBasis - give;
      panel.flexBasis = give;
      panel.collapsed = false;
    }
    this.cdr.markForCheck();
    this.panelCollapsedChange.emit({ index: panelIndex, collapsed: panel.collapsed });
    this.sizesChange.emit(this.currentSizes());
  }
}
