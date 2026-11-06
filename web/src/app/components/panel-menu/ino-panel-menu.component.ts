import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoPanelMenuItem } from './ino-panel-menu.types';

/**
 * `<ino-panel-menu>` — "hybrid of Accordion and Tree" (PrimeNG 22.1.1 `PanelMenu`, a benchmark
 * only; nothing here imports it): top-level nodes behave as accordion panels (single-open by
 * default, section-labelled), and any node may itself nest further groups to arbitrary depth.
 * Spec source: doc 26 §5 Phase B2 row `ino-panel-menu` (rev-2 amendment `a21a93c`). Board approval
 * `f55baa72` on INO-377. Issue: INO-431.
 *
 * Contract: docs/brand/06-angular-components/panel-menu.md. Decisions record: `SPEC.md`.
 *
 * A11y: plain `nav` + disclosure `button[aria-expanded][aria-controls]` + `ul[role=list]` groups —
 * deliberately **not** WAI-ARIA Tree View (`role="tree"`/`"treeitem"`). See `SPEC.md` §4 for why;
 * in short, this is a navigation disclosure list (native tab order, no roving tabindex, no
 * selection model), the same pattern `ino-nav`'s mobile group disclosure already uses.
 *
 * Groups render as real nested `ul`s via a recursive `ngTemplateOutlet` (one per depth level)
 * rather than a flattened row list — unlike `ino-treeselect`'s flatten-for-render precedent, this
 * component has no roving-tabindex/arrow-key layer that needs a linear index, and `aria-controls`
 * needs a real per-group element id to point at. See `SPEC.md` §2.
 */
@Component({
  selector: 'ino-panel-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ino-panel-menu.component.html',
  styleUrl: './ino-panel-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size',
  },
})
export class InoPanelMenuComponent {
  @Input() items: InoPanelMenuItem[] = [];
  /** Accessible name for the `nav` landmark. */
  @Input() ariaLabel = 'Panel menu';
  /** `compact | comfortable` — the row's own two-tier scale (doc 26 §5, not the `sm/default/lg`
   * `InoControlSize` scale). Composes with dense/fluid density — see `SPEC.md` §5. */
  @Input() size: 'compact' | 'comfortable' = 'comfortable';
  /** Allows more than one **top-level** panel open at once. Default `false` — opening a top-level
   * panel closes whichever other top-level panel was open, the classic accordion contract. Nested
   * groups below the top level are always independently toggleable regardless of this flag — see
   * `SPEC.md` §3. */
  @Input({ transform: booleanAttribute }) multiple = false;
  /** Renders every leaf as inert text; group expand/collapse still works so the tree stays
   * browsable. See `SPEC.md` §7. */
  @Input({ transform: booleanAttribute }) readonly = false;
  /** Renders skeleton rows instead of `items`. See `SPEC.md` §8. */
  @Input({ transform: booleanAttribute }) loading = false;
  /** Message shown when `items` is empty (and not `loading`). */
  @Input() emptyLabel = 'No items';

  @Output() itemClick = new EventEmitter<InoPanelMenuItem>();

  /** Index-path (`"0"`, `"0-2"`, `"0-2-1"`, …) of every currently expanded node, top-level or
   * nested. Deliberately never cleared on collapse — see `SPEC.md` §3 for why a re-opened panel
   * restores its previous nested expand state instead of resetting. */
  protected readonly expanded = new Set<string>();

  protected hasChildren(item: InoPanelMenuItem): boolean {
    return !!item.children?.length;
  }

  protected isExpanded(path: string): boolean {
    return this.expanded.has(path);
  }

  protected isNavigable(item: InoPanelMenuItem): boolean {
    return !this.hasChildren(item) && !!item.href && !item.disabled && !this.readonly;
  }

  protected isCommand(item: InoPanelMenuItem): boolean {
    return !this.hasChildren(item) && !item.href && !item.disabled && !this.readonly;
  }

  protected childPath(parentPath: string, index: number): string {
    return parentPath ? `${parentPath}-${index}` : `${index}`;
  }

  protected toggle(item: InoPanelMenuItem, path: string, level: number): void {
    if (item.disabled || !this.hasChildren(item)) {
      return;
    }
    const nowOpen = !this.expanded.has(path);
    if (level === 0 && nowOpen && !this.multiple) {
      // Close every other open top-level panel before opening this one — single-open accordion
      // contract. Each closed panel's own `expanded` entries (incl. nested ones) are left in the
      // set untouched, not cascade-cleared — see the field comment above for why.
      for (const openPath of [...this.expanded]) {
        if (!openPath.includes('-') && openPath !== path) {
          this.expanded.delete(openPath);
        }
      }
    }
    if (nowOpen) {
      this.expanded.add(path);
    } else {
      this.expanded.delete(path);
    }
  }

  protected onLeafClick(item: InoPanelMenuItem): void {
    if (item.disabled || this.readonly) {
      return;
    }
    this.itemClick.emit(item);
  }

  protected groupContentId(path: string): string {
    return `ino-panel-menu-group-${path}`;
  }

  protected trackByIndex(index: number): number {
    return index;
  }
}
