import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../services/theme.service';
import { InoControlSize } from '../control-size';
import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';

export interface InoNavLink {
  label: string;
  href: string;
  /** Renders `aria-disabled`, drops `routerLink`, and no-ops click/keyboard activation. */
  disabled?: boolean;
  /**
   * One level of nested submenu (PrimeNG Menubar parity, INO-164). Deeper nesting is a
   * deliberate omission — see `SPEC.md` §3. A grandchild's own `children` are never rendered.
   */
  children?: InoNavLink[];
}

/**
 * `<ino-nav>` — top-level site/app navigation shell, uplifted to a `role="menubar"` per
 * INO-164 (INO-31 U-9) — parity benchmark PrimeNG 22.1.1 `Menubar`
 * (`specs/primeng/llms-22.1.1.txt`). PrimeNG is a benchmark, **not a runtime dependency** —
 * nothing in this directory imports it.
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3.
 * Full decision record: `SPEC.md`.
 *
 * Logo is projected via `<ng-content select="[logo]">` on purpose — the nav shell doesn't
 * know or care what mark renders there, so a mark swap (Verified Line → Aperture Mark →
 * Ledger Seal) never touches this component.
 *
 * Owns the dark/light toggle directly (injects ThemeService itself, no Input/Output
 * plumbing) since nav is the one place both modes need this control on every page.
 *
 * `links[].href` is an in-app route path (rendered via `routerLink`, INO-84) — not an
 * arbitrary external URL.
 *
 * Keyboard map (WAI-ARIA APG menubar pattern, roving tabindex — full detail in `SPEC.md` §2):
 * `ArrowRight`/`ArrowLeft` move between top-level items (wrap); `ArrowDown` on an item with
 * children opens its submenu and focuses the first entry; `ArrowUp`/`ArrowDown` move within an
 * open submenu (wrap); `Escape` closes the open submenu and returns focus to its parent item;
 * `Home`/`End` jump to the first/last item in whichever list currently has focus; `Enter`/`Space`
 * toggle a submenu. Mouse hover is a progressive enhancement over the same `openIndex` state a
 * keyboard user drives, so the two can never disagree about which submenu is open.
 *
 * Below the 960px breakpoint (the same collapse point `ino-footer` and `ino-feature-grid` already
 * use for their own layout, INO-164) the horizontal menubar hides behind a hamburger button that
 * opens a focus-trapped panel listing the same items — reusing `[inoFocusTrap]` (INO-130) rather
 * than hand-rolling a second trap.
 */
@Component({
  selector: 'ino-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, InoFocusTrapDirective],
  templateUrl: './ino-nav.component.html',
  styleUrl: './ino-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoNavComponent {
  @Input() links: InoNavLink[] = [];
  @Input() ctaLabel = 'Request access';
  /** Wave 0 control-size scale (INO-124) — see `SPEC.md` §4 for exactly which fields it drives. */
  @Input() size: InoControlSize = 'default';

  @Output() ctaClick = new EventEmitter<void>();

  private readonly themeService = inject(ThemeService);
  protected readonly theme = this.themeService.theme;
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  /** Roving-tabindex position among top-level menubar items. */
  protected activeIndex = 0;
  /** Index of the top-level item whose submenu is open, or `null`. Single source of truth for
   *  both hover- and keyboard-driven opens, so the two can never desync (DoD §4). */
  protected openIndex: number | null = null;
  /** Roving-tabindex position within the currently open submenu. */
  protected activeSubmenuIndex = 0;

  protected mobileOpen = false;
  /** Indices of top-level items expanded (disclosure) inside the mobile panel. */
  protected readonly mobileExpanded = new Set<number>();

  onCtaClick(): void {
    this.ctaClick.emit();
  }

  onThemeToggle(): void {
    this.themeService.toggle();
  }

  /** Describes what clicking the toggle does next (dark → light → high-contrast → dark). */
  protected nextThemeLabel(): string {
    switch (this.theme()) {
      case 'dark':
        return 'Switch to light mode';
      case 'light':
        return 'Switch to high-contrast mode';
      default:
        return 'Switch to dark mode';
    }
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  // ---------------------------------------------------------------------------------------
  // Top-level menubar keyboard + focus
  // ---------------------------------------------------------------------------------------

  protected onMenubarKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.ino-nav__submenu')) {
      this.handleSubmenuKeydown(event);
    } else {
      this.handleTopLevelKeydown(event);
    }
  }

  private handleTopLevelKeydown(event: KeyboardEvent): void {
    const items = this.topLevelItems();
    if (!items.length) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.moveTopLevel((this.activeIndex + 1) % items.length);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.moveTopLevel((this.activeIndex - 1 + items.length) % items.length);
        break;
      case 'ArrowDown':
        if (this.links[this.activeIndex]?.children?.length) {
          event.preventDefault();
          this.openSubmenu(this.activeIndex, 0);
        }
        break;
      case 'Escape':
        if (this.openIndex !== null) {
          event.preventDefault();
          this.closeSubmenu(true);
        }
        break;
      case 'Home':
        event.preventDefault();
        this.moveTopLevel(0);
        break;
      case 'End':
        event.preventDefault();
        this.moveTopLevel(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        if (this.links[this.activeIndex]?.children?.length) {
          event.preventDefault();
          if (this.openIndex === this.activeIndex) {
            this.closeSubmenu(false);
          } else {
            this.openSubmenu(this.activeIndex, 0);
          }
        }
        break;
      default:
        break;
    }
  }

  private handleSubmenuKeydown(event: KeyboardEvent): void {
    if (this.openIndex === null) {
      return;
    }
    const items = this.submenuItems(this.openIndex);
    if (!items.length) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveSubmenu((this.activeSubmenuIndex + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveSubmenu((this.activeSubmenuIndex - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        this.moveSubmenu(0);
        break;
      case 'End':
        event.preventDefault();
        this.moveSubmenu(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.closeSubmenu(true);
        break;
      case 'ArrowRight':
      case 'ArrowLeft': {
        event.preventDefault();
        const top = this.topLevelItems();
        const dir = event.key === 'ArrowRight' ? 1 : -1;
        const next = (this.activeIndex + dir + top.length) % top.length;
        this.closeSubmenu(false);
        this.moveTopLevel(next);
        break;
      }
      default:
        break;
    }
  }

  protected onItemFocus(index: number): void {
    this.activeIndex = index;
  }

  protected onTriggerClick(index: number): void {
    if (this.links[index]?.disabled) {
      return;
    }
    this.activeIndex = index;
    if (this.openIndex === index) {
      this.closeSubmenu(false);
    } else {
      this.openSubmenu(index, 0);
    }
  }

  protected onItemClick(event: Event, link: InoNavLink, index: number): void {
    if (link.disabled) {
      event.preventDefault();
      return;
    }
    this.activeIndex = index;
    this.openIndex = null;
  }

  protected onChildClick(event: Event, child: InoNavLink, parentIndex: number): void {
    if (child.disabled) {
      event.preventDefault();
      return;
    }
    this.closeSubmenu(false);
    this.activeIndex = parentIndex;
  }

  // ---------------------------------------------------------------------------------------
  // Hover — progressive enhancement over the SAME `openIndex` state (DoD §4)
  // ---------------------------------------------------------------------------------------

  protected onItemMouseEnter(index: number): void {
    const link = this.links[index];
    if (!link?.children?.length || link.disabled) {
      return;
    }
    this.openIndex = index;
  }

  protected onItemMouseLeave(index: number): void {
    if (this.openIndex === index && !this.itemContainsFocus(index)) {
      this.openIndex = null;
    }
  }

  protected onNavFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    const menubar = this.menubarEl();
    if (!related || !menubar?.contains(related)) {
      this.openIndex = null;
    }
  }

  /** Closes an open submenu on outside click — the mouse/touch half of DoD §4's "closes on
   *  outside interaction," `focusout` above covers the keyboard half. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.openIndex !== null && !this.host.contains(event.target as Node)) {
      this.openIndex = null;
    }
  }

  // ---------------------------------------------------------------------------------------
  // Submenu open/close + roving-tabindex movement helpers
  // ---------------------------------------------------------------------------------------

  private moveTopLevel(index: number): void {
    this.activeIndex = index;
    if (this.openIndex !== null && this.openIndex !== index) {
      this.openIndex = null;
    }
    this.topLevelItems()[index]?.focus();
  }

  private openSubmenu(index: number, focusIndex: number): void {
    this.openIndex = index;
    this.activeIndex = index;
    this.activeSubmenuIndex = focusIndex;
    // The submenu is *ngIf-conditional — its DOM does not exist yet on this tick. Same deferral
    // `[inoFocusTrap]` uses before focusing projected content it did not just render itself.
    queueMicrotask(() => this.submenuItems(index)[focusIndex]?.focus());
  }

  private closeSubmenu(focusParent: boolean): void {
    const index = this.openIndex;
    this.openIndex = null;
    if (focusParent && index !== null) {
      this.activeIndex = index;
      queueMicrotask(() => this.topLevelItems()[index]?.focus());
    }
  }

  private moveSubmenu(index: number): void {
    if (this.openIndex === null) {
      return;
    }
    this.activeSubmenuIndex = index;
    this.submenuItems(this.openIndex)[index]?.focus();
  }

  private menubarEl(): HTMLElement | null {
    return this.host.querySelector('.ino-nav__menubar');
  }

  private topLevelItems(): HTMLElement[] {
    return Array.from(
      this.menubarEl()?.querySelectorAll<HTMLElement>(':scope > .ino-nav__item > .ino-nav__item-control') ?? [],
    );
  }

  private submenuItems(index: number): HTMLElement[] {
    const items = Array.from(
      this.menubarEl()?.querySelectorAll<HTMLElement>(':scope > .ino-nav__item') ?? [],
    );
    return Array.from(items[index]?.querySelectorAll<HTMLElement>('.ino-nav__submenu-link') ?? []);
  }

  private itemContainsFocus(index: number): boolean {
    const items = Array.from(
      this.menubarEl()?.querySelectorAll<HTMLElement>(':scope > .ino-nav__item') ?? [],
    );
    return !!items[index]?.contains(document.activeElement);
  }

  // ---------------------------------------------------------------------------------------
  // Mobile hamburger panel
  // ---------------------------------------------------------------------------------------

  protected toggleMobile(): void {
    this.mobileOpen = !this.mobileOpen;
    if (!this.mobileOpen) {
      this.mobileExpanded.clear();
    }
  }

  protected closeMobile(): void {
    this.mobileOpen = false;
    this.mobileExpanded.clear();
  }

  protected toggleMobileGroup(index: number): void {
    if (this.mobileExpanded.has(index)) {
      this.mobileExpanded.delete(index);
    } else {
      this.mobileExpanded.add(index);
    }
  }

  protected isMobileGroupExpanded(index: number): boolean {
    return this.mobileExpanded.has(index);
  }
}
