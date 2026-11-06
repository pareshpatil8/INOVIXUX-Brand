import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoLabelComponent } from '../label/ino-label.component';

export interface InoTreeNode {
  label: string;
  value: string;
  children?: InoTreeNode[];
  /** Renders the expand affordance even though `children` is empty/undefined — doc 26 §5's "lazy
   *  children". Toggling this node open while it's `true` and `children` is still empty emits
   *  `loadChildren`; the parent answers by pushing a *new* `nodes` array back in with this node's
   *  `children` populated — same async-datasource contract `ino-treeselect`'s `loadChildren`
   *  (itself matching `ino-autocomplete`'s `search`) documents: plain `@Input`/`@Output`, no
   *  Observable baked in. See SPEC.md §4. */
  hasChildren?: boolean;
  /** Parent sets this while a `loadChildren` fetch for this node is in flight — renders the
   *  "loading branch" state (doc 26 §5) in place of the expand chevron. */
  loading?: boolean;
  disabled?: boolean;
}

interface InoTreeRow {
  node: InoTreeNode;
  /** Absolute index into the flattened *visible* row list — the roving-`tabindex` target, same
   *  model `ino-listbox`'s own flat row list uses. */
  index: number;
  /** 0-based depth; `aria-level` is `level + 1`. */
  level: number;
  /** Ancestor chain, root-first, nearest parent last — `ArrowLeft`'s "move to parent" target. */
  parentValues: string[];
  hasVisibleChildren: boolean;
}

let idCounter = 0;

/**
 * `<ino-tree>` — always-visible WAI-ARIA APG "Tree View" (INO-450, INO-31 Phase B3, doc 26 §5 row
 * `ino-tree`).
 *
 * Reuses `ino-listbox`'s (INO-414) always-visible roving-`tabindex` core — `role="tree"` is always
 * in the DOM, real DOM focus moves between `role="treeitem"` rows (exactly one carries
 * `tabindex="0"` at a time), and `aria-activedescendant` is never used. This is the deliberately
 * different choice from `ino-treeselect`'s combobox-trigger model: a tree is never collapsed behind
 * a trigger, so there is no overlay to manage and no reason to keep real focus off the rows. See
 * SPEC.md §1.
 *
 * The flatten/expand/lazy-load/checkbox-cascade core is ported from `ino-treeselect`
 * (`web/src/app/components/treeselect/ino-treeselect.component.ts`), whose own header comment
 * flagged this exact extraction as the intended follow-up once `ino-tree` shipped. See SPEC.md §1
 * for what changed in the port (roving tabindex instead of `aria-activedescendant`, no open/close
 * state, `selectionMode: 'basic' | 'checkbox'` instead of `'single' | 'multiple' | 'checkbox'`).
 *
 * `@Input() value: string | string[]` / `@Output() valueChange` (banana-in-a-box), matching every
 * other Tier-1 form control in this repo — no `ControlValueAccessor`.
 */
@Component({
  selector: 'ino-tree',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-tree.component.html',
  styleUrl: './ino-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-tree',
    '[class.ino-tree--compact]': "size === 'compact'",
  },
})
export class InoTreeComponent implements OnChanges {
  @Input() label = '';
  @Input() nodes: InoTreeNode[] = [];
  /** `string` when `multiple` is `false` (default) and `selectionMode` is `'basic'`, `string[]`
   *  otherwise (`multiple` `'basic'`, or any `'checkbox'`). See SPEC.md §3. */
  @Input() value: string | string[] = '';
  /** Doc 26 §5's "basic/checkbox selection" structure variant.
   *  `'basic'` — plain row selection/highlight, no cascade to descendants or ancestors; `multiple`
   *  (below) picks single vs. multi membership within this mode, reusing `ino-listbox`'s flag.
   *  `'checkbox'` — always multi, cascades to every *loaded* descendant and re-derives each
   *  ancestor's membership (full/partial/none) — doc 26 §5's "partial-checked" state. */
  @Input() selectionMode: 'basic' | 'checkbox' = 'basic';
  /** `'basic'` mode only — toggle-without-losing-other-rows membership instead of single
   *  replace-on-activate. No effect in `'checkbox'` mode, which is always multi. Reuses
   *  `ino-listbox`'s own flag verbatim rather than inventing a third `selectionMode` value the doc
   *  26 §5 row never names. See SPEC.md §3. */
  @Input({ transform: booleanAttribute }) multiple = false;
  @Input() hint = '';
  @Input() error = '';
  /** Doc 26 §5: "compact/comfortable", not the sm/default/lg control-size scale — a two-value
   *  padding axis independent of `[data-density]`, same idiom `<ino-accordion>`/`<ino-fieldset>`
   *  use. See SPEC.md §2. */
  @Input() size: 'compact' | 'comfortable' = 'comfortable';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  /** Component-level async flag — suppresses *committing* a selection while an unrelated fetch is
   *  in flight; the tree stays rendered and interactive-looking (`aria-busy`). Distinct from a
   *  per-node `loading` (lazy children fetch) — see SPEC.md §5. */
  @Input({ transform: booleanAttribute }) loading = false;
  /** Always-visible search box above the tree (doc 26 §5 names "filter" as baseline structure, not
   *  an opt-in extra — same call `ino-listbox` makes for its own filter box). Searches the whole
   *  *loaded* tree, not just visible rows; see SPEC.md §6. */
  @Input({ transform: booleanAttribute }) filter = true;
  @Input() filterLabel = 'Filter';
  @Input() filterPlaceholder = 'Filter…';

  @Output() readonly valueChange = new EventEmitter<string | string[]>();
  @Output() readonly filterChange = new EventEmitter<string>();
  /** Fires when a lazy node (`hasChildren: true`, `children` still empty/undefined) is expanded —
   *  the hook a parent uses to fetch and push that node's children back in. See SPEC.md §4. */
  @Output() readonly loadChildren = new EventEmitter<InoTreeNode>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly treeId = `ino-tree-${++idCounter}`;
  protected readonly hintId = `${this.treeId}-hint`;
  protected readonly errorId = `${this.treeId}-error`;

  /** Roving-`tabindex` target — the one row currently focusable via `Tab`. `-1` before the first
   *  render/interaction (no row has received focus yet). */
  protected activeIndex = -1;
  protected filterText = '';

  private readonly expandedValues = new Set<string>();
  private readonly parentOf = new Map<string, string | null>();
  private rowsCache: InoTreeRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // Single source of recompute — same call this component's `rows`/`activeIndex` state makes
    // (`ino-listbox.ngOnChanges`), not duplicated into `ngAfterViewInit`. Unlike `ino-treeselect`,
    // this tree's rows are always rendered (no open/closed panel gating them), so a second recompute
    // after the first view check would hand `*ngFor` a brand-new array of row objects one tick
    // later — same array *content*, different object identity — which the default identity-based
    // iterable differ reads as "remove everything, insert everything", tearing down and rebuilding
    // every `<li>` on the next change-detection pass for no observable reason.
    if (changes['nodes']) {
      this.rebuildParentMap();
    }
    if (changes['nodes'] || changes['filter']) {
      this.recomputeRows();
      this.resetActiveIndex();
    }
  }

  // ── Value shape (SPEC.md §3) ────────────────────────────────────────────────────────────────

  get valuesArray(): string[] {
    if (Array.isArray(this.value)) {
      return this.value;
    }
    return this.value ? [this.value] : [];
  }

  get rows(): InoTreeRow[] {
    return this.rowsCache;
  }

  get isFilteredEmpty(): boolean {
    return this.filterText.trim().length > 0 && this.rowsCache.length === 0;
  }

  get emptyMessage(): string {
    return this.filterText.trim() ? 'No matches.' : 'No options.';
  }

  protected rowId(index: number): string {
    return `${this.treeId}-row-${index}`;
  }

  /** Keyed on `node.value` (globally unique — `parentOf`/`findNodeByValue`/`setActiveByValue`
   *  already assume this) so expand/collapse only inserts/removes the affected rows' `<li>`s
   *  instead of Angular's default identity differ tearing down and rebuilding every row —
   *  that teardown destroyed the focused `<li>` out from under `focusActiveRow()` before its
   *  `querySelector` ran, dropping DOM focus to `<body>` (INO-892). */
  protected trackRow(_index: number, row: InoTreeRow): string {
    return row.node.value;
  }

  protected isActiveTabStop(index: number): boolean {
    return index === this.activeIndex;
  }

  protected isExpanded(node: InoTreeNode): boolean {
    return this.expandedValues.has(node.value) || this.filterText.trim().length > 0;
  }

  /** `'basic'` + not `multiple`: this is *the* value. Every other combination: plain membership —
   *  `'checkbox'` layers `isPartial` on top for the ancestor tri-state display. */
  protected isSelected(node: InoTreeNode): boolean {
    if (this.selectionMode === 'basic' && !this.multiple) {
      return node.value === this.value;
    }
    return this.valuesArray.includes(node.value);
  }

  /** `'checkbox'` only — a branch whose own value is not in `value` but has at least one loaded
   *  descendant that is. Purely a display derivation: see `recomputeAncestors` for why an
   *  ancestor's own checked bit is never stored independently of "all children checked". */
  protected isPartial(node: InoTreeNode): boolean {
    if (this.selectionMode !== 'checkbox' || this.isSelected(node) || !node.children?.length) {
      return false;
    }
    return this.subtreeValues(node).slice(1).some((v) => this.valuesArray.includes(v));
  }

  // ── Expand / collapse / lazy load (SPEC.md §2/§4) ──────────────────────────────────────────

  toggleExpand(node: InoTreeNode, event?: Event): void {
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

  activateNode(node: InoTreeNode, index: number): void {
    if (this.disabled || this.readonly || this.loading || node.disabled) {
      return;
    }
    this.activeIndex = index;
    if (this.selectionMode === 'checkbox') {
      this.toggleCheckbox(node);
    } else if (this.multiple) {
      const values = this.valuesArray;
      const selected = values.includes(node.value);
      const next = selected ? values.filter((v) => v !== node.value) : [...values, node.value];
      this.value = next;
      this.valueChange.emit(next);
    } else {
      this.value = node.value;
      this.valueChange.emit(node.value);
    }
    this.focusActiveRow();
  }

  /** Cascades to every *loaded* descendant, then re-derives every ancestor from `node` up to the
   *  root. See `recomputeAncestors` for the ancestor rule. */
  private toggleCheckbox(node: InoTreeNode): void {
    const checking = !this.isSelected(node);
    const subtree = this.subtreeValues(node);
    const base = checking
      ? [...new Set([...this.valuesArray, ...subtree])]
      : this.valuesArray.filter((v) => !subtree.includes(v));
    const next = this.recomputeAncestors(base, node);
    this.value = next;
    this.valueChange.emit(next);
  }

  private subtreeValues(node: InoTreeNode): string[] {
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
  private recomputeAncestors(values: string[], changedNode: InoTreeNode): string[] {
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

  private findNodeByValue(value: string, nodes: InoTreeNode[] = this.nodes): InoTreeNode | null {
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

  private rebuildParentMap(nodes: InoTreeNode[] = this.nodes, parent: string | null = null): void {
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

  // ── Filter (always-visible search box, SPEC.md §6) ─────────────────────────────────────────

  onFilterInput(event: Event): void {
    this.filterText = (event.target as HTMLInputElement).value;
    this.filterChange.emit(this.filterText);
    this.recomputeRows();
    this.resetActiveIndex();
  }

  onFilterKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      // Moves real DOM focus from the filter box into the tree — same explicit-focus-move
      // rationale `ino-listbox.onFilterKeydown` documents for its own filter box.
      event.preventDefault();
      if (this.activeIndex < 0) {
        this.resetActiveIndex();
      }
      this.focusActiveRow();
    } else if (event.key === 'Escape' && this.filterText) {
      event.preventDefault();
      this.filterText = '';
      this.filterChange.emit('');
      this.recomputeRows();
      this.resetActiveIndex();
    }
  }

  // ── Keyboard — full APG tree Arrow map, roving tabindex (SPEC.md §2) ──────────────────────

  onRowKeydown(event: KeyboardEvent, row: InoTreeRow): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.expandOrDescend(row);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.collapseOrAscend(row);
        break;
      case 'Home':
        event.preventDefault();
        this.jumpActive(this.rowsCache.findIndex((r) => !r.node.disabled));
        break;
      case 'End':
        event.preventDefault();
        this.jumpActive(findLastIndex(this.rowsCache, (r) => !r.node.disabled));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateNode(row.node, row.index);
        break;
    }
  }

  private expandOrDescend(row: InoTreeRow): void {
    if (!row.hasVisibleChildren) {
      return;
    }
    if (!this.expandedValues.has(row.node.value)) {
      this.toggleExpand(row.node);
      this.setActiveByValue(row.node.value);
    } else {
      this.moveActive(1);
    }
  }

  private collapseOrAscend(row: InoTreeRow): void {
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
      this.jumpActive(index);
    }
  }

  private moveActive(delta: number): void {
    const enabled = this.rowsCache.map((row, index) => (row.node.disabled ? -1 : index)).filter((i) => i >= 0);
    if (!enabled.length) {
      return;
    }
    const currentPos = enabled.indexOf(this.activeIndex);
    const nextPos = clamp(currentPos + delta, 0, enabled.length - 1);
    this.jumpActive(enabled[nextPos]);
  }

  private jumpActive(index: number): void {
    if (index < 0) {
      return;
    }
    this.activeIndex = index;
    this.focusActiveRow();
  }

  /** Sets `activeIndex` to the first selected row, or the first enabled row when nothing is
   *  selected yet — without emitting `valueChange`, same non-committing seed `ino-listbox`'s own
   *  `resetActiveIndex` documents. */
  private resetActiveIndex(): void {
    const rows = this.rowsCache;
    const selectedIndex = rows.findIndex((r) => this.isSelected(r.node));
    this.activeIndex = selectedIndex >= 0 ? selectedIndex : rows.findIndex((r) => !r.node.disabled);
  }

  private focusActiveRow(): void {
    if (this.activeIndex < 0) {
      return;
    }
    const id = this.rowId(this.activeIndex);
    queueMicrotask(() => {
      this.host.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`)?.focus();
    });
  }

  // ── Flatten (SPEC.md §2) ────────────────────────────────────────────────────────────────────

  private recomputeRows(): void {
    const query = this.filterText.trim().toLowerCase();
    const sourceNodes = query ? this.buildFilteredNodes(this.nodes, query) : this.nodes;
    const out: InoTreeRow[] = [];
    this.flattenInto(sourceNodes, 0, [], !!query, out);
    this.rowsCache = out;
  }

  /** Only *loaded* nodes are searched — a collapsed lazy branch whose children were never fetched
   *  can't match. A branch survives the filter if its own label matches or any descendant does;
   *  surviving branches keep only their matching descendants. */
  private buildFilteredNodes(nodes: InoTreeNode[], query: string): InoTreeNode[] {
    const result: InoTreeNode[] = [];
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
    nodes: InoTreeNode[],
    level: number,
    parentValues: string[],
    forceExpand: boolean,
    out: InoTreeRow[],
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
