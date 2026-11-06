import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface InoOrgChartNode {
  label: string;
  value: string;
  /** Secondary line in the default node rendering — the org-chart "title under the name" staple. */
  sublabel?: string;
  children?: InoOrgChartNode[];
  disabled?: boolean;
  /** Opaque template-only payload for custom node templates (SPEC.md §2) — never read by this
   *  component, so custom content never forces fields onto the node interface. */
  data?: unknown;
}

interface InoOrgChartRow {
  node: InoOrgChartNode;
  /** Absolute index into the flattened *visible* row list — the roving-`tabindex` target, same
   *  model `ino-tree`'s flat row list uses (SPEC.md §1). */
  index: number;
  /** 0-based depth; `aria-level` is `level + 1`. */
  level: number;
  /** Nearest parent's `value`, `null` on the root — `ArrowUp`'s "move to parent" target. */
  parentValue: string | null;
  /** This row's position among its *visible* siblings — `ArrowLeft/Right`'s traversal axis. */
  siblings: InoOrgChartNode[];
}

let idCounter = 0;

/**
 * `<ino-orgchart>` — top-down organization chart (INO-477, INO-31 Phase B5, doc 26 §5 row
 * `ino-orgchart`).
 *
 * A tree rotated 90°: ports `<ino-tree>`'s (INO-450) flatten/expand/roving-tabindex core and
 * changes only what the geometry changes — recursive `ul[role="group"]` rendering (the CSS
 * connectors need real DOM nesting), the APG tree Arrow map rotated for a top-down chart
 * (Down = expand-or-descend, Up = collapse-or-ascend, Left/Right = siblings), and
 * subtrees-start-expanded (a chart's point is showing the structure). See SPEC.md §1/§5.
 *
 * Selection is opt-in (`selectionMode="single"`): `@Input() value` / `@Output() valueChange`
 * banana-in-a-box keyed on `node.value`, no `ControlValueAccessor` — repo forms convention.
 *
 * Sizing is a single `zoom` input ([0.5, 2]): the chart surface's `font-size` is
 * `--ino-control-font-size × zoom` and every internal length is in `em`, so layout genuinely
 * reflows (no `transform: scale()` blur) and density composes via the §12 token. SPEC.md §6.
 */
@Component({
  selector: 'ino-orgchart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-orgchart.component.html',
  styleUrl: './ino-orgchart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-orgchart',
  },
})
export class InoOrgchartComponent implements OnChanges {
  /** Chart label (doc 26 §5 "Labels: chart label") — rendered above the chart and wired to the
   *  tree via `aria-labelledby`. */
  @Input() label = '';
  /** Accessible-name fallback when no visible `label` is rendered. */
  @Input() ariaLabel = '';
  /** Root node. `null` renders the empty state (SPEC.md §7). */
  @Input() value: InoOrgChartNode | null = null;
  /** `'none'` (default): pure visualization, nodes carry no selection semantics.
   *  `'single'`: click/Enter selects by `node.value`; re-activating deselects (SPEC.md §3). */
  @Input() selectionMode: 'none' | 'single' = 'none';
  /** Selected `node.value` (`selectionMode="single"` only). */
  @Input() selected = '';
  /** Chart-level async flag (SPEC.md §7): `aria-busy`, spinner overlay, interaction suppressed.
   *  Per-branch lazy loading is a deliberate omission (SPEC.md §8). */
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  /** `false` removes the expand/collapse togglers — a static chart (SPEC.md §7). */
  @Input({ transform: booleanAttribute }) collapsible = true;

  @Output() readonly selectedChange = new EventEmitter<string>();

  /** Custom node template (SPEC.md §2), context `{ $implicit: node }`. Replaces the card's
   *  content, never its chrome — selection/focus/connector styling stays on the card. */
  @ContentChild(TemplateRef) nodeTemplate: TemplateRef<{ $implicit: InoOrgChartNode }> | null =
    null;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly chartId = `ino-orgchart-${++idCounter}`;
  protected readonly labelId = `${this.chartId}-label`;

  /** Roving-`tabindex` target — the one node currently focusable via `Tab`. */
  protected activeIndex = -1;

  /** Inverse of `ino-tree`'s `expandedValues`: subtrees start expanded (SPEC.md §1), so state
   *  tracks what the user closed. */
  private readonly collapsedValues = new Set<string>();
  private readonly parentOf = new Map<string, string | null>();
  private rowsCache: InoOrgChartRow[] = [];
  private indexByValue = new Map<string, number>();
  private zoomLevel = 1;

  /** Zoom factor, clamped to [0.5, 2] (SPEC.md §6). */
  @Input()
  set zoom(level: number) {
    this.zoomLevel = clamp(Number(level) || 1, 0.5, 2);
  }
  get zoom(): number {
    return this.zoomLevel;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.rebuildParentMap();
      // Drop collapsed entries for values that no longer exist, so a replaced dataset doesn't
      // inherit stale collapse state from a value-name collision.
      for (const collapsed of [...this.collapsedValues]) {
        if (!this.parentOf.has(collapsed)) {
          this.collapsedValues.delete(collapsed);
        }
      }
      this.recomputeRows();
      this.resetActiveIndex();
    }
  }

  get rows(): InoOrgChartRow[] {
    return this.rowsCache;
  }

  get root(): InoOrgChartNode | null {
    return this.value;
  }

  protected nodeId(node: InoOrgChartNode): string {
    return `${this.chartId}-n-${this.indexByValue.get(node.value) ?? -1}`;
  }

  protected rowOf(node: InoOrgChartNode): InoOrgChartRow | null {
    const index = this.indexByValue.get(node.value);
    return index === undefined ? null : this.rowsCache[index];
  }

  protected isActiveTabStop(node: InoOrgChartNode): boolean {
    return this.indexByValue.get(node.value) === this.activeIndex;
  }

  isExpanded(node: InoOrgChartNode): boolean {
    return !this.collapsedValues.has(node.value);
  }

  isSelected(node: InoOrgChartNode): boolean {
    return this.selectionMode === 'single' && !!this.selected && node.value === this.selected;
  }

  protected hasChildren(node: InoOrgChartNode): boolean {
    return !!node.children?.length;
  }

  // ── Expand / collapse (SPEC.md §1/§5) ────────────────────────────────────────────────────────

  toggleExpand(node: InoOrgChartNode, event?: Event): void {
    event?.stopPropagation();
    if (!this.collapsible || this.disabled || this.loading || node.disabled) {
      return;
    }
    if (this.collapsedValues.has(node.value)) {
      this.collapsedValues.delete(node.value);
    } else {
      this.collapsedValues.add(node.value);
    }
    this.recomputeRows();
  }

  // ── Selection (SPEC.md §3) ──────────────────────────────────────────────────────────────────

  activateNode(node: InoOrgChartNode): void {
    if (this.disabled || this.loading || node.disabled) {
      return;
    }
    const index = this.indexByValue.get(node.value);
    if (index !== undefined) {
      this.activeIndex = index;
    }
    if (this.selectionMode !== 'single') {
      return;
    }
    // Re-activating the selected node deselects — a chart selection is a highlight, not a form
    // commitment (SPEC.md §3).
    const next = this.selected === node.value ? '' : node.value;
    this.selected = next;
    this.selectedChange.emit(next);
    this.focusActive();
  }

  // ── Keyboard — APG tree Arrow map rotated for a top-down chart (SPEC.md §5) ────────────────

  onNodeKeydown(event: KeyboardEvent, node: InoOrgChartNode): void {
    if (this.disabled || this.loading) {
      return;
    }
    const row = this.rowOf(node);
    if (!row) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.expandOrDescend(row);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.collapseOrAscend(row);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.moveSibling(row, 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.moveSibling(row, -1);
        break;
      case 'Home':
        event.preventDefault();
        this.jumpSibling(row, 'first');
        break;
      case 'End':
        event.preventDefault();
        this.jumpSibling(row, 'last');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateNode(node);
        break;
    }
  }

  private expandOrDescend(row: InoOrgChartRow): void {
    if (!this.hasChildren(row.node)) {
      return;
    }
    if (!this.isExpanded(row.node)) {
      this.toggleExpand(row.node);
      this.setActiveByValue(row.node.value);
      return;
    }
    const firstEnabledChild = row.node.children!.find((child) => !child.disabled);
    if (firstEnabledChild) {
      this.setActiveByValue(firstEnabledChild.value);
    }
  }

  private collapseOrAscend(row: InoOrgChartRow): void {
    if (this.hasChildren(row.node) && this.isExpanded(row.node) && this.collapsible) {
      this.toggleExpand(row.node);
      this.setActiveByValue(row.node.value);
    } else if (row.parentValue !== null) {
      this.setActiveByValue(row.parentValue);
    }
  }

  private moveSibling(row: InoOrgChartRow, delta: number): void {
    const enabled = row.siblings.filter((sibling) => !sibling.disabled);
    const pos = enabled.findIndex((sibling) => sibling.value === row.node.value);
    if (pos < 0) {
      return;
    }
    const nextPos = clamp(pos + delta, 0, enabled.length - 1);
    this.setActiveByValue(enabled[nextPos].value);
  }

  private jumpSibling(row: InoOrgChartRow, edge: 'first' | 'last'): void {
    const enabled = row.siblings.filter((sibling) => !sibling.disabled);
    if (!enabled.length) {
      return;
    }
    this.setActiveByValue(enabled[edge === 'first' ? 0 : enabled.length - 1].value);
  }

  private setActiveByValue(value: string): void {
    const index = this.indexByValue.get(value);
    if (index !== undefined) {
      this.activeIndex = index;
      this.focusActive();
    }
  }

  /** Seeds the tab stop at the selected node, else the first enabled one — without emitting
   *  `selectedChange`, same non-committing seed `ino-tree.resetActiveIndex` documents. */
  private resetActiveIndex(): void {
    const rows = this.rowsCache;
    const selectedIndex = rows.findIndex((row) => this.isSelected(row.node));
    this.activeIndex =
      selectedIndex >= 0 ? selectedIndex : rows.findIndex((row) => !row.node.disabled);
  }

  private focusActive(): void {
    if (this.activeIndex < 0) {
      return;
    }
    const id = `${this.chartId}-n-${this.activeIndex}`;
    queueMicrotask(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`);
      el?.focus();
      // Wide charts scroll inside the component (SPEC.md §6) — traversal drags the viewport along.
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  // ── Flatten — traversal model stays flat while the template recurses (SPEC.md §1) ──────────

  private rebuildParentMap(
    node: InoOrgChartNode | null = this.value,
    parent: string | null = null,
  ): void {
    if (parent === null) {
      this.parentOf.clear();
    }
    if (!node) {
      return;
    }
    this.parentOf.set(node.value, parent);
    for (const child of node.children ?? []) {
      this.rebuildParentMap(child, node.value);
    }
  }

  private recomputeRows(): void {
    const out: InoOrgChartRow[] = [];
    if (this.value) {
      this.flattenInto([this.value], 0, null, out);
    }
    this.rowsCache = out;
    this.indexByValue = new Map(out.map((row) => [row.node.value, row.index]));
    if (this.activeIndex >= out.length) {
      this.resetActiveIndex();
    }
  }

  private flattenInto(
    siblings: InoOrgChartNode[],
    level: number,
    parentValue: string | null,
    out: InoOrgChartRow[],
  ): void {
    for (const node of siblings) {
      out.push({ node, index: out.length, level, parentValue, siblings });
      if (this.isExpanded(node) && node.children?.length) {
        this.flattenInto(node.children, level + 1, node.value, out);
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
