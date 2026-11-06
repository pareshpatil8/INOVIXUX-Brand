import { AfterContentInit, ChangeDetectionStrategy, Component, ContentChildren, Input, QueryList, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoAccordionTabComponent } from './ino-accordion-tab.component';

/**
 * `<ino-accordion>` — container for collapsible accordion tabs with mutual-exclusion support
 * (single-expand mode). Parity benchmark: PrimeNG `Accordion`. Spec seed: doc 26 §5 Phase B2 —
 * "single/multiple expand; icon position; nested", `expanded`/`disabled-panel` states,
 * compact/comfortable sizing, APG accordion pattern (heading+button, Arrow keys).
 *
 * `multiple` controls the expand mode: when `false` (default), opening one tab closes all others
 * (radio-like mutual exclusion); when `true`, any number of tabs can be open simultaneously.
 * Both modes follow the WAI-ARIA APG accordion pattern: each tab header is a `<button>` wrapped
 * in a heading element, with `aria-expanded` + `aria-controls` pointing at the panel region.
 *
 * `size` ('compact' | 'comfortable', default 'comfortable') scales tab header/body padding via
 * `--ino-control-padding-inline-roomy(-sm)` — doc 26 says "compact/comfortable" rather than the
 * full sm/md/lg scale. Reading the bare alias means `[data-density]` composes for free.
 *
 * `iconPosition` ('start' | 'end', default 'start') controls chevron placement. Start is the
 * PrimeNG default; end matches some enterprise UIs where the chevron reads as a disclosure hint
 * rather than a visual bullet.
 *
 * `disabled` dims the whole accordion and locks all tab toggles; individual tabs can also be
 * disabled independently via their own `disabled` input. `loading` dims all panels and shows
 * spinners (`aria-busy` on the accordion shell).
 *
 * Arrow-key navigation (APG): Up/Down moves focus between tab headers, wrapping at edges; Home/End
 * jumps to first/last. Each header is tabbable only when focused (roving tabindex), not all at
 * once — the accordion is a single tab stop from the outside. See SPEC.md.
 */
@Component({
  selector: 'ino-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-accordion.component.html',
  styleUrl: './ino-accordion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ino-accordion',
    '[class.ino-accordion--compact]': "size === 'compact'",
    '[class.ino-accordion--disabled]': 'disabled',
    '[class.ino-accordion--loading]': 'loading',
    '[attr.aria-busy]': 'loading ? "true" : null',
    '[attr.aria-disabled]': 'disabled ? "true" : null',
  },
})
export class InoAccordionComponent implements AfterContentInit {
  @Input({ transform: booleanAttribute }) multiple = false;
  @Input() size: 'compact' | 'comfortable' = 'comfortable';
  @Input() iconPosition: 'start' | 'end' = 'start';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;

  @ContentChildren(InoAccordionTabComponent) tabs!: QueryList<InoAccordionTabComponent>;

  ngAfterContentInit(): void {
    // Set parent reference on all tabs for mutual-exclusion coordination
    this.tabs.forEach((tab) => {
      tab.accordion = this;
      tab.iconPosition = this.iconPosition;
      tab.size = this.size;
    });
  }

  /**
   * Called by a tab when it wants to expand. In single-expand mode, closes all other tabs first.
   */
  onTabOpen(openingTab: InoAccordionTabComponent): void {
    if (!this.multiple) {
      this.tabs.forEach((tab) => {
        if (tab !== openingTab && tab.expanded) {
          tab.collapse();
        }
      });
    }
  }

  /**
   * Move focus to the next/previous tab header (Arrow keys, APG pattern).
   */
  focusTab(currentIndex: number, delta: number): void {
    const tabArray = this.tabs.toArray();
    const nextIndex = (currentIndex + delta + tabArray.length) % tabArray.length;
    tabArray[nextIndex]?.focusHeader();
  }

  /**
   * Move focus to first/last tab (Home/End keys, APG pattern).
   */
  focusFirstTab(): void {
    this.tabs.first?.focusHeader();
  }

  focusLastTab(): void {
    this.tabs.last?.focusHeader();
  }

  getTabIndex(tab: InoAccordionTabComponent): number {
    return this.tabs.toArray().indexOf(tab);
  }
}
