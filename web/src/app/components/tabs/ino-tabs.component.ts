import {
  AfterContentInit,
  AfterViewInit,
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
  ViewChild,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { InoControlSize } from '../control-size';
import { InoTabPanelComponent } from './ino-tab-panel.component';

/**
 * `<ino-tabs>` — a WAI-ARIA APG "Tabs (automatic activation)" tablist, driven by content-projected
 * `<ino-tab-panel>` children rather than a `tabs: InoTabItem[]` data `@Input` (see that
 * component's doc comment for why). React Native and Flutter ship a presentational-controlled tab
 * *strip* only (`InoTabs.tsx` / `ino_tabs.dart`); the OS-level bottom tab bar is a different,
 * not-yet-built component — see SPEC.md §9.
 *
 * Controlled/uncontrolled: bind `[activeId]` + `(activeIdChange)` for a controlled tablist (the
 * consumer owns which tab is active, same two-way-bindable shape as `ino-select`'s `value`); omit
 * `activeId` entirely for uncontrolled mode, where the component picks the first enabled panel and
 * owns selection itself from then on. This is the same "controlled if bound, else internal state"
 * split most of this library's `@Input`s already have implicitly — spelled out here because the
 * issue calls it out explicitly as its own required mode.
 *
 * `scrollable` turns on horizontal scroll + prev/next buttons for a tab strip wider than its
 * container (a long, dynamic list of document tabs); the non-scrollable default assumes the tab
 * set fits and lets it overflow visually if it doesn't, matching PrimeNG's default/`scrollable`
 * split (`specs/primeng/llms-22.1.1.txt`, `Tabs`).
 *
 * `readonly` keeps the roving-tabindex focus model (arrow keys still move focus across tabs) but
 * blocks activation — for an audit trail showing which step was selected historically without
 * letting the current viewer change it, the same "focusable but inert" contract `ino-input`'s
 * `readonly` already documents for a single field.
 */
@Component({
  selector: 'ino-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-tabs.component.html',
  styleUrl: './ino-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-tabs',
    '[attr.data-size]': 'size',
    '[class.ino-tabs--scrollable]': 'scrollable',
  },
})
export class InoTabsComponent implements AfterContentInit, AfterViewInit, OnDestroy {
  @Input() activeId?: string;
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) scrollable = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Output() activeIdChange = new EventEmitter<string>();
  @Output() tabClose = new EventEmitter<string>();

  @ContentChildren(InoTabPanelComponent) private panelsQuery!: QueryList<InoTabPanelComponent>;
  @ViewChild('track') private trackRef?: ElementRef<HTMLElement>;

  protected panels: InoTabPanelComponent[] = [];
  private internalActiveId?: string;
  private resizeObserver?: ResizeObserver;
  private panelsSub?: Subscription;
  protected hasOverflow = false;

  /** OnPush + a ResizeObserver callback: the observer fires outside any template event, so
   *  `hasOverflow` flipping would not repaint the prev/next buttons without an explicit
   *  `markForCheck()`. Same reason `@ContentChildren.changes` below needs one. */
  private readonly cdr = inject(ChangeDetectorRef);

  private get isControlled(): boolean {
    return this.activeId !== undefined;
  }

  protected get currentActiveId(): string | undefined {
    return this.isControlled ? this.activeId : this.internalActiveId;
  }

  ngAfterContentInit(): void {
    this.syncPanels();
    this.panelsSub = this.panelsQuery.changes.subscribe(() => this.syncPanels());
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined' || !this.trackRef) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.checkOverflow());
    this.resizeObserver.observe(this.trackRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.panelsSub?.unsubscribe();
  }

  private syncPanels(): void {
    this.panels = this.panelsQuery.toArray();
    if (!this.isControlled && (!this.internalActiveId || !this.panels.some(p => p.id === this.internalActiveId))) {
      this.internalActiveId = this.panels.find(p => !p.disabled)?.id;
    }
    this.applyActiveState();
    this.cdr.markForCheck();
    queueMicrotask(() => this.checkOverflow());
  }

  private applyActiveState(): void {
    const active = this.currentActiveId;
    for (const panel of this.panels) {
      panel.setActive(panel.id === active);
    }
  }

  private checkOverflow(): void {
    const el = this.trackRef?.nativeElement;
    if (!el) {
      return;
    }
    const next = el.scrollWidth > el.clientWidth + 1;
    if (next !== this.hasOverflow) {
      this.hasOverflow = next;
      this.cdr.markForCheck();
    }
  }

  protected selectTab(panel: InoTabPanelComponent): void {
    if (panel.disabled || this.readonly || panel.id === this.currentActiveId) {
      return;
    }
    if (!this.isControlled) {
      this.internalActiveId = panel.id;
      this.applyActiveState();
    }
    this.activeIdChange.emit(panel.id);
    this.scrollIntoView(panel.id);
  }

  /** Close is a *request*, not a mutation: this component never removes a panel from the DOM (it
   *  doesn't own the `*ngFor`/`@for` that produced it). The consumer drops the panel from its own
   *  list on `(tabClose)`, and the next `@ContentChildren.changes` tick re-picks an active tab if
   *  the closed one was it — see `syncPanels()`. Blocked by `readonly` for the same reason
   *  activation is: a locked audit view must not be able to discard a step. */
  protected closeTab(event: Event, panel: InoTabPanelComponent): void {
    event.stopPropagation();
    if (this.readonly || panel.disabled || !panel.closable) {
      return;
    }
    this.tabClose.emit(panel.id);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const enabled = this.panels
      .map((panel, i) => ({ panel, i }))
      .filter(({ panel }) => !panel.disabled);
    if (enabled.length === 0) {
      return;
    }
    const rtl = this.isRtl();
    let targetIndex: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
        targetIndex = this.nextEnabledIndex(index, rtl ? -1 : 1, enabled.map(e => e.i));
        break;
      case 'ArrowLeft':
        targetIndex = this.nextEnabledIndex(index, rtl ? 1 : -1, enabled.map(e => e.i));
        break;
      case 'Home':
        targetIndex = enabled[0].i;
        break;
      case 'End':
        targetIndex = enabled[enabled.length - 1].i;
        break;
      case 'Enter':
      case ' ':
        this.selectTab(this.panels[index]);
        event.preventDefault();
        return;
      // APG "Tabs with close buttons": Delete (and Backspace, which is what a Mac keyboard's
      // unmodified Delete key actually emits) closes the focused tab. This is the keyboard path
      // to the ✕ affordance, which is deliberately not a nested control — see the template.
      case 'Delete':
      case 'Backspace':
        if (this.panels[index]?.closable) {
          event.preventDefault();
          this.closeTab(event, this.panels[index]);
        }
        return;
      default:
        return;
    }

    if (targetIndex === undefined) {
      return;
    }
    event.preventDefault();
    this.focusAndSelect(targetIndex);
  }

  private nextEnabledIndex(from: number, step: 1 | -1, enabledIndexes: number[]): number {
    const count = this.panels.length;
    let i = from;
    for (let attempts = 0; attempts < count; attempts++) {
      i = (i + step + count) % count;
      if (enabledIndexes.includes(i)) {
        return i;
      }
    }
    return from;
  }

  private focusAndSelect(index: number): void {
    const el = this.trackRef?.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[index];
    el?.focus();
    this.selectTab(this.panels[index]);
  }

  private isRtl(): boolean {
    const host = this.trackRef?.nativeElement;
    return !!host && getComputedStyle(host).direction === 'rtl';
  }

  private scrollIntoView(id: string): void {
    if (!this.scrollable || !this.trackRef) {
      return;
    }
    const index = this.panels.findIndex(p => p.id === id);
    const el = this.trackRef.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[index];
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** `direction` is LOGICAL (+1 = "forward", i.e. towards the end of the reading order), but
   *  `ScrollToOptions.left` is physical. In RTL the forward direction is negative-x, so the sign
   *  flips — without this, the ‹/› buttons scroll the wrong way on an Arabic/Hebrew locale even
   *  though the stylesheet itself is fully logical. */
  protected scrollBy(direction: 1 | -1): void {
    const el = this.trackRef?.nativeElement;
    if (!el) {
      return;
    }
    const sign = this.isRtl() ? -1 : 1;
    el.scrollBy({
      left: sign * direction * el.clientWidth * 0.6,
      behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  /** Motion contract (DoD row 7): `scroll-behavior: smooth` is a *script*-driven animation here,
   *  so the CSS `prefers-reduced-motion` branch in the stylesheet cannot reach it — the media
   *  query has to be read from JS and the scroll made instantaneous instead. */
  private prefersReducedMotion(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
