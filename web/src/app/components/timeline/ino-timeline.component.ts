import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  inject,
  numberAttribute,
} from '@angular/core';

import {
  InoTimelineContentDirective,
  InoTimelineMarkerDirective,
  InoTimelineOppositeDirective,
} from './ino-timeline.templates';

export type InoTimelineLayout = 'vertical' | 'horizontal';
/**
 * Logical, not physical: `start` puts content after the marker along the inline axis (vertical)
 * or before it along the block axis (horizontal) — i.e. PrimeNG's "left"/"top". `end` is the
 * opposite side. `alternate` zigzags per row/column parity. RTL flips `start`/`end` for free
 * because the CSS uses flex `order`, which follows writing direction, never `left`/`right`.
 */
export type InoTimelineAlign = 'start' | 'end' | 'alternate';
export type InoTimelineSize = 'sm' | 'default' | 'lg';
/** Closed union, same shape as `InoAlertStatus` plus `neutral` — a marker with no verdict yet. */
export type InoTimelineMarkerRole = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface InoTimelineItemSelectEvent {
  item: unknown;
  index: number;
}

interface RenderedEvent {
  index: number;
  item: unknown;
  key: unknown;
  side: 'start' | 'end';
  role: InoTimelineMarkerRole;
}

/**
 * `<ino-timeline>` — INO-134 / INO-31 T-4. A series of chained events with a marker + connector
 * rail, built for the KYB audit trail: who verified what, when, and what the human approver
 * decided. Parity benchmark: PrimeNG 22.1.1 `Timeline` (`specs/primeng/llms-22.1.1.txt` line 121).
 *
 * Data-driven (`value` + three per-event template slots — content, opposite, marker), not
 * fully content-projected: an audit trail is routinely re-sorted/filtered/paginated by its
 * caller, and a `*ngFor`-in-the-host design would force every consumer to hand-roll the
 * marker/connector/side logic this component exists to own. See `ino-timeline.templates.ts`.
 *
 * Non-interactive by default (a read-only log), matching the PrimeNG benchmark. Setting
 * `interactive` opts a row into a roving-tabindex, arrow-key-navigable listbox — the accessible
 * shape a reviewer scanning a long audit trail actually needs — without forcing every consumer
 * that just wants to *display* a trail to deal with focus management. Full reasoning: SPEC.md §1.
 */
@Component({
  selector: 'ino-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-timeline.component.html',
  styleUrl: './ino-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-timeline',
    '[attr.data-layout]': 'layout',
    '[attr.data-align]': 'align',
    '[attr.data-size]': 'size',
    '[class.ino-timeline--interactive]': 'interactive',
    '[attr.data-disabled]': 'disabled || null',
    '[attr.data-readonly]': 'readonly || null',
    '[attr.data-invalid]': 'invalid || null',
    '[attr.data-busy]': 'loading || null',
    '[attr.role]': 'hostRole',
    '[attr.aria-busy]': 'loading || null',
    '[attr.aria-disabled]': 'disabled || null',
    '[attr.aria-readonly]': 'readonly || null',
    '[attr.aria-label]': 'ariaLabel',
    '[attr.aria-describedby]': 'ariaDescribedBy',
  },
})
export class InoTimelineComponent {
  // ---------------------------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------------------------

  /** Events, oldest-to-newest or newest-to-oldest — the component renders in the order given. */
  @Input() value: readonly unknown[] = [];

  /** Identity for `@for` tracking. Defaults to the array index. */
  @Input() dataKey: ((item: unknown, index: number) => unknown) | null = null;

  /**
   * Resolves each event's marker/connector colour role. Closed union, not a raw colour `@Input`,
   * for the same reason `ino-tag`'s `severity` is: the token pair lives entirely in this
   * component's SCSS. Default: every event reads `neutral`.
   */
  @Input() markerRole: (item: unknown, index: number) => InoTimelineMarkerRole = () => 'neutral';

  // ---------------------------------------------------------------------------------------------
  // Layout — DoD row 6 (variants)
  // ---------------------------------------------------------------------------------------------

  @Input() layout: InoTimelineLayout = 'vertical';
  @Input() align: InoTimelineAlign = 'start';

  // ---------------------------------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------------------------------

  @Input() size: InoTimelineSize = 'default';

  // ---------------------------------------------------------------------------------------------
  // States — DoD row 5
  // ---------------------------------------------------------------------------------------------

  /** Opts a row into being a focusable, selectable listbox option (hover/active/focus-visible). */
  @Input({ transform: booleanAttribute }) interactive = false;

  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) loading = false;

  /** Skeleton rows drawn while `loading` and `value` is still empty (first load, not a refresh). */
  @Input({ transform: numberAttribute }) skeletonCount = 3;

  // ---------------------------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------------------------

  @Input() ariaLabel: string | null = null;
  @Input() ariaDescribedBy: string | null = null;

  // ---------------------------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------------------------

  /** `interactive` only: fires on click or Enter/Space on the focused row. */
  @Output() itemSelect = new EventEmitter<InoTimelineItemSelectEvent>();
  /** `interactive` only: fires whenever roving focus moves, mirroring the focused index. */
  @Output() focusedIndexChange = new EventEmitter<number>();

  // ---------------------------------------------------------------------------------------------
  // Template slots
  // ---------------------------------------------------------------------------------------------

  @ContentChild(InoTimelineContentDirective) contentDef?: InoTimelineContentDirective;
  @ContentChild(InoTimelineOppositeDirective) oppositeDef?: InoTimelineOppositeDirective;
  @ContentChild(InoTimelineMarkerDirective) markerDef?: InoTimelineMarkerDirective;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Roving tabindex target, `interactive` only. -1 when nothing has been focused yet. */
  protected focusedIndex = -1;

  // ---------------------------------------------------------------------------------------------
  // Template helpers
  // ---------------------------------------------------------------------------------------------

  protected get hostRole(): string | null {
    if (this.value.length === 0 && !this.loading) return null;
    return this.interactive ? 'listbox' : 'list';
  }

  protected get isEmpty(): boolean {
    return this.value.length === 0 && !this.loading;
  }

  protected get showSkeleton(): boolean {
    return this.loading && this.value.length === 0;
  }

  protected get skeletonRows(): number[] {
    return Array.from({ length: Math.max(0, this.skeletonCount) }, (_, i) => i);
  }

  protected get events(): RenderedEvent[] {
    return this.value.map((item, index) => ({
      index,
      item,
      key: this.dataKey ? this.dataKey(item, index) : index,
      side: this.resolveSide(index),
      role: this.markerRole(item, index),
    }));
  }

  protected trackEvent = (_: number, event: RenderedEvent): unknown => event.key;

  protected contentContext(event: RenderedEvent): Record<string, unknown> {
    return { $implicit: event.item, index: event.index };
  }

  protected markerContext(event: RenderedEvent): Record<string, unknown> {
    return { $implicit: event.item, index: event.index, role: event.role };
  }

  protected rowTabIndex(index: number): number {
    if (!this.interactive || this.disabled) return -1;
    const focused = this.focusedIndex >= 0 ? this.focusedIndex : 0;
    return index === focused ? 0 : -1;
  }

  // ---------------------------------------------------------------------------------------------
  // Interaction — `interactive` only
  // ---------------------------------------------------------------------------------------------

  protected onRowClick(event: RenderedEvent): void {
    if (!this.interactive || this.disabled) return;
    this.focusRow(event.index);
    this.itemSelect.emit({ item: event.item, index: event.index });
  }

  protected onRowFocus(index: number): void {
    if (!this.interactive) return;
    this.focusedIndex = index;
    this.focusedIndexChange.emit(index);
  }

  protected onRowKeydown(nativeEvent: KeyboardEvent, index: number): void {
    if (!this.interactive || this.disabled) return;
    const count = this.value.length;
    if (count === 0) return;

    const isVertical = this.layout === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    let target: number | null = null;
    switch (nativeEvent.key) {
      case nextKey:
        target = Math.min(count - 1, index + 1);
        break;
      case prevKey:
        target = Math.max(0, index - 1);
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = count - 1;
        break;
      case 'Enter':
      case ' ':
        nativeEvent.preventDefault();
        this.itemSelect.emit({ item: this.value[index], index });
        return;
      default:
        return;
    }

    nativeEvent.preventDefault();
    this.focusRow(target);
  }

  private focusRow(index: number): void {
    this.focusedIndex = index;
    this.focusedIndexChange.emit(index);
    queueMicrotask(() => {
      const root = this.rootElement;
      const row = root?.querySelector<HTMLElement>(`.ino-timeline__row[data-index="${index}"]`);
      row?.focus();
    });
  }

  private get rootElement(): HTMLElement | null {
    return this.host.nativeElement ?? null;
  }

  protected resolveSide(index: number): 'start' | 'end' {
    if (this.align === 'end') return 'end';
    if (this.align === 'alternate') return index % 2 === 0 ? 'start' : 'end';
    return 'start';
  }
}
