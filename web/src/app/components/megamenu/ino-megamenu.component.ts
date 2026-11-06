import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoMegaMenuColumn, InoMegaMenuItem, InoMegaMenuLink } from './ino-megamenu.types';

/**
 * `<ino-megamenu>` — a menubar whose top-level items open multi-column panels of grouped links
 * (PrimeNG 22.1.1 `MegaMenu`, a benchmark only; nothing here imports it). Spec source: doc 26 §5
 * Phase B5 row `ino-megamenu` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on INO-377.
 * Issue: INO-495.
 *
 * Contract: docs/brand/06-angular-components/megamenu.md. Decisions record: `SPEC.md`.
 *
 * A11y: WAI-ARIA APG Menubar (`role="menubar"`/`"menuitem"`), one tab stop for the whole bar —
 * Arrow keys move among top-level items and into/out of an open panel; Escape closes a panel and
 * returns focus to its trigger. See `SPEC.md` §2 for the full keyboard map and why hover-to-open
 * is deliberately not implemented.
 */
@Component({
  selector: 'ino-megamenu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ino-megamenu.component.html',
  styleUrl: './ino-megamenu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size',
  },
})
export class InoMegaMenuComponent {
  @Input() items: InoMegaMenuItem[] = [];
  /** Accessible name for the `menubar` — the spec row's "menubar label". */
  @Input() ariaLabel = 'Main menu';
  /** `horizontal | vertical` — the row's Variants/Structure axis (doc 26 §5). Swaps which arrow
   * pair moves between top-level items and which pair opens/closes a panel. See `SPEC.md` §3. */
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  /** `compact | comfortable` — the row's own two-tier scale, same shape `ino-panel-menu` uses for
   * its page-resident trigger bar. Composes with dense/fluid density. Panel link rows always use
   * the fixed overlay-compact control scale regardless of this input — see `SPEC.md` §4. */
  @Input() size: 'compact' | 'comfortable' = 'comfortable';
  /** `href` of the current top-level item or panel link — drives the "active-item" state
   * (`aria-current="page"` + active styling). */
  @Input() activeHref?: string;
  /** Renders every leaf (top-level and panel) as inert text; panels still open/close so the
   * structure stays browsable. See `SPEC.md` §6. */
  @Input({ transform: booleanAttribute }) readonly = false;
  /** Renders a skeleton bar instead of `items`. */
  @Input({ transform: booleanAttribute }) loading = false;
  /** Message shown when `items` is empty (and not `loading`). */
  @Input() emptyLabel = 'No items';

  @Output() itemClick = new EventEmitter<InoMegaMenuItem | InoMegaMenuLink>();

  /** Roving-tabindex position on the top-level bar. */
  protected focusedIndex = 0;
  /** Index of the top-level item whose panel is open, or `null`. */
  protected openIndex: number | null = null;
  /** Roving-tabindex position inside the open panel. */
  protected panelFocus: { column: number; row: number } | null = null;

  protected hasPanel(item: InoMegaMenuItem): boolean {
    return !!item.columns?.length;
  }

  protected isNavigable(entry: InoMegaMenuItem | InoMegaMenuLink): boolean {
    return !this.hasPanel(entry as InoMegaMenuItem) && !!entry.href && !entry.disabled && !this.readonly;
  }

  protected isCommand(entry: InoMegaMenuItem | InoMegaMenuLink): boolean {
    return !this.hasPanel(entry as InoMegaMenuItem) && !entry.href && !!entry.command && !entry.disabled && !this.readonly;
  }

  protected isInert(entry: InoMegaMenuItem | InoMegaMenuLink): boolean {
    return !this.hasPanel(entry as InoMegaMenuItem) && !this.isNavigable(entry) && !this.isCommand(entry);
  }

  protected isActiveItem(entry: InoMegaMenuItem | InoMegaMenuLink): boolean {
    return !!this.activeHref && entry.href === this.activeHref;
  }

  protected isOpen(index: number): boolean {
    return this.openIndex === index;
  }

  protected triggerId(index: number): string {
    return `ino-megamenu-trigger-${index}`;
  }

  protected panelId(index: number): string {
    return `ino-megamenu-panel-${index}`;
  }

  protected columnHeadingId(index: number, column: number): string {
    return `ino-megamenu-heading-${index}-${column}`;
  }

  protected tabIndexFor(index: number): number {
    return this.focusedIndex === index ? 0 : -1;
  }

  protected isPanelTabStop(column: number, row: number): boolean {
    return this.panelFocus?.column === column && this.panelFocus?.row === row;
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  private navigableTopIndexes(): number[] {
    return this.items.reduce<number[]>((acc, item, i) => {
      if (!item.disabled) {
        acc.push(i);
      }
      return acc;
    }, []);
  }

  private clampFocus(index: number): void {
    const navigable = this.navigableTopIndexes();
    this.focusedIndex = navigable.includes(index) ? index : navigable[0] ?? 0;
  }

  protected onBarItemClick(item: InoMegaMenuItem, index: number): void {
    if (item.disabled) {
      return;
    }
    this.focusedIndex = index;
    // `readonly` renders leaves inert but never blocks opening a panel — the structure stays
    // browsable, same contract `ino-panel-menu`'s `readonly` records (SPEC.md §7 there).
    if (this.hasPanel(item)) {
      this.togglePanel(index);
      return;
    }
    if (this.readonly) {
      return;
    }
    if (item.command) {
      item.command(item);
    }
    this.itemClick.emit(item);
  }

  protected onLinkClick(link: InoMegaMenuLink): void {
    if (link.disabled || this.readonly) {
      return;
    }
    if (link.command) {
      link.command(link);
    }
    this.itemClick.emit(link);
    this.closePanel(false);
  }

  private togglePanel(index: number): void {
    if (this.openIndex === index) {
      this.closePanel(false);
    } else {
      this.openPanelAndFocus(index, 0, 0);
    }
  }

  private openPanelAndFocus(index: number, column: number, row: number): void {
    this.openIndex = index;
    this.focusedIndex = index;
    this.panelFocus = { column, row };
  }

  protected closePanel(returnFocus: boolean): void {
    this.openIndex = null;
    this.panelFocus = null;
    if (returnFocus) {
      queueMicrotask(() => {
        document.getElementById(this.triggerId(this.focusedIndex))?.focus();
      });
    }
  }

  /** Closes the panel when focus leaves the panel container entirely (click/Tab-out). */
  protected onPanelFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    const panel = event.currentTarget as HTMLElement;
    if (!next || !panel.contains(next)) {
      this.closePanel(false);
    }
  }

  private openAxisKeys(): { prev: string; next: string } {
    return this.orientation === 'horizontal' ? { prev: 'ArrowLeft', next: 'ArrowRight' } : { prev: 'ArrowUp', next: 'ArrowDown' };
  }

  private panelOpenKey(): string {
    return this.orientation === 'horizontal' ? 'ArrowDown' : 'ArrowRight';
  }

  protected onTriggerKeydown(event: KeyboardEvent, index: number): void {
    const item = this.items[index];
    const navigable = this.navigableTopIndexes();
    const axis = this.openAxisKeys();

    if (event.key === axis.next || event.key === axis.prev) {
      event.preventDefault();
      const pos = navigable.indexOf(index);
      const delta = event.key === axis.next ? 1 : -1;
      const nextPos = (pos + delta + navigable.length) % navigable.length;
      this.focusedIndex = navigable[nextPos];
      queueMicrotask(() => document.getElementById(this.triggerId(this.focusedIndex))?.focus());
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.focusedIndex = navigable[0] ?? 0;
      queueMicrotask(() => document.getElementById(this.triggerId(this.focusedIndex))?.focus());
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.focusedIndex = navigable[navigable.length - 1] ?? 0;
      queueMicrotask(() => document.getElementById(this.triggerId(this.focusedIndex))?.focus());
      return;
    }

    if ((event.key === this.panelOpenKey() || event.key === 'Enter' || event.key === ' ') && this.hasPanel(item) && !item.disabled) {
      event.preventDefault();
      this.openPanelAndFocus(index, 0, 0);
      queueMicrotask(() => this.focusPanelCell(index, 0, 0));
      return;
    }

    if (event.key === 'Escape' && this.isOpen(index)) {
      event.preventDefault();
      this.closePanel(false);
    }
  }

  private focusPanelCell(triggerIndex: number, column: number, row: number): void {
    document.getElementById(`${this.panelId(triggerIndex)}-${column}-${row}`)?.focus();
  }

  protected onPanelKeydown(event: KeyboardEvent, triggerIndex: number, columns: InoMegaMenuColumn[]): void {
    if (!this.panelFocus) {
      return;
    }
    const { column, row } = this.panelFocus;
    const currentColumn = columns[column]?.items ?? [];

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextRow = (row + 1) % currentColumn.length;
      this.panelFocus = { column, row: nextRow };
      queueMicrotask(() => this.focusPanelCell(triggerIndex, column, nextRow));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevRow = (row - 1 + currentColumn.length) % currentColumn.length;
      this.panelFocus = { column, row: prevRow };
      queueMicrotask(() => this.focusPanelCell(triggerIndex, column, prevRow));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.panelFocus = { column, row: 0 };
      queueMicrotask(() => this.focusPanelCell(triggerIndex, column, 0));
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const lastRow = currentColumn.length - 1;
      this.panelFocus = { column, row: lastRow };
      queueMicrotask(() => this.focusPanelCell(triggerIndex, column, lastRow));
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextColumnIndex = column + delta;
      if (nextColumnIndex >= 0 && nextColumnIndex < columns.length) {
        const nextColumnItems = columns[nextColumnIndex]?.items ?? [];
        const nextRow = Math.min(row, Math.max(nextColumnItems.length - 1, 0));
        this.panelFocus = { column: nextColumnIndex, row: nextRow };
        queueMicrotask(() => this.focusPanelCell(triggerIndex, nextColumnIndex, nextRow));
        return;
      }
      // Off the edge of this panel — APG Menubar: move to the adjacent top-level item and open
      // its panel too, same as moving along the bar's own open-axis.
      const navigable = this.navigableTopIndexes();
      const pos = navigable.indexOf(triggerIndex);
      const nextTrigger = navigable[(pos + delta + navigable.length) % navigable.length];
      const nextItem = this.items[nextTrigger];
      if (this.hasPanel(nextItem)) {
        this.openPanelAndFocus(nextTrigger, 0, 0);
        queueMicrotask(() => this.focusPanelCell(nextTrigger, 0, 0));
      } else {
        this.closePanel(true);
        this.focusedIndex = nextTrigger;
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePanel(true);
    }
  }
}
