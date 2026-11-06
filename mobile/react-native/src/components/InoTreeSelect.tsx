import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space, type } from '../theme/tokens';
import { InoLabel } from './InoLabel';

/**
 * `<InoTreeSelect>` — RN port of `<ino-treeselect>`
 * (`web/src/app/components/treeselect`, INO-416 / INO-31 Phase B1).
 *
 * Same structural choice `InoListbox`'s own port makes for the same doc 26 §5 instruction
 * ("mobile sheet variant"): a trigger-plus-modal-sheet, not an inline tree. The sheet's content is
 * a flattened, indented row list (ported from the web component's `flatten`/`buildFilteredNodes`
 * model — see `web/src/app/components/treeselect/SPEC.md` §2/§6) rendered through `FlatList`
 * rather than a recursive tree widget, for the same reason `InoListbox`'s port uses `FlatList`
 * over a hand-rolled virtualizer: the platform primitive already windows rows.
 *
 * Doc 26 §5 names `ino-tree` (Phase B3) as the web component's dependency; no Phase B3 mobile
 * port exists either, so this tree-rendering core is self-contained here too (SPEC.md §1/§7).
 *
 * **Not ported**: `ArrowRight`/`ArrowLeft` keyboard tree nav — no hardware keyboard on the target
 * form factor; tapping the chevron is the only expand/collapse affordance.
 *
 * **Overlay idiom / ARIA substitution** — identical to `InoListbox`'s: a scrimmed bottom sheet,
 * each row a `button` carrying `accessibilityState` (`selected` or `checked`, mode-dependent) and
 * the row's nesting depth is conveyed by indentation only (RN's accessibility API has no
 * `aria-level` equivalent).
 */

export type InoTreeSelectSize = ControlSize;
export type InoTreeSelectMode = 'single' | 'multiple' | 'checkbox';

export interface InoTreeSelectNode {
  label: string;
  value: string;
  children?: InoTreeSelectNode[];
  /** See the web component's doc comment — renders the expand affordance even though `children`
   *  is empty/undefined; expanding emits `onLoadChildren`. */
  hasChildren?: boolean;
  /** "Loading branch" state — replaces this row's chevron with a spinner. */
  loading?: boolean;
  disabled?: boolean;
}

interface FlatRow {
  node: InoTreeSelectNode;
  level: number;
  parentValues: string[];
  hasVisibleChildren: boolean;
}

export interface InoTreeSelectProps {
  label?: string;
  nodes: InoTreeSelectNode[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  /** `'single'` (default) — `value` is `string`. `'multiple'`/`'checkbox'` — `value` is
   *  `string[]`; `'checkbox'` cascades to loaded descendants/ancestors, same rule as web's
   *  SPEC.md §4. */
  selectionMode?: InoTreeSelectMode;
  placeholder?: string;
  hint?: string;
  error?: string;
  size?: InoTreeSelectSize;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  filter?: boolean;
  filterPlaceholder?: string;
  sheetTitle?: string;
  onFilterChange?: (text: string) => void;
  onOpenChange?: (open: boolean) => void;
  onLoadChildren?: (node: InoTreeSelectNode) => void;
}

function findNode(nodes: InoTreeSelectNode[], value: string): InoTreeSelectNode | null {
  for (const node of nodes) {
    if (node.value === value) return node;
    if (node.children?.length) {
      const found = findNode(node.children, value);
      if (found) return found;
    }
  }
  return null;
}

function buildParentMap(nodes: InoTreeSelectNode[], parent: string | null, out: Map<string, string | null>): void {
  for (const node of nodes) {
    out.set(node.value, parent);
    if (node.children?.length) buildParentMap(node.children, node.value, out);
  }
}

function subtreeValues(node: InoTreeSelectNode): string[] {
  const values = [node.value];
  for (const child of node.children ?? []) values.push(...subtreeValues(child));
  return values;
}

// Same trimmed/lower-cased substring predicate the web component's `buildFilteredNodes` uses —
// only loaded nodes are searched.
function buildFilteredNodes(nodes: InoTreeSelectNode[], query: string): InoTreeSelectNode[] {
  const result: InoTreeSelectNode[] = [];
  for (const node of nodes) {
    const children = node.children?.length ? buildFilteredNodes(node.children, query) : [];
    const selfMatches = node.label.toLowerCase().includes(query);
    if (selfMatches || children.length) {
      result.push(children.length ? { ...node, children } : node);
    }
  }
  return result;
}

function flatten(
  nodes: InoTreeSelectNode[],
  level: number,
  parentValues: string[],
  forceExpand: boolean,
  expanded: Set<string>,
  out: FlatRow[],
): void {
  for (const node of nodes) {
    const hasVisibleChildren = !!node.children?.length || !!node.hasChildren;
    out.push({ node, level, parentValues, hasVisibleChildren });
    const isExpanded = forceExpand || expanded.has(node.value);
    if (isExpanded && node.children?.length) {
      flatten(node.children, level + 1, [...parentValues, node.value], forceExpand, expanded, out);
    }
  }
}

export function InoTreeSelect(props: InoTreeSelectProps) {
  const {
    label,
    nodes,
    value,
    onChange,
    selectionMode = 'single',
    placeholder = 'Select',
    hint,
    error,
    size = 'default',
    required = false,
    disabled = false,
    loading = false,
    filter = true,
    filterPlaceholder = 'Filter…',
    sheetTitle,
    onFilterChange,
    onOpenChange,
    onLoadChildren,
  } = props;

  const { colors } = useTheme();
  const c = control[size];
  const invalid = !!error;
  const nonInteractive = disabled || loading;

  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [expandedValues, setExpandedValues] = useState<Set<string>>(new Set());

  const valuesArray = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  const parentOf = useMemo(() => {
    const map = new Map<string, string | null>();
    buildParentMap(nodes, null, map);
    return map;
  }, [nodes]);

  const selectedNodes = useMemo(() => {
    if (!valuesArray.length) return [];
    const found: InoTreeSelectNode[] = [];
    const walk = (list: InoTreeSelectNode[]) => {
      for (const node of list) {
        if (valuesArray.includes(node.value)) found.push(node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(nodes);
    return found;
  }, [nodes, valuesArray]);

  const triggerLabel = selectedNodes.length ? selectedNodes.map((n) => n.label).join(', ') : placeholder;

  const rows = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    const source = query ? buildFilteredNodes(nodes, query) : nodes;
    const out: FlatRow[] = [];
    flatten(source, 0, [], !!query, expandedValues, out);
    return out;
  }, [nodes, filterText, expandedValues]);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) setFilterText('');
  };

  const toggleExpand = (node: InoTreeSelectNode) => {
    if (node.disabled || node.loading) return;
    setExpandedValues((prev) => {
      const next = new Set(prev);
      if (next.has(node.value)) {
        next.delete(node.value);
      } else {
        next.add(node.value);
        if (node.hasChildren && !node.children?.length) {
          onLoadChildren?.(node);
        }
      }
      return next;
    });
  };

  const isSelected = (node: InoTreeSelectNode): boolean =>
    selectionMode === 'single' ? node.value === value : valuesArray.includes(node.value);

  const isPartial = (node: InoTreeSelectNode): boolean => {
    if (selectionMode !== 'checkbox' || isSelected(node) || !node.children?.length) return false;
    return subtreeValues(node).slice(1).some((v) => valuesArray.includes(v));
  };

  // Same ancestor rule as the web component's `recomputeAncestors` — an ancestor is a member of
  // `value` iff every one of its loaded children is; never stored independently of that.
  const recomputeAncestors = (values: string[], changedNode: InoTreeSelectNode): string[] => {
    let result = values;
    let parentValue = parentOf.get(changedNode.value) ?? null;
    while (parentValue) {
      const parent = findNode(nodes, parentValue);
      if (!parent?.children?.length) break;
      const allChecked = parent.children.every((c) => result.includes(c.value));
      const has = result.includes(parent.value);
      if (allChecked && !has) result = [...result, parent.value];
      else if (!allChecked && has) result = result.filter((v) => v !== parent.value);
      parentValue = parentOf.get(parent.value) ?? null;
    }
    return result;
  };

  const activate = (node: InoTreeSelectNode) => {
    if (node.disabled) return;
    if (selectionMode === 'single') {
      onChange(node.value);
      setOpenState(false);
      return;
    }
    if (selectionMode === 'multiple') {
      const selected = valuesArray.includes(node.value);
      onChange(selected ? valuesArray.filter((v) => v !== node.value) : [...valuesArray, node.value]);
      return;
    }
    // checkbox: cascade to loaded descendants, then re-derive ancestors.
    const checking = !isSelected(node);
    const subtree = subtreeValues(node);
    const base = checking
      ? [...new Set([...valuesArray, ...subtree])]
      : valuesArray.filter((v) => !subtree.includes(v));
    onChange(recomputeAncestors(base, node));
  };

  return (
    <View style={styles.field}>
      {label ? (
        <InoLabel size={size} required={required} disabled={disabled} invalid={invalid}>
          {label}
        </InoLabel>
      ) : null}

      <View style={styles.controlWrap}>
        <Pressable
          onPress={() => !nonInteractive && setOpenState(!open)}
          disabled={nonInteractive}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: triggerLabel }}
          accessibilityState={{ disabled, expanded: open, busy: loading }}
          accessibilityHint="Opens a tree of selectable options"
          style={({ pressed }) => [
            styles.control,
            {
              minHeight: c.height,
              paddingHorizontal: c.paddingInline,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceSunken,
              borderColor: invalid ? colors.danger : open || pressed ? colors.accent : colors.border,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.value,
              { fontSize: c.fontSize, color: selectedNodes.length ? colors.onSurface : colors.onSurfaceSubtle },
            ]}
          >
            {triggerLabel}
          </Text>
          {loading ? <ActivityIndicator size="small" color={colors.onSurfaceMuted} /> : null}
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ color: colors.onSurfaceMuted, fontSize: c.iconSize - 6 }}
          >
            ▾
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.message, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.onSurfaceMuted }]}>{hint}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpenState(false)}>
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.overlayScrim }]}
          onPress={() => setOpenState(false)}
          accessibilityLabel="Close options"
        />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <View style={[styles.grabber, { backgroundColor: colors.borderSoft }]} />
          <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>{sheetTitle ?? label ?? placeholder}</Text>

          {filter ? (
            <TextInput
              autoFocus
              value={filterText}
              onChangeText={(text) => {
                setFilterText(text);
                onFilterChange?.(text);
              }}
              placeholder={filterPlaceholder}
              placeholderTextColor={colors.onSurfaceSubtle}
              accessibilityLabel={filterPlaceholder}
              style={[
                styles.filter,
                {
                  minHeight: c.height,
                  paddingHorizontal: c.paddingInline,
                  fontSize: c.fontSize,
                  borderRadius: radius.md,
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceSunken,
                  borderColor: colors.border,
                },
              ]}
            />
          ) : null}

          {rows.length ? (
            <FlatList
              data={rows}
              keyExtractor={(row) => row.node.value}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const { node, level, hasVisibleChildren } = item;
                const selected = isSelected(node);
                const partial = isPartial(node);
                const rowDisabled = !!node.disabled;
                const checkGlyph = partial ? '⊟' : selected ? '☑' : '☐';
                return (
                  <Pressable
                    onPress={() => activate(node)}
                    disabled={rowDisabled}
                    accessibilityRole="button"
                    accessibilityState={
                      selectionMode === 'checkbox'
                        ? { checked: partial ? 'mixed' : selected, disabled: rowDisabled }
                        : { selected, disabled: rowDisabled }
                    }
                    style={({ pressed }) => [
                      styles.option,
                      {
                        paddingLeft: c.paddingInline + level * 20,
                        paddingHorizontal: c.paddingInline,
                        backgroundColor: pressed && !rowDisabled ? colors.surfaceSunken : 'transparent',
                      },
                    ]}
                  >
                    {hasVisibleChildren ? (
                      <Pressable
                        onPress={() => toggleExpand(node)}
                        disabled={node.loading}
                        hitSlop={8}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        style={styles.toggle}
                      >
                        {node.loading ? (
                          <ActivityIndicator size="small" color={colors.onSurfaceMuted} />
                        ) : (
                          <Text style={{ color: colors.onSurfaceMuted, fontSize: 11 }}>
                            {expandedValues.has(node.value) || filterText.trim() ? '▾' : '▸'}
                          </Text>
                        )}
                      </Pressable>
                    ) : (
                      <View style={styles.toggle} />
                    )}

                    {selectionMode === 'checkbox' ? (
                      <Text style={{ fontSize: c.fontSize, color: rowDisabled ? colors.onSurfaceSubtle : colors.onSurfaceMuted }}>
                        {checkGlyph}
                      </Text>
                    ) : null}

                    <Text
                      style={{
                        flex: 1,
                        fontSize: c.fontSize,
                        color: rowDisabled ? colors.onSurfaceSubtle : selected ? colors.accentTextSafe : colors.onSurface,
                        fontWeight: selected ? '600' : '400',
                      }}
                    >
                      {node.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          ) : (
            <Text style={[styles.empty, { color: colors.onSurfaceMuted }]}>
              {filterText.trim() ? 'No matches.' : 'No options.'}
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  controlWrap: { position: 'relative', justifyContent: 'center' },
  control: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: space[2] },
  value: { flex: 1 },
  message: { fontSize: 12.5 },
  scrim: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[7],
    gap: space[3],
  },
  grabber: { width: 36, height: 4, borderRadius: radius.sm, alignSelf: 'center' },
  sheetTitle: { ...type.h3 },
  filter: { borderWidth: 1 },
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  toggle: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  empty: { ...type.bodySm, paddingVertical: space[4] },
});
