import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoDockItem, InoDockPosition, InoDockSize } from './ino-dock.types';

/**
 * `<ino-dock>` — a horizontal/vertical strip of icon buttons with macOS-style magnify-on-hover
 * (PrimeNG 22.1.1 `Dock` is the parity benchmark — a benchmark only, nothing here imports it;
 * same repo-wide stance every SPEC records). Contract: INO-481 (INO-31 B5, doc 26 §5 row
 * "ino-dock"); decisions record `SPEC.md` in this directory.
 *
 * A11y: WAI-ARIA APG Menubar (`role="menubar"`/`"menuitem"`), one roving tab stop. Arrow keys
 * move among items and wrap; which pair moves depends on `position` (SPEC.md §5) — ArrowLeft/
 * Right for `bottom` (horizontal), ArrowUp/Down for `side` (vertical) — matching `<ino-megamenu>`'s
 * orientation-aware mapping. Disabled items are skipped by the roving navigation, never
 * activatable, and never magnify (SPEC.md §4).
 *
 * Sizing (`size: 'sm' | 'md' | 'lg'`) and `position` are fixed-geometry layout axes, not the
 * shared `InoControlSize` token scale: a dock is floating chrome, not a form row, so (like
 * `<ino-speeddial>`'s FAB) the dense register must never resize it (SPEC.md §3).
 *
 * Magnify-on-hover is pure CSS (`:hover`/`:focus-visible` transform scale) gated behind
 * `@media (prefers-reduced-motion: reduce)`, which resets the transform outright rather than
 * only dropping the transition — the same idiom `ino-modal` uses — so the effect is fully off,
 * not merely instant (SPEC.md §4).
 */
@Component({
  selector: 'ino-dock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-dock.component.html',
  styleUrl: './ino-dock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-dock',
    '[attr.data-position]': 'position',
    '[attr.data-size]': 'size',
  },
})
export class InoDockComponent {
  @Input() items: InoDockItem[] = [];

  /** `bottom` (horizontal row) or `side` (vertical column). Default `bottom`. `side` renders
   *  with a left-edge-flavored label placement by default (SPEC.md §2) — the consumer anchors
   *  the host to whichever physical edge it needs, same as `<ino-speeddial>`. */
  @Input() position: InoDockPosition = 'bottom';

  /** Icon/button size — fixed geometry, see SPEC.md §3. */
  @Input() size: InoDockSize = 'md';

  /** Marks the item whose `id` matches as the current/active item (SPEC.md §6 "active-item") —
   *  `aria-current` + accent styling. `null` (default): no item is marked active. */
  @Input() activeId: string | null = null;

  /** Accessible name for the `menubar`. */
  @Input() ariaLabel = 'Application dock';

  /** Disables magnify-on-hover independent of `prefers-reduced-motion`, e.g. for a docs-page
   *  "motion off" toggle. Reduced motion always wins regardless of this flag. */
  @Input({ transform: booleanAttribute }) magnify = true;

  /** Emits when an item is activated (click, or Enter/Space on the focused item). */
  @Output() itemClick = new EventEmitter<{ originalEvent: Event; item: InoDockItem }>();

  /** Roving-tabindex position, in full `items` space. */
  protected focusedIndex = 0;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly cdr: ChangeDetectorRef
  ) {}

  protected get orientation(): 'horizontal' | 'vertical' {
    return this.position === 'side' ? 'vertical' : 'horizontal';
  }

  protected isActive(item: InoDockItem): boolean {
    return item.id != null && item.id === this.activeId;
  }

  protected tabIndexFor(item: InoDockItem, index: number): number {
    if (item.disabled) {
      return -1;
    }
    const navigable = this.navigableItems();
    if (navigable.length === 0) {
      return -1;
    }
    const target = navigable.includes(this.items[this.focusedIndex])
      ? this.focusedIndex
      : this.items.indexOf(navigable[0]);
    return index === target ? 0 : -1;
  }

  protected labelFor(item: InoDockItem): string {
    return item.tooltip || item.label;
  }

  protected onItemFocus(index: number): void {
    this.focusedIndex = index;
  }

  protected onActivate(event: Event, item: InoDockItem, index: number): void {
    if (item.disabled) {
      return;
    }
    this.focusedIndex = index;
    item.command?.({ originalEvent: event, item });
    this.itemClick.emit({ originalEvent: event, item });
  }

  /** Orientation-aware roving tabindex (SPEC.md §5): ArrowLeft/Right for `bottom`, ArrowUp/Down
   *  for `side`; Home/End jump; disabled items are skipped entirely. */
  protected onKeydown(event: KeyboardEvent): void {
    const navigable = this.navigableItems();
    if (navigable.length === 0) {
      return;
    }
    const [prevKey, nextKey] =
      this.orientation === 'vertical' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    const current = navigable.indexOf(this.items[this.focusedIndex]);

    let nextNavigableIndex = -1;
    switch (event.key) {
      case nextKey:
        nextNavigableIndex = current >= 0 ? (current + 1) % navigable.length : 0;
        break;
      case prevKey:
        nextNavigableIndex =
          current >= 0 ? (current - 1 + navigable.length) % navigable.length : navigable.length - 1;
        break;
      case 'Home':
        nextNavigableIndex = 0;
        break;
      case 'End':
        nextNavigableIndex = navigable.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const item = navigable[nextNavigableIndex];
    const fullIndex = this.items.indexOf(item);
    this.focusedIndex = fullIndex;
    this.cdr.markForCheck();
    queueMicrotask(() => {
      const buttons = this.el.nativeElement.querySelectorAll<HTMLButtonElement>('.ino-dock__btn');
      buttons[fullIndex]?.focus();
    });
  }

  private navigableItems(): InoDockItem[] {
    return this.items.filter((item) => !item.disabled);
  }

  protected trackByIndex(index: number): number {
    return index;
  }
}
