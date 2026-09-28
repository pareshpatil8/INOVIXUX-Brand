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
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { InoControlSize } from '../control-size';
import { InoTabPanelComponent } from './ino-tab-panel.component';

export type InoTabsOrientation = 'horizontal' | 'vertical';

/**
 * `<ino-tabs>` — a WAI-ARIA APG "Tabs (automatic activation)" tablist, driven by content-projected
 * `<ino-tab-panel>` children rather than a `tabs: InoTabItem[]` data `@Input` (see that
 * component's doc comment for why). Recovered to full DS parity by INO-361 after the original
 * richer branch (#17) was closed without its web deltas landing — see SPEC.md §1 for the full
 * capability list and §2 for the selection-model decision below.
 *
 * Controlled/uncontrolled: bind `[activeIndex]` + `(activeIndexChange)` for a controlled tablist
 * (the consumer owns which tab is active); omit `activeIndex` entirely for uncontrolled mode,
 * where the component picks the first enabled panel and owns selection itself from then on.
 *
 * **Selection is index-based, not id-based** (SPEC.md §2) — matching this repo's pre-existing
 * `[(activeIndex)]` precedent and the already-merged React Native / Flutter ports, both of which
 * are controlled-only and index-based by their own design (see their doc comments).
 *
 * `orientation` (horizontal/vertical) is preserved from the version already on `main`; `scrollable`
 * turns on horizontal scroll + prev/next buttons for a tab strip wider than its container.
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
    '[attr.data-orientation]': 'orientation',
    '[class.ino-tabs--scrollable]': 'scrollable',
  },
})
export class InoTabsComponent implements AfterContentInit, AfterViewInit, OnDestroy {
  @Input({ transform: numberAttribute }) activeIndex?: number;
  @Input() orientation: InoTabsOrientation = 'horizontal';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) scrollable = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Output() activeIndexChange = new EventEmitter<number>();
  @Output() tabClose = new EventEmitter<number>();

  @ContentChildren(InoTabPanelComponent) private panelsQuery!: QueryList<InoTabPanelComponent>;
  @ViewChild('track') private trackRef?: ElementRef<HTMLElement>;

  protected panels: InoTabPanelComponent[] = [];
  private internalActiveIndex?: number;
  private resizeObserver?: ResizeObserver;
  private panelsSub?: Subscription;
  protected hasOverflow = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  private get isControlled(): boolean {
    return this.activeIndex !== undefined;
  }

  protected get currentActiveIndex(): number | undefined {
    const index = this.isControlled ? this.activeIndex : this.internalActiveIndex;
    if (index === undefined || !this.panels.length) {
      return index;
    }
    return Math.min(Math.max(0, index), this.panels.length - 1);
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
    if (
      !this.isControlled &&
      (this.internalActiveIndex === undefined ||
        this.internalActiveIndex >= this.panels.length ||
        this.panels[this.internalActiveIndex]?.disabled)
    ) {
      const firstEnabled = this.panels.findIndex((p) => !p.disabled);
      this.internalActiveIndex = firstEnabled === -1 ? undefined : firstEnabled;
    }
    this.applyActiveState();
    this.cdr.markForCheck();
    queueMicrotask(() => this.checkOverflow());
  }

  private applyActiveState(): void {
    const active = this.currentActiveIndex;
    this.panels.forEach((panel, index) => {
      panel.active = index === active;
    });
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

  protected selectTab(index: number): void {
    const panel = this.panels[index];
    if (!panel || panel.disabled || this.readonly || index === this.currentActiveIndex) {
      return;
    }
    if (!this.isControlled) {
      this.internalActiveIndex = index;
      this.applyActiveState();
    }
    this.activeIndexChange.emit(index);
    this.scrollIntoView(index);
  }

  /** Close is a *request*, not a mutation: this component never removes a panel from the DOM (it
   *  doesn't own the `*ngFor`/`@for` that produced it). The consumer drops the panel from its own
   *  list on `(tabClose)`, and the next `@ContentChildren.changes` tick re-picks an active tab if
   *  the closed one was it — see `syncPanels()`. Blocked by `readonly` for the same reason
   *  activation is: a locked audit view must not be able to discard a step. */
  protected closeTab(event: Event, index: number): void {
    event.stopPropagation();
    const panel = this.panels[index];
    if (this.readonly || !panel || panel.disabled || !panel.closable) {
      return;
    }
    this.tabClose.emit(index);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const enabled = this.panels.map((panel, i) => ({ panel, i })).filter(({ panel }) => !panel.disabled);
    if (enabled.length === 0) {
      return;
    }
    const horizontal = this.orientation === 'horizontal';
    const rtl = horizontal && this.isRtl();
    const forwardKey = horizontal ? 'ArrowRight' : 'ArrowDown';
    const backwardKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
    let targetIndex: number | undefined;

    switch (event.key) {
      case forwardKey:
        targetIndex = this.nextEnabledIndex(index, rtl ? -1 : 1, enabled.map((e) => e.i));
        break;
      case backwardKey:
        targetIndex = this.nextEnabledIndex(index, rtl ? 1 : -1, enabled.map((e) => e.i));
        break;
      case 'Home':
        targetIndex = enabled[0].i;
        break;
      case 'End':
        targetIndex = enabled[enabled.length - 1].i;
        break;
      case 'Enter':
      case ' ':
        this.selectTab(index);
        event.preventDefault();
        return;
      // APG "Tabs with close buttons": Delete (and Backspace, which is what a Mac keyboard's
      // unmodified Delete key actually emits) closes the focused tab. This is the keyboard path
      // to the ✕ affordance, which is deliberately not a nested control — see the template.
      case 'Delete':
      case 'Backspace':
        if (this.panels[index]?.closable) {
          event.preventDefault();
          this.closeTab(event, index);
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
    this.selectTab(index);
  }

  private isRtl(): boolean {
    const host = this.trackRef?.nativeElement;
    return !!host && getComputedStyle(host).direction === 'rtl';
  }

  private scrollIntoView(index: number): void {
    if (!this.scrollable || !this.trackRef || this.orientation !== 'horizontal') {
      return;
    }
    const el = this.trackRef.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[index];
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** `direction` is LOGICAL (+1 = "forward", i.e. towards the end of the reading order), but
   *  `ScrollToOptions.left` is physical. In RTL the forward direction is negative-x, so the sign
   *  flips — without this, the ‹/› buttons scroll the wrong way on an Arabic/Hebrew locale even
   *  though the stylesheet itself is fully logical. Horizontal-only: `scrollable` is not currently
   *  supported for `orientation="vertical"` (SPEC.md §4). */
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
