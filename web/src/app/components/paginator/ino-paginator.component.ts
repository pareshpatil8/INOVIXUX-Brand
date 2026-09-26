import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

export interface InoPaginatorPageEvent {
  /** 0-based page index. */
  page: number;
  /** 0-based index of the first record on the new page. */
  first: number;
  rows: number;
  pageCount: number;
}

type InoPaginatorPageLink = number | 'ellipsis';

let idCounter = 0;

/**
 * `<ino-paginator>` — the Table prerequisite the original 38-component plan omitted (INO-137,
 * INO-31 T-2, Tier 1 / Data group). Parity benchmark: PrimeNG 22.1.1 `Paginator`
 * (`specs/primeng/llms-22.1.1.txt` line 92). Decisions record: `SPEC.md` in this directory.
 *
 * Purely presentational/stateless from the host's point of view: `first`/`rows`/`totalRecords` are
 * plain `@Input`s and every navigation gesture round-trips through `(pageChange)` — the component
 * never mutates a paged dataset itself, matching the PrimeNG benchmark's controlled-component shape.
 *
 * `readonly` keeps every control focusable and visible (a screen-reader user can still perceive
 * "page 3 of 9") but inert — distinct from `disabled`, which is dimmed and removed from the tab
 * order via the native `disabled` attribute. `invalid` is deliberately not part of this component's
 * state set: a page-navigation control has no form-validity concept to fail — see `SPEC.md` §1.
 *
 * Web-only by design — see `SPEC.md` §2 (desktop-idiom porting rule, plan rev 9 §5). The mobile
 * counterpart is a different component and gets its own issue in a later wave.
 */
@Component({
  selector: 'ino-paginator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-paginator.component.html',
  styleUrl: './ino-paginator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-paginator',
    role: 'navigation',
    '[attr.aria-label]': 'ariaLabel',
    '[attr.data-size]': 'size',
    '[attr.data-disabled]': 'disabled || null',
    '[attr.data-readonly]': 'readonly || null',
    '[attr.data-loading]': 'loading || null',
    '[attr.aria-busy]': 'loading || null',
    '[hidden]': 'hidden',
  },
})
export class InoPaginatorComponent {
  @Input() totalRecords = 0;
  @Input() rows = 10;
  /** 0-based index of the first visible record — the PrimeNG `first` convention. */
  @Input() first = 0;
  /** Options for the rows-per-page select. Empty (default) hides the select entirely. */
  @Input() rowsPerPageOptions: number[] = [];
  /** Number of numbered page links shown before collapsing into an ellipsis. */
  @Input() pageLinkSize = 5;
  @Input() size: InoControlSize = 'default';
  @Input() ariaLabel = 'Pagination';
  /** `{first}`, `{last}`, `{rows}`, `{page}`, `{pageCount}`, `{totalRecords}` placeholders. */
  @Input() currentPageReportTemplate = '{first}–{last} of {totalRecords}';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) showFirstLastIcon = true;
  @Input({ transform: booleanAttribute }) showCurrentPageReport = false;
  @Input({ transform: booleanAttribute }) showJumpToPageInput = false;
  /** Mirrors PrimeNG's `alwaysShow` — when `false`, the host hides itself while there's one page. */
  @Input({ transform: booleanAttribute }) alwaysShow = true;

  @Output() pageChange = new EventEmitter<InoPaginatorPageEvent>();
  @Output() firstChange = new EventEmitter<number>();
  @Output() rowsChange = new EventEmitter<number>();

  protected readonly rowsSelectId = `ino-paginator-rows-${++idCounter}`;
  protected readonly jumpInputId = `ino-paginator-jump-${idCounter}`;

  protected get pageCount(): number {
    return Math.max(1, Math.ceil(this.totalRecords / Math.max(1, this.rows)));
  }

  protected get currentPage(): number {
    return Math.min(this.pageCount - 1, Math.floor(this.first / Math.max(1, this.rows)));
  }

  protected get isFirstPage(): boolean {
    return this.currentPage <= 0;
  }

  protected get isLastPage(): boolean {
    return this.currentPage >= this.pageCount - 1;
  }

  protected get hidden(): boolean {
    return !this.alwaysShow && this.pageCount <= 1;
  }

  protected get interactive(): boolean {
    return !this.disabled && !this.readonly && !this.loading;
  }

  protected get reportText(): string {
    const first = this.totalRecords === 0 ? 0 : this.first + 1;
    const last = Math.min(this.first + this.rows, this.totalRecords);
    return this.currentPageReportTemplate
      .replace('{first}', String(first))
      .replace('{last}', String(last))
      .replace('{rows}', String(this.rows))
      .replace('{totalRecords}', String(this.totalRecords))
      .replace('{page}', String(this.currentPage + 1))
      .replace('{pageCount}', String(this.pageCount));
  }

  /** Sliding window of page numbers around the current page, with `'ellipsis'` markers — the
   *  PrimeNG `PageLinks` segment. Always includes page 0 and the last page when collapsed. */
  protected get pageLinks(): InoPaginatorPageLink[] {
    const count = this.pageCount;
    const size = Math.max(1, this.pageLinkSize);
    const current = this.currentPage;

    if (count <= size) {
      return Array.from({ length: count }, (_, i) => i);
    }

    const half = Math.floor(size / 2);
    let start = Math.max(0, current - half);
    let end = start + size - 1;
    if (end > count - 1) {
      end = count - 1;
      start = end - size + 1;
    }

    const links: InoPaginatorPageLink[] = [];
    if (start > 0) {
      links.push(0);
      if (start > 1) links.push('ellipsis');
    }
    for (let i = start; i <= end; i++) {
      links.push(i);
    }
    if (end < count - 1) {
      if (end < count - 2) links.push('ellipsis');
      links.push(count - 1);
    }
    return links;
  }

  protected isEllipsis(link: InoPaginatorPageLink): boolean {
    return link === 'ellipsis';
  }

  protected trackPageLink(index: number, link: InoPaginatorPageLink): string {
    return `${index}:${link}`;
  }

  protected goToPage(page: number): void {
    if (!this.interactive) return;
    const clamped = Math.min(Math.max(page, 0), this.pageCount - 1);
    if (clamped === this.currentPage) return;
    this.commit(clamped, this.rows);
  }

  protected goFirst(): void {
    this.goToPage(0);
  }

  protected goPrev(): void {
    this.goToPage(this.currentPage - 1);
  }

  protected goNext(): void {
    this.goToPage(this.currentPage + 1);
  }

  protected goLast(): void {
    this.goToPage(this.pageCount - 1);
  }

  protected onRowsPerPageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (!this.interactive) {
      // The <select> is never natively disabled under `readonly` (SPEC.md §3) so it stays in the
      // tab order, but that means the browser already committed the user's DOM selection before
      // this handler ran. Force it back to the true `rows` state instead of leaving the control
      // showing a value the component never actually adopted.
      select.value = String(this.rows);
      return;
    }
    const rows = Number(select.value);
    if (!Number.isFinite(rows) || rows <= 0 || rows === this.rows) return;
    this.commit(0, rows);
  }

  protected onJumpToPage(value: string): void {
    if (!this.interactive) return;
    const page = Number(value) - 1;
    if (!Number.isFinite(page)) return;
    this.goToPage(page);
  }

  private commit(page: number, rows: number): void {
    const first = page * rows;
    this.rows = rows;
    this.first = first;
    this.rowsChange.emit(rows);
    this.firstChange.emit(first);
    this.pageChange.emit({ page, first, rows, pageCount: this.pageCount });
  }
}
