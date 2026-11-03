import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';

import { InoControlSize } from '../control-size';
import { InoPaginatorComponent, InoPaginatorPageEvent } from '../paginator/ino-paginator.component';
import { InoSelectButtonComponent, InoSelectButtonOption } from '../select-button/ino-select-button.component';
import {
  InoDataViewEmptyDirective,
  InoDataViewGridItemDirective,
  InoDataViewItemContext,
  InoDataViewListItemDirective,
} from './ino-dataview.templates';

export type InoDataViewLayout = 'list' | 'grid';

const LAYOUT_OPTIONS: InoSelectButtonOption[] = [
  { label: 'List', value: 'list', icon: '☰', ariaLabel: 'List view' },
  { label: 'Grid', value: 'grid', icon: '☷', ariaLabel: 'Grid view' },
];

let idCounter = 0;

/**
 * `<ino-dataview>` — INO-454 (INO-31 Phase B3, Data display). Parity benchmark: PrimeNG 22.1.1
 * `DataView` (`specs/primeng/llms-22.1.1.txt` line 51). PrimeNG is a benchmark, **not** a runtime
 * dependency. Spec seed: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 —
 * "list/grid layout switch; paginator integration; item templates."
 *
 * Composes rather than reinvents: `<ino-select-button>` for the list/grid layout switch (the same
 * segmented-control primitive `ino-select-button-demo.component.ts` already seeds with List/Grid
 * icons), and `<ino-paginator>` for paging — same controlled-component integration `ino-table`
 * already established (`paginator`/`rows`/`first`/`totalRecords`/`lazy` inputs, a `page` output,
 * client-side windowing unless `lazy`). This component owns none of that logic twice.
 *
 * Decisions record: `SPEC.md` in this directory.
 */
@Component({
  selector: 'ino-dataview',
  standalone: true,
  imports: [CommonModule, InoPaginatorComponent, InoSelectButtonComponent],
  templateUrl: './ino-dataview.component.html',
  styleUrl: './ino-dataview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-dataview',
    '[attr.data-size]': 'size',
    '[attr.data-layout]': 'layout',
    '[attr.data-loading]': 'loading || null',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoDataViewComponent {
  // ---------------------------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------------------------

  /** Items for the current page. In `lazy` mode this already holds only the loaded window — the
   *  same `<ino-paginator>`-controlled-component convention `ino-table`'s `value`/`lazy` pair uses. */
  @Input() value: readonly unknown[] = [];

  /** Identity for `@for` tracking. Defaults to the absolute index. */
  @Input() trackBy: ((index: number, item: unknown) => unknown) | null = null;

  // ---------------------------------------------------------------------------------------------
  // Layout switch (doc 26 §5 — "list/grid layout switch")
  // ---------------------------------------------------------------------------------------------

  @Input() layout: InoDataViewLayout = 'list';
  @Output() readonly layoutChange = new EventEmitter<InoDataViewLayout>();

  /** Built-in `<ino-select-button>` toggle. Set `false` when a host page drives `[layout]` from
   *  its own control and wants no duplicate switch rendered. */
  @Input({ transform: booleanAttribute }) showLayoutSwitcher = true;

  // ---------------------------------------------------------------------------------------------
  // Paginator integration (doc 26 §5 — "paginator integration")
  // ---------------------------------------------------------------------------------------------

  @Input({ transform: booleanAttribute }) paginator = false;
  @Input({ transform: numberAttribute }) rows = 10;
  @Input({ transform: numberAttribute }) first = 0;
  @Input() rowsPerPageOptions: number[] = [];
  /** `true`: `value` already holds only the current page, and `totalRecords` is the real count. */
  @Input({ transform: booleanAttribute }) lazy = false;
  /** Lazy mode only: the true collection length. Ignored (derived from `value.length`) otherwise. */
  @Input({ transform: numberAttribute }) totalRecords = 0;

  @Output() readonly page = new EventEmitter<InoPaginatorPageEvent>();
  @Output() readonly firstChange = new EventEmitter<number>();

  // ---------------------------------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------------------------------

  @Input() size: InoControlSize = 'default';

  /** CSS `grid-template-columns` track size for `layout="grid"` — content-dependent (card width),
   *  not part of the Wave 0 control-size scale, so it stays a free input rather than a token.
   *  The *gap* between cells does scale with `size` — see `SPEC.md` §3. */
  @Input() gridMinColumnWidth = '220px';

  // ---------------------------------------------------------------------------------------------
  // States (doc 26 §5 — "loading, empty")
  // ---------------------------------------------------------------------------------------------

  @Input({ transform: booleanAttribute }) loading = false;
  /** Placeholder cards/rows drawn while `loading` is true. 0 falls back to `rows` (or 6 outside
   *  paging), matching `ino-table`'s `skeletonRowCount` idiom. */
  @Input({ transform: numberAttribute }) skeletonItemCount = 0;

  @Input() emptyMessage = 'No records found.';

  // ---------------------------------------------------------------------------------------------
  // Accessibility + labels (doc 26 §5 — "list label"; "role=list/listitem")
  // ---------------------------------------------------------------------------------------------

  /** Visible caption for the whole region — the "list label" doc 26 §5 calls out, same role a
   *  table caption plays. Empty (default): the region falls back to a plain `ariaLabel`. */
  @Input() label = '';
  /** Accessible name when no visible `label` is given. */
  @Input() ariaLabel = 'Data view';

  @ContentChild(InoDataViewListItemDirective) listItemDef?: InoDataViewListItemDirective;
  @ContentChild(InoDataViewGridItemDirective) gridItemDef?: InoDataViewGridItemDirective;
  @ContentChild(InoDataViewEmptyDirective) emptyDef?: InoDataViewEmptyDirective;

  @ViewChild('announcer') private readonly announcerRef?: ElementRef<HTMLDivElement>;

  protected readonly dataviewId = `ino-dataview-${++idCounter}`;
  protected readonly labelId = `${this.dataviewId}-label`;
  protected readonly layoutOptions = LAYOUT_OPTIONS;

  private announceTimer: ReturnType<typeof setTimeout> | null = null;

  // ---------------------------------------------------------------------------------------------
  // Template helpers
  // ---------------------------------------------------------------------------------------------

  /** Falls back to the list item template when no grid-specific one was given (SPEC.md §2). */
  protected get activeItemTemplate() {
    return (this.layout === 'grid' ? this.gridItemDef?.template : undefined) ?? this.listItemDef?.template;
  }

  protected get isGrid(): boolean {
    return this.layout === 'grid';
  }

  protected get effectiveLabelledby(): string | null {
    return this.label ? this.labelId : null;
  }

  protected get effectiveAriaLabel(): string | null {
    return this.label ? null : this.ariaLabel;
  }

  /** Current page's rows. Client-side paging slices here; `lazy` mode trusts `value` is already
   *  the loaded window — identical convention to `ino-table`'s `displayRows` getter. */
  protected get windowedItems(): readonly unknown[] {
    if (!this.paginator || this.lazy) return this.value;
    return this.value.slice(this.first, this.first + this.rows);
  }

  protected get totalRowsForPaginator(): number {
    return this.lazy ? this.totalRecords : this.value.length;
  }

  protected get isEmpty(): boolean {
    return !this.loading && this.windowedItems.length === 0;
  }

  protected get skeletonRows(): number[] {
    const count = this.skeletonItemCount > 0 ? this.skeletonItemCount : this.rows > 0 ? this.rows : 6;
    return Array.from({ length: count }, (_, i) => i);
  }

  protected itemContext(item: unknown, index: number): InoDataViewItemContext {
    return { $implicit: item, index };
  }

  protected trackItem = (index: number, item: unknown): unknown => {
    const absoluteIndex = this.paginator && !this.lazy ? this.first + index : index;
    return this.trackBy ? this.trackBy(absoluteIndex, item) : absoluteIndex;
  };

  // ---------------------------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------------------------

  /** `<ino-select-button>` emits `string | string[]` — this group is always single-select. */
  protected onLayoutValueChange(value: string | string[]): void {
    const next = (Array.isArray(value) ? value[0] : value) as InoDataViewLayout;
    if (!next || next === this.layout) return;
    this.layout = next;
    this.layoutChange.emit(next);
    this.announce(next === 'grid' ? 'Grid view' : 'List view');
  }

  protected onPageChange(event: InoPaginatorPageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
    this.firstChange.emit(this.first);
    this.page.emit(event);
  }

  /** Announces the new layout to assistive tech (doc 26 §5 — "layout toggle announced"), the same
   *  transient-`aria-live`-region idiom `ino-inputtags`'s SPEC.md documents for its own announcer. */
  private announce(message: string): void {
    const node = this.announcerRef?.nativeElement;
    if (!node) return;
    node.textContent = message;
    if (this.announceTimer !== null) clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => {
      if (this.announcerRef) this.announcerRef.nativeElement.textContent = '';
    }, 1000);
  }
}
