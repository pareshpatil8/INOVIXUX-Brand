import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

export interface InoTreeSelectNode {
  label: string;
  value: string;
  children?: InoTreeSelectNode[];
  /** Renders the expand affordance even though `children` is empty/undefined — doc 26 §5's "lazy
   *  children". Toggling this node open while it's `true` and `children` is still empty emits
   *  `loadChildren`; the parent answers by pushing a *new* `nodes` array back in with this node's
   *  `children` populated — same async-datasource contract `ino-autocomplete`'s `search` output
   *  documents (plain `@Input`/`@Output`, no Observable baked in). See SPEC.md §4. */
  hasChildren?: boolean;
  /** Parent sets this while a `loadChildren` fetch for this node is in flight — renders the
   *  "loading branch" state (doc 26 §5) in place of the expand chevron. */
  loading?: boolean;
  disabled?: boolean;
}

interface InoTreeSelectRow {
  node: InoTreeSelectNode;
  /** Absolute index into the flattened *visible* row list — the value `aria-activedescendant`
   *  tracks (same model `ino-select`/`ino-autocomplete` use). */
  index: number;
  /** 0-based depth; `aria-level` is `level + 1`. */
  level: number;
  /** Ancestor chain, root-first, nearest parent last — `ArrowLeft`'s "move to parent" target. */
  parentValues: string[];
  hasVisibleChildren: boolean;
}

let idCounter = 0;

/**
 * `<ino-treeselect>` — combobox trigger opening a `role="tree"` panel (INO-416, INO-31 Phase B1).
 *
 * Builds on the same overlay/trigger/`aria-activedescendant` core `ino-select` (INO-152, T-9)
 * established — non-editable button trigger, in-panel filter, `Escape`/outside-click/`Tab` closing
 * without committing — and reuses `ino-listbox`'s (INO-414) `value: string | string[]` union +
 * `valuesArray` normalization for the `multiple`/`checkbox` selection modes. See SPEC.md §1.
 *
 * **Not reused from either**: row flattening/keyboard nav. A tree's visible rows depend on which
 * branches are expanded, which neither component's flat option list has to account for — see
 * SPEC.md §2 for the flattening model and the full Arrow-key map.
 *
 * Doc 26 §5 names `ino-tree` (Phase B3, not yet built — no `web/src/app/components/tree` directory
 * exists in this repo) as this component's dependency. Rather than block a Phase B1 ticket on a
 * Phase B3 one, the tree-rendering core (flatten/expand/lazy-load/tri-state-checkbox) is built
 * self-contained here; see SPEC.md §1 for the explicit refactor note to extract a shared core once
 * `ino-tree` ships.
 *
 * `@Input() value: string | string[]` / `@Output() valueChange` (banana-in-a-box), matching every
 * other Tier-1 form control in this repo — no `ControlValueAccessor`.
 */
@Component({
  selector: 'ino-treeselect',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-treeselect.component.html',
  styleUrl: './ino-treeselect.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-treeselect',
    '[attr.data-size]': 'size',
    '[class.ino-treeselect--open]': 'open',
  },
})
export class InoTreeSelectComponent implements OnChanges, AfterViewInit {
  @Input() label = '';
  @Input() nodes: InoTreeSelectNode[] = [];
  /** `string` in `'single'` mode, `string[]` in `'multiple'`/`'checkbox'`. See SPEC.md §3. */
  @Input() value: string | string[] = '';
  /** `'single'` — select-and-close, one value. `'multiple'` — toggle-without-closing, flat
   *  membership (reuses `ino-listbox`'s model), no cascade to descendants. `'checkbox'` —
   *  toggle-without-closing, cascades to every loaded descendant and re-derives each ancestor's
   *  membership (full/partial/none) — doc 26 §5's "partial-checked" state. See SPEC.md §3. */
  @Input() selectionMode: 'single' | 'multiple' | 'checkbox' = 'single';
  @Input() placeholder = 'Select…';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  /** Suppresses committing a selection while an async fetch is in flight; the panel and filter box
   *  stay live — same contract as `ino-autocomplete`'s `loading`. Distinct from a per-node
   *  `loading` (lazy children fetch) — see SPEC.md §5 (states). */
  @Input({ transform: booleanAttribute }) loading = false;
  /** In-panel search box, narrows the tree to matching labels + their ancestors (auto-expanded
   *  while the query is non-empty). Defaults `true` — doc 26 §5 lists "filter" as part of this
   *  component's baseline structure, same call `ino-listbox` makes for its own filter box. */
  @Input({ transform: booleanAttribute }) filter = true;
  @Input() filterLabel = 'Filter';
  @Input() filterPlaceholder = 'Filter…';

  @Output() readonly valueChange = new EventEmitter<string | string[]>();
  @Output() readonly filterChange = new EventEmitter<string>();
  @Output() readonly openChange = new EventEmitter<boolean>();
  /** Fires when a lazy node (`hasChildren: true`, `children` still empty/undefined) is expanded —
   *  the hook a parent uses to fetch and push that node's children back in. See SPEC.md §4. */
  @Output() readonly loadChildren = new EventEmitter<InoTreeSelectNode>();

  @ViewChild('trigger') private readonly triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('filterInput') private readonly filterInputRef?: ElementRef<HTMLInputElement>;

  protected readonly treeSelectId = `ino-treeselect-${++idCounter}`;
  protected readonly treeId = `${this.treeSelectId}-tree`;
  protected readonly hintId = `${this.treeSelectId}-hint`;
  protected readonly errorId = `${this.treeSelectId}-error`;

  protected open = false;
  protected activeIndex = -1;
  protected filterText = '';

  private readonly expandedValues = new Set<string>();
  private readonly parentOf = new Map<string, string | null>();
  private rowsCache: InoTreeSelectRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes']) {
      this.rebuildParentMap();
    }
    if (changes['nodes'] || changes['filter']) {
      this.recomputeRows();
    }
  }

  ngAfterViewInit(): void {
    this.rebuildParentMap();
    this.recomputeRows();
  }

  // ── Value shape (SPEC.md §3) ────────────────────────────────────────────────────────────────

  get valuesArray(): string[] {
    if (Array.isArray(this.value)) {
      return this.value;
    }
    return this.value ? [this.value] : [];
  }

  /** Every node (anywhere in the full tree, not just visible rows) currently in `value` — the
   *  trigger's own label source, so a selection made inside a since-collapsed or filtered-out
   *  branch still shows correctly. */
  get selectedNodes(): InoTreeSelectNode[] {
    const values = this.valuesArray;
    if (!values.length) {
      return [];
    }
    const found: InoTreeSelectNode[] = [];
    const walk = (nodes: InoTreeSelectNode[]): void => {
      for (const node of nodes) {
        if (values.includes(node.value)) {
          found.push(node);
        }
        if (node.children?.length) {
          walk(node.children);
        }
      }
    };
    walk(this.nodes);
    return found;
  }

  get triggerLabel(): string {
    const selected = this.selectedNodes;
    return selected.length ? selected.map((n) => n.label).join(', ') : this.placeholder;
  }

  get rows(): InoTreeSelectRow[] {
    return this.rowsCache;
  }

  get isFilteredEmpty(): boolean {
    return this.filterText.trim().length > 0 && this.rowsCache.length === 0;
  }

  get emptyMessage(): string {
    return this.filterText.trim() ? 'No matches.' : 'No options.';
  }

  protected activeRowId(): string | null {
    return this.activeIndex >= 0 ? this.rowId(this.activeIndex) : null;
  }

  protected rowId(index: number): string {
    return `${this.treeId}-row-${index}`;
  }

  protected isActive(index: number): boolean {
    return index === this.activeIndex;
  }

  protected isExpanded(node: InoTreeSelectNode): boolean {
    return this.expandedValues.has(node.value) || this.filterText.trim().length > 0;
  }

  /** `single`: this is *the* value. `multiple`/`checkbox`: plain membership — identical read for
   *  both; `checkbox` layers `isPartial` on top for the ancestor tri-state display. */
  protected isSelected(node: InoTreeSelectNode): boolean {
    if (this.selectionMode === 'single') {
      return node.value === this.value;
    }
    return this.valuesArray.includes(node.value);
  }

  /** `checkbox` only — a branch whose own value is not in `value` but has at least one loaded
   *  descendant that is. Purely a display derivation: see `recomputeAncestors` for why an
   *  ancestor's own checked bit is never stored independently of "all children checked". */
  protected isPartial(node: InoTreeSelectNode): boolean {
    if (this.selectionMode !== 'checkbox' || this.isSelected(node) || !node.children?.length) {
      return false;
    }
    return this.subtreeValues(node).slice(1).some((v) => this.valuesArray.includes(v));
  }

  // ── Open / close (verbatim `ino-select` model) ─────────────────────────────────────────────

  toggle(): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
    this.open ? this.close(true) : this.openPanel();
  }

  openPanel(focusFilter = true): void {
    if (this.disabled || this.readonly || this.loading || this.open) {
      return;
    }
    this.open = true;
    this.openChange.emit(true);
    this.recomputeRows();
    const selected = this.rowsCache.findIndex((row) => this.isSelected(row.node));
    this.activeIndex = selected >= 0 ? selected : this.rowsCache.findIndex((row) => !row.node.disabled);
    if (this.filter && focusFilter) {
      queueMicrotask(() => this.filterInputRef?.nativeElement.focus());
    }
  }

  close(restoreFocus: boolean): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.openChange.emit(false);
    this.filterText = '';
    this.recomputeRows();
    if (restoreFocus) {
      this.triggerRef?.nativeElement.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !(event.target instanceof Node && this.hostContains(event.target))) {
      this.close(false);
    }
  }

  private hostContains(node: Node): boolean {
    return (
      !!this.triggerRef?.nativeElement.closest('.ino-treeselect')?.contains(node) ||
      !!this.filterInputRef?.nativeElement.closest('.ino-treeselect')?.contains(node)
    );
  }

  // ── Expand / collapse / lazy load (SPEC.md §2/§4) ──────────────────────────────────────────

  toggleExpand(node: InoTreeSelectNode, event?: Event): void {
    event?.stopPropagation();
    if (node.disabled || node.loading) {
      return;
    }
    if (this.expandedValues.has(node.value)) {
      this.expandedValues.delete(node.value);
    } else {
      this.expandedValues.add(node.value);
      if (node.hasChildren && !node.children?.length) {
        this.loadChildren.emit(node);
      }
    }
    this.recomputeRows();
  }

  // ── Selection (SPEC.md §3) ──────────────────────────────────────────────────────────────────

  activateNode(node: InoTreeSelectNode): void {
    if (this.disabled || this.readonly || this.loading || node.disabled) {
      return;
    }
    switch (this.selectionMode) {
      case 'single':
        this.value = node.value;
        this.valueChange.emit(node.value);
        this.close(true);
        break;
      case 'multiple': {
        const values = this.valuesArray;
        const selected = values.includes(node.value);
        const next = selected ? values.filter((v) => v !== node.value) : [...values, node.value];
        this.value = next;
        this.valueChange.emit(next);
        break;
      }
      case 'checkbox':
        this.toggleCheckbox(node);
        break;
    }
  }

  /** Cascades to every *loaded* descendant, then re-derives every ancestor from `node` up to the
   *  root. See `recomputeAncestors` for the ancestor rule. */
  private toggleCheckbox(node: InoTreeSelectNode): void {
    const checking = !this.isSelected(node);
    const subtree = this.subtreeValues(node);
    const base = checking
      ? [...new Set([...this.valuesArray, ...subtree])]
      : this.valuesArray.filter((v) => !subtree.includes(v));
    const next = this.recomputeAncestors(base, node);
    this.value = next;
    this.valueChange.emit(next);
  }

  private subtreeValues(node: InoTreeSelectNode): string[] {
    const values = [node.value];
    for (const child of node.children ?? []) {
      values.push(...this.subtreeValues(child));
    }
    return values;
  }

  /** An ancestor is a member of `values` iff *every* one of its loaded children is currently a
   *  member — never as a lone "this parent is checked" entry independent of its children. That is
   *  the only state this component stores; "partial" (`isPartial`) is computed from it on render,
   *  never written back into `value`. */
  private recomputeAncestors(values: string[], changedNode: InoTreeSelectNode): string[] {
    let result = values;
    let parentValue = this.parentOf.get(changedNode.value) ?? null;
    while (parentValue) {
      const parent = this.findNodeByValue(parentValue);
      if (!parent?.children?.length) {
        break;
      }
      const allChecked = parent.children.every((c) => result.includes(c.value));
      const has = result.includes(parent.value);
      if (allChecked && !has) {
        result = [...result, parent.value];
      } else if (!allChecked && has) {
        result = result.filter((v) => v !== parent.value);
      }
      parentValue = this.parentOf.get(parent.value) ?? null;
    }
    return result;
  }

  private findNodeByValue(value: string, nodes: InoTreeSelectNode[] = this.nodes): InoTreeSelectNode | null {
    for (const node of nodes) {
      if (node.value === value) {
        return node;
      }
      if (node.children?.length) {
        const found = this.findNodeByValue(value, node.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private rebuildParentMap(nodes: InoTreeSelectNode[] = this.nodes, parent: string | null = null): void {
    if (parent === null) {
      this.parentOf.clear();
    }
    for (const node of nodes) {
      this.parentOf.set(node.value, parent);
      if (node.children?.length) {
        this.rebuildParentMap(node.children, node.value);
      }
    }
  }

  // ── Filter (in-panel search box, SPEC.md §6) ───────────────────────────────────────────────

  onFilterInput(event: Event): void {
    this.filterText = (event.target as HTMLInputElement).value;
    this.filterChange.emit(this.filterText);
    this.recomputeRows();
    this.activeIndex = this.rowsCache.findIndex((row) => !row.node.disabled);
  }

  // ── Keyboard — Arrow-key tree nav over the flattened visible rows (SPEC.md §2) ────────────

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
    this.handleTreeKey(event, () => this.openPanel());
  }

  onFilterKeydown(event: KeyboardEvent): void {
    this.handleTreeKey(event, () => undefined);
  }

  private handleTreeKey(event: KeyboardEvent, openIfClosed: () => void): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open ? this.moveActive(1) : openIfClosed();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open ? this.moveActive(-1) : openIfClosed();
        break;
      case 'ArrowRight':
        if (this.open) {
          event.preventDefault();
          this.expandOrDescend();
        }
        break;
      case 'ArrowLeft':
        if (this.open) {
          event.preventDefault();
          this.collapseOrAscend();
        }
        break;
      case 'Home':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = this.rowsCache.findIndex((row) => !row.node.disabled);
        }
        break;
      case 'End':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = findLastIndex(this.rowsCache, (row) => !row.node.disabled);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.open ? this.activateActive() : openIfClosed();
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          this.close(true);
        }
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  private activateActive(): void {
    const row = this.rowsCache[this.activeIndex];
    if (row) {
      this.activateNode(row.node);
    }
  }

  private expandOrDescend(): void {
    const row = this.rowsCache[this.activeIndex];
    if (!row?.hasVisibleChildren) {
      return;
    }
    if (!this.expandedValues.has(row.node.value)) {
      this.toggleExpand(row.node);
      this.setActiveByValue(row.node.value);
    } else {
      this.moveActive(1);
    }
  }

  private collapseOrAscend(): void {
    const row = this.rowsCache[this.activeIndex];
    if (!row) {
      return;
    }
    if (row.hasVisibleChildren && this.expandedValues.has(row.node.value)) {
      this.toggleExpand(row.node);
      this.setActiveByValue(row.node.value);
    } else if (row.parentValues.length) {
      this.setActiveByValue(row.parentValues[row.parentValues.length - 1]);
    }
  }

  private setActiveByValue(value: string): void {
    const index = this.rowsCache.findIndex((row) => row.node.value === value);
    if (index >= 0) {
      this.activeIndex = index;
    }
  }

  private moveActive(delta: number): void {
    const enabled = this.rowsCache.map((row, index) => (row.node.disabled ? -1 : index)).filter((i) => i >= 0);
    if (!enabled.length) {
      return;
    }
    const currentPos = enabled.indexOf(this.activeIndex);
    const nextPos = clamp(currentPos + delta, 0, enabled.length - 1);
    this.activeIndex = enabled[nextPos];
  }

  // ── Flatten (SPEC.md §2) ────────────────────────────────────────────────────────────────────

  private recomputeRows(): void {
    const query = this.filterText.trim().toLowerCase();
    const sourceNodes = query ? this.buildFilteredNodes(this.nodes, query) : this.nodes;
    const out: InoTreeSelectRow[] = [];
    this.flattenInto(sourceNodes, 0, [], !!query, out);
    this.rowsCache = out;
  }

  /** Only *loaded* nodes are searched — a collapsed lazy branch whose children were never fetched
   *  can't match (same limitation `ino-autocomplete`'s static-array `options` input accepts for
   *  its own async case). A branch survives the filter if its own label matches or any descendant
   *  does; surviving branches keep only their matching descendants. */
  private buildFilteredNodes(nodes: InoTreeSelectNode[], query: string): InoTreeSelectNode[] {
    const result: InoTreeSelectNode[] = [];
    for (const node of nodes) {
      const children = node.children?.length ? this.buildFilteredNodes(node.children, query) : [];
      const selfMatches = node.label.toLowerCase().includes(query);
      if (selfMatches || children.length) {
        result.push(children.length ? { ...node, children } : node);
      }
    }
    return result;
  }

  /** `forceExpand` is `true` while filtering — every surviving branch is shown open so the match
   *  is visible without the user having to expand anything; it does not touch `expandedValues`,
   *  so clearing the filter restores whatever was expanded before. */
  private flattenInto(
    nodes: InoTreeSelectNode[],
    level: number,
    parentValues: string[],
    forceExpand: boolean,
    out: InoTreeSelectRow[],
  ): void {
    for (const node of nodes) {
      const hasVisibleChildren = !!node.children?.length || !!node.hasChildren;
      out.push({ node, index: out.length, level, parentValues, hasVisibleChildren });
      const expanded = forceExpand || this.expandedValues.has(node.value);
      if (expanded && node.children?.length) {
        this.flattenInto(node.children, level + 1, [...parentValues, node.value], forceExpand, out);
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function findLastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) {
      return i;
    }
  }
  return -1;
}
