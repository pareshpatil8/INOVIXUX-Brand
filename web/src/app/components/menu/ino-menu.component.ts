import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { InoOverlayPosition, computeOverlayPlacement } from '../overlay/overlay-position';

let menuIdCounter = 0;

/** One actionable (or submenu-opening) entry. `href` is an in-app route (RouterLink), same
 * convention as `InoBreadcrumbItem.href` / `InoContextMenuItem` — it renders on a `role="menuitem"`
 * element, not a bare, role-less `<a>`, because an APG menu item is never just "a link" even when
 * it happens to navigate. `children` is unbounded depth — this is the one shape that absorbs
 * PrimeNG `TieredMenu` into `ino-menu` per doc 26 §5's row. See SPEC.md §3. */
export interface InoMenuItem {
  label: string;
  /** Leading glyph, `aria-hidden` — same string-ligature convention as `InoBreadcrumbItem.icon` /
   * `InoContextMenuItem.icon`. */
  icon?: string;
  href?: string;
  command?: (item: InoMenuItem) => void;
  /** Inert, skipped entirely by keyboard navigation, typeahead and clicks. */
  disabled?: boolean;
  /** Nested submenu — unbounded depth. */
  children?: InoMenuItem[];
}

/** One labelled (or unlabelled) group of items for the `sections` input. See SPEC.md §1 for the
 * `sections`-over-`items` precedence rule. */
export interface InoMenuSection {
  /** Omit for an unlabelled group — it still renders a `role="separator"` above it when it is not
   * the first group. See SPEC.md §6. */
  label?: string;
  items: InoMenuItem[];
}

export type InoMenuMode = 'static' | 'popup';
export type InoMenuSize = 'compact' | 'comfortable';

interface InoMenuRenderGroup {
  label: string | null;
  items: InoMenuItem[];
  separatorBefore: boolean;
}

/**
 * `<ino-menu>` — vertical menu, rendered either inline (`mode="static"`, e.g. a sidebar) or as a
 * popup opened from a trigger button (`mode="popup"`). Absorbs PrimeNG `Menu` (flat case) and
 * `TieredMenu` (nested-submenu case) into one component, per doc 26 §5's `ino-menu` row. Spec
 * source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 (rev-2
 * amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377). Issue:
 * [INO-425](/INO/issues/INO-425). Parity benchmark: PrimeNG 22.1.1 `Menu`/`TieredMenu`
 * (`specs/primeng/llms-22.1.1.txt`) — a benchmark only, nothing here imports it.
 *
 * WAI-ARIA APG menu + menubutton pattern: `role="menu"` on the host (static) or the popup panel
 * (popup), `role="menuitem"` per actionable entry, roving `tabindex` (not
 * `aria-activedescendant` — SPEC.md §4), full Arrow/Home/End/Escape/typeahead keyboard map
 * (SPEC.md §5).
 *
 * Imperative popup API — call `show()`/`toggle()` from the trigger's own click handler
 * (PrimeNG-style, anchor inferred from the event's `currentTarget` if `[anchor]` wasn't bound),
 * the same documented convention `<ino-popover>` uses. `ino-split-button` (B2, built after this
 * issue per doc 26 §5) reuses this API for its secondary-actions menu:
 * ```html
 * <button #trigger type="button" (click)="menu.toggle($event)">Actions</button>
 * <ino-menu #menu mode="popup" [items]="actions"></ino-menu>
 * ```
 *
 * Positioning reuses the shared `computeOverlayPlacement` primitive
 * (`../overlay/overlay-position.ts`, INO-271) directly rather than wrapping `<ino-popover>` — a
 * popover's `role="dialog"` + mandatory heading contract is the wrong semantic shape for an APG
 * `role="menu"`; `ino-context-menu` (INO-427) makes the same call for the same reason. See
 * SPEC.md §2.
 *
 * `size` reads the bare `--ino-control-*` aliases for `comfortable` (the unmarked default, same
 * "no size class needed" convention `ino-toggle-button`'s default tier uses) and re-points them to
 * the `--ino-control-*-compact` tier under `[data-size='compact']` — the exact re-point pattern
 * `ino-toggle-button.component.scss` uses for its own sm/lg tiers. See SPEC.md §7.
 *
 * Contract: `web/src/app/components/menu/SPEC.md`.
 */
@Component({
  selector: 'ino-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ino-menu.component.html',
  styleUrl: './ino-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': "mode === 'static' ? 'menu' : null",
    '[attr.aria-label]': "mode === 'static' ? ariaLabel : null",
    '[attr.data-size]': 'size',
    '[attr.data-mode]': 'mode',
  },
})
export class InoMenuComponent implements OnChanges, OnDestroy {
  @Input() items: InoMenuItem[] = [];
  @Input() sections: InoMenuSection[] | null = null;
  @Input() mode: InoMenuMode = 'static';
  @Input() open = false;
  @Input() anchor: HTMLElement | ElementRef<HTMLElement> | null = null;
  @Input() position: InoOverlayPosition = 'bottom';
  @Input() size: InoMenuSize = 'comfortable';
  @Input() ariaLabel = 'Menu';
  /** Placeholder text for the "zero actionable entries" empty state. See SPEC.md §8. */
  @Input() emptyLabel = 'No items';

  @Output() openChange = new EventEmitter<boolean>();

  @ViewChild('popupPanel') private popupPanelRef?: ElementRef<HTMLElement>;

  protected popupTop = 0;
  protected popupLeft = 0;

  /** Chain of currently-open submenu items, root-first — `openPath[0]` is the depth-0 item whose
   * submenu is open, `openPath[1]` the item within *that* submenu whose own submenu is open, and
   * so on. Empty = no submenu open anywhere. See SPEC.md §4. */
  protected openPath: InoMenuItem[] = [];
  /** Roving-tabindex marker per depth — `focusedByDepth[d]` is the item that currently holds
   * `tabindex="0"` among the items rendered at depth `d`. See SPEC.md §4. */
  protected focusedByDepth: (InoMenuItem | undefined)[] = [];

  private readonly hostRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly instanceId = ++menuIdCounter;
  private readonly itemIds = new WeakMap<InoMenuItem, string>();
  private idCounter = 0;
  private readonly submenuPositions = new Map<InoMenuItem, { top: number; left: number }>();

  private isOpenState = false;
  private anchorEl: HTMLElement | null = null;
  private outsideClickBound = false;
  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    const panel = this.popupPanelRef?.nativeElement;
    const anchorEl = this.resolveAnchorEl();
    if (panel?.contains(target) || anchorEl?.contains(target)) {
      return;
    }
    this.hide();
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      this.applyOpenState(this.open);
    }
  }

  ngOnDestroy(): void {
    this.unbindGlobalListeners();
    if (this.typeaheadTimer) {
      clearTimeout(this.typeaheadTimer);
    }
  }

  /**
   * Opens the popup. `event`, when passed (the trigger's own click handler), supplies the anchor
   * via `event.currentTarget` when `[anchor]` wasn't bound — the same PrimeNG-style convenience
   * `<ino-popover>.show()` documents.
   */
  show(event?: Event): void {
    if (this.isOpenState) {
      return;
    }
    this.anchorEl = (event?.currentTarget as HTMLElement | null) ?? this.anchorEl;
    this.open = true;
    this.applyOpenState(true);
  }

  hide(): void {
    this.open = false;
    this.applyOpenState(false);
  }

  toggle(event?: Event): void {
    if (this.isOpenState) {
      this.hide();
    } else {
      this.show(event);
    }
  }

  protected get rootGroups(): InoMenuRenderGroup[] {
    if (this.sections !== null) {
      return (this.sections ?? [])
        .filter((section) => section.items && section.items.length > 0)
        .map((section, index) => ({
          label: section.label ?? null,
          items: section.items,
          separatorBefore: index > 0,
        }));
    }
    return this.items.length ? [{ label: null, items: this.items, separatorBefore: false }] : [];
  }

  protected get isGrouped(): boolean {
    return this.sections !== null;
  }

  protected get rootFlatItems(): InoMenuItem[] {
    return this.rootGroups.flatMap((group) => group.items);
  }

  protected get isEmpty(): boolean {
    return this.rootFlatItems.length === 0;
  }

  protected itemsAtDepth(depth: number): InoMenuItem[] {
    if (depth === 0) {
      return this.rootFlatItems;
    }
    const parent = this.openPath[depth - 1];
    return parent?.children ?? [];
  }

  protected hasChildren(item: InoMenuItem): boolean {
    return !!item.children && item.children.length > 0;
  }

  protected isSubmenuOpen(depth: number, item: InoMenuItem): boolean {
    return this.openPath[depth] === item;
  }

  protected isFocused(depth: number, item: InoMenuItem): boolean {
    return this.focusedByDepth[depth] === item;
  }

  protected submenuPosition(item: InoMenuItem): { top: number; left: number } | undefined {
    return this.submenuPositions.get(item);
  }

  protected itemId(item: InoMenuItem): string {
    let id = this.itemIds.get(item);
    if (!id) {
      id = `ino-menu-${this.instanceId}-item-${++this.idCounter}`;
      this.itemIds.set(item, id);
    }
    return id;
  }

  protected trackByItem(_: number, item: InoMenuItem): InoMenuItem {
    return item;
  }

  protected trackByGroupIndex(index: number): number {
    return index;
  }

  protected onItemClick(event: Event, item: InoMenuItem, depth: number): void {
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    this.focusedByDepth[depth] = item;
    if (this.hasChildren(item)) {
      event.preventDefault();
      this.openSubmenu(depth, item, true);
      return;
    }
    item.command?.(item);
    // `item.href`, when present, navigates natively via the `[routerLink]` bound on the same
    // element — not re-triggered here, to avoid a double navigation.
    if (this.mode === 'popup') {
      this.hide();
    }
  }

  protected onItemKeydown(event: KeyboardEvent, item: InoMenuItem, depth: number): void {
    const navigable = this.itemsAtDepth(depth).filter((candidate) => !candidate.disabled);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (navigable.length) {
          this.moveFocus(depth, navigable, item, 1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (navigable.length) {
          this.moveFocus(depth, navigable, item, -1);
        }
        break;
      case 'Home':
        event.preventDefault();
        this.focusAt(depth, navigable[0]);
        break;
      case 'End':
        event.preventDefault();
        this.focusAt(depth, navigable[navigable.length - 1]);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (!item.disabled && this.hasChildren(item)) {
          this.openSubmenu(depth, item, true);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.closeSubmenuAndReturnToParent(depth);
        break;
      case 'Escape':
        event.preventDefault();
        this.onEscape();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateItem(item, depth);
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          this.handleTypeahead(depth, event.key);
        }
    }
  }

  protected onPanelFocusOut(event: FocusEvent): void {
    if (this.mode !== 'popup' || !this.isOpenState) {
      return;
    }
    const next = event.relatedTarget as Node | null;
    const panel = this.popupPanelRef?.nativeElement;
    if (next && panel?.contains(next)) {
      return;
    }
    this.hide();
  }

  protected openSubmenu(depth: number, item: InoMenuItem, focusFirst: boolean): void {
    if (item.disabled || !this.hasChildren(item)) {
      return;
    }
    this.openPath = [...this.openPath.slice(0, depth), item];
    this.focusedByDepth = this.focusedByDepth.slice(0, depth + 1);
    this.focusedByDepth[depth] = item;

    let firstChild: InoMenuItem | undefined;
    if (focusFirst) {
      firstChild = item.children!.find((child) => !child.disabled);
      if (firstChild) {
        this.focusedByDepth[depth + 1] = firstChild;
      }
    }
    this.cdr.markForCheck();

    setTimeout(() => {
      this.positionSubmenu(item);
      if (firstChild) {
        this.focusDom(this.itemId(firstChild));
      }
    });
  }

  protected closeSubmenuAndReturnToParent(depth: number): void {
    if (depth === 0) {
      return;
    }
    const parentDepth = depth - 1;
    const parentItem = this.openPath[parentDepth];
    this.openPath = this.openPath.slice(0, parentDepth);
    this.focusedByDepth = this.focusedByDepth.slice(0, depth);
    if (parentItem) {
      this.focusedByDepth[parentDepth] = parentItem;
    }
    this.cdr.markForCheck();
    if (parentItem) {
      setTimeout(() => this.focusDom(this.itemId(parentItem)));
    }
  }

  protected onEscape(): void {
    if (this.openPath.length > 0) {
      this.closeSubmenuAndReturnToParent(this.openPath.length);
      return;
    }
    if (this.mode === 'popup') {
      this.hide();
    }
  }

  private activateItem(item: InoMenuItem, depth: number): void {
    if (item.disabled) {
      return;
    }
    this.focusedByDepth[depth] = item;
    if (this.hasChildren(item)) {
      this.openSubmenu(depth, item, true);
      return;
    }
    item.command?.(item);
    if (item.href) {
      // Enter/Space never dispatches a native click on a hrefless `<a>` the way a pointer click
      // does, so the navigation RouterLink would normally perform on click is triggered here
      // explicitly — see SPEC.md §3.
      this.router.navigateByUrl(item.href);
    }
    if (this.mode === 'popup') {
      this.hide();
    }
  }

  private moveFocus(
    depth: number,
    navigable: InoMenuItem[],
    current: InoMenuItem,
    direction: 1 | -1,
  ): void {
    const index = navigable.indexOf(current);
    const base = index === -1 ? 0 : index;
    const next = navigable[(base + direction + navigable.length) % navigable.length];
    this.focusAt(depth, next);
  }

  private focusAt(depth: number, item: InoMenuItem | undefined): void {
    if (!item) {
      return;
    }
    this.focusedByDepth[depth] = item;
    this.cdr.markForCheck();
    setTimeout(() => this.focusDom(this.itemId(item)));
  }

  private handleTypeahead(depth: number, key: string): void {
    const items = this.itemsAtDepth(depth).filter((item) => !item.disabled);
    if (!items.length) {
      return;
    }

    if (this.typeaheadTimer) {
      clearTimeout(this.typeaheadTimer);
    }
    this.typeaheadBuffer += key.toLowerCase();
    this.typeaheadTimer = setTimeout(() => {
      this.typeaheadBuffer = '';
    }, 500);

    const buffer = this.typeaheadBuffer;
    // Repeating one single letter ("mmm") cycles through every match for that letter rather than
    // requiring the buffer to literally start with "mmm" — see SPEC.md §5.
    const isRepeatSingleChar = buffer.length > 1 && buffer.split('').every((c) => c === buffer[0]);
    const query = isRepeatSingleChar ? buffer[0] : buffer;

    const current = this.focusedByDepth[depth];
    const currentIndex = current ? items.indexOf(current) : -1;

    for (let offset = 1; offset <= items.length; offset++) {
      const index = (currentIndex + offset + items.length) % items.length;
      if (items[index].label.toLowerCase().startsWith(query)) {
        this.focusAt(depth, items[index]);
        return;
      }
    }
  }

  private applyOpenState(next: boolean): void {
    if (this.isOpenState === next) {
      return;
    }
    this.isOpenState = next;
    this.openChange.emit(next);
    this.openPath = [];

    if (next) {
      const first = this.rootFlatItems.find((item) => !item.disabled);
      this.focusedByDepth = first ? [first] : [];
      this.cdr.markForCheck();
      setTimeout(() => {
        this.repositionPopup();
        if (first) {
          this.focusDom(this.itemId(first));
        }
      });
      this.bindGlobalListeners();
    } else {
      this.focusedByDepth = [];
      this.unbindGlobalListeners();
      this.cdr.markForCheck();
      const anchorEl = this.resolveAnchorEl();
      anchorEl?.focus();
    }
  }

  private resolveAnchorEl(): HTMLElement | null {
    if (this.anchor) {
      return this.anchor instanceof ElementRef ? this.anchor.nativeElement : this.anchor;
    }
    return this.anchorEl;
  }

  private repositionPopup(): void {
    const anchorEl = this.resolveAnchorEl();
    const panel = this.popupPanelRef?.nativeElement;
    if (!anchorEl || !panel || typeof window === 'undefined') {
      return;
    }
    const placement = computeOverlayPlacement(
      anchorEl.getBoundingClientRect(),
      { width: panel.offsetWidth, height: panel.offsetHeight },
      this.position,
      { width: window.innerWidth, height: window.innerHeight },
      4,
      8,
      'start',
    );
    this.popupTop = placement.top;
    this.popupLeft = placement.left;
    this.cdr.markForCheck();
  }

  private positionSubmenu(item: InoMenuItem): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }
    const anchorEl = this.hostRef.nativeElement.querySelector(
      `[data-menu-item-id="${this.itemId(item)}"]`,
    ) as HTMLElement | null;
    const panelEl = this.hostRef.nativeElement.querySelector(
      `[data-menu-submenu-for="${this.itemId(item)}"]`,
    ) as HTMLElement | null;
    if (!anchorEl || !panelEl) {
      return;
    }
    const placement = computeOverlayPlacement(
      anchorEl.getBoundingClientRect(),
      { width: panelEl.offsetWidth, height: panelEl.offsetHeight },
      'right',
      { width: window.innerWidth, height: window.innerHeight },
      2,
      8,
      'start',
    );
    this.submenuPositions.set(item, { top: placement.top, left: placement.left });
    this.cdr.markForCheck();
  }

  private focusDom(id: string): void {
    const el = this.hostRef.nativeElement.querySelector(
      `[data-menu-item-id="${id}"]`,
    ) as HTMLElement | null;
    el?.focus();
  }

  private bindGlobalListeners(): void {
    if (this.outsideClickBound || typeof document === 'undefined') {
      return;
    }
    // Registered outside Angular and on the next macrotask, not this one: the click that just
    // opened the menu (e.g. from `toggle()`) is still bubbling to `document` on this same tick,
    // and a listener added synchronously would see that click and close the menu immediately.
    // Same guard `<ino-popover>` uses.
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
      });
    });
    this.outsideClickBound = true;
  }

  private unbindGlobalListeners(): void {
    if (!this.outsideClickBound) {
      return;
    }
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    this.outsideClickBound = false;
  }
}
