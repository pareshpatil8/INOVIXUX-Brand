import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  QueryList,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { InoControlSize } from '../control-size';
import { InoTabComponent } from './ino-tab.component';

export type InoTabsOrientation = 'horizontal' | 'vertical';

/**
 * `<ino-tabs>` — container grouping content behind a tablist (T-26 / INO-31 F-1). Parity
 * benchmark: PrimeNG `Tabs` (`specs/primeng/llms-22.1.1.txt` line 116, "container component to
 * group content with tabs") — a benchmark, not a runtime dependency.
 *
 * Composition, not a data-driven `items` @Input: unlike `ino-meter-group`'s scalar segments, a tab
 * panel's body is arbitrary markup, so each tab is a real projected `<ino-tab>` child component
 * (`@ContentChildren`), the same container/leaf split `ino-drawer`/`ino-modal` use for their own
 * named-slot children. See SPEC.md §1 for the automatic-activation keyboard model.
 *
 * ```html
 * <ino-tabs [(activeIndex)]="tab">
 *   <ino-tab label="Details">…</ino-tab>
 *   <ino-tab label="History" [disabled]="true">…</ino-tab>
 * </ino-tabs>
 * ```
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
    '[attr.data-orientation]': 'orientation',
    '[attr.data-size]': 'size',
  },
})
export class InoTabsComponent implements AfterContentInit, OnDestroy {
  @Input({ transform: numberAttribute }) activeIndex = 0;
  @Output() activeIndexChange = new EventEmitter<number>();
  @Input() orientation: InoTabsOrientation = 'horizontal';
  @Input() size: InoControlSize = 'default';

  @ContentChildren(InoTabComponent) private tabQuery!: QueryList<InoTabComponent>;

  protected tabs: InoTabComponent[] = [];
  private subscription: Subscription | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterContentInit(): void {
    this.syncTabs();
    this.subscription = this.tabQuery.changes.subscribe(() => this.syncTabs());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  protected tabIdFor(tab: InoTabComponent): string {
    return tab.tabId;
  }

  protected isActive(tab: InoTabComponent): boolean {
    return this.tabs.indexOf(tab) === this.clampedIndex;
  }

  protected select(tab: InoTabComponent): void {
    if (tab.disabled) {
      return;
    }
    const index = this.tabs.indexOf(tab);
    if (index === -1 || index === this.clampedIndex) {
      return;
    }
    this.activeIndex = index;
    this.activeIndexChange.emit(index);
    this.applyActive();
  }

  /** Automatic-activation roving tabindex (SPEC.md §1): ArrowRight/Down move to and select the
   *  next enabled tab, ArrowLeft/Up the previous, Home/End jump to the first/last enabled tab.
   *  Disabled tabs are skipped, never focused. */
  protected onKeydown(event: KeyboardEvent, tab: InoTabComponent): void {
    const enabled = this.tabs.filter((t) => !t.disabled);
    if (!enabled.length) {
      return;
    }
    const currentEnabledIndex = enabled.indexOf(tab);
    let nextEnabledIndex: number | null = null;

    const isNext = this.orientation === 'horizontal' ? event.key === 'ArrowRight' : event.key === 'ArrowDown';
    const isPrev = this.orientation === 'horizontal' ? event.key === 'ArrowLeft' : event.key === 'ArrowUp';

    if (isNext) {
      nextEnabledIndex = (currentEnabledIndex + 1) % enabled.length;
    } else if (isPrev) {
      nextEnabledIndex = (currentEnabledIndex - 1 + enabled.length) % enabled.length;
    } else if (event.key === 'Home') {
      nextEnabledIndex = 0;
    } else if (event.key === 'End') {
      nextEnabledIndex = enabled.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = enabled[nextEnabledIndex];
    this.select(nextTab);
    this.focusTab(nextTab);
  }

  private get clampedIndex(): number {
    if (!this.tabs.length) {
      return 0;
    }
    return Math.min(Math.max(0, this.activeIndex), this.tabs.length - 1);
  }

  private syncTabs(): void {
    this.tabs = this.tabQuery.toArray();
    this.applyActive();
  }

  private applyActive(): void {
    const activeTab = this.tabs[this.clampedIndex];
    for (const tab of this.tabs) {
      tab.active = tab === activeTab;
    }
    this.cdr.markForCheck();
  }

  private focusTab(tab: InoTabComponent): void {
    queueMicrotask(() => {
      document.getElementById(tab.tabId)?.focus();
    });
  }
}
