import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_label.dart';

/// Selection mode — mirrors the web component's `selectionMode` input.
enum InoTreeSelectMode { single, multiple, checkbox }

/// One tree node. See the web component's doc comment
/// (`web/src/app/components/treeselect/ino-treeselect.component.ts`) for the lazy-loading and
/// loading-branch contract `hasChildren`/`loading` carry.
class InoTreeSelectNode {
  final String label;
  final String value;
  final List<InoTreeSelectNode>? children;
  final bool hasChildren;
  final bool loading;
  final bool disabled;

  const InoTreeSelectNode({
    required this.label,
    required this.value,
    this.children,
    this.hasChildren = false,
    this.loading = false,
    this.disabled = false,
  });
}

class _FlatRow {
  final InoTreeSelectNode node;
  final int level;
  final List<String> parentValues;
  final bool hasVisibleChildren;

  _FlatRow(this.node, this.level, this.parentValues, this.hasVisibleChildren);
}

InoTreeSelectNode? _findNode(List<InoTreeSelectNode> nodes, String value) {
  for (final node in nodes) {
    if (node.value == value) return node;
    if (node.children != null) {
      final found = _findNode(node.children!, value);
      if (found != null) return found;
    }
  }
  return null;
}

void _buildParentMap(List<InoTreeSelectNode> nodes, String? parent, Map<String, String?> out) {
  for (final node in nodes) {
    out[node.value] = parent;
    if (node.children != null) _buildParentMap(node.children!, node.value, out);
  }
}

List<String> _subtreeValues(InoTreeSelectNode node) {
  final values = [node.value];
  for (final child in node.children ?? const <InoTreeSelectNode>[]) {
    values.addAll(_subtreeValues(child));
  }
  return values;
}

/// Same trimmed/lower-cased substring predicate the web component's `buildFilteredNodes` uses —
/// only loaded nodes are searched.
List<InoTreeSelectNode> _buildFilteredNodes(List<InoTreeSelectNode> nodes, String query) {
  final result = <InoTreeSelectNode>[];
  for (final node in nodes) {
    final children = node.children != null ? _buildFilteredNodes(node.children!, query) : <InoTreeSelectNode>[];
    final selfMatches = node.label.toLowerCase().contains(query);
    if (selfMatches || children.isNotEmpty) {
      result.add(children.isNotEmpty
          ? InoTreeSelectNode(
              label: node.label,
              value: node.value,
              children: children,
              hasChildren: node.hasChildren,
              loading: node.loading,
              disabled: node.disabled,
            )
          : node);
    }
  }
  return result;
}

void _flatten(
  List<InoTreeSelectNode> nodes,
  int level,
  List<String> parentValues,
  bool forceExpand,
  Set<String> expanded,
  List<_FlatRow> out,
) {
  for (final node in nodes) {
    final hasVisibleChildren = (node.children?.isNotEmpty ?? false) || node.hasChildren;
    out.add(_FlatRow(node, level, parentValues, hasVisibleChildren));
    final isExpanded = forceExpand || expanded.contains(node.value);
    if (isExpanded && (node.children?.isNotEmpty ?? false)) {
      _flatten(node.children!, level + 1, [...parentValues, node.value], forceExpand, expanded, out);
    }
  }
}

/// `InoTreeSelect` — Flutter port of `<ino-treeselect>`
/// (`web/src/app/components/treeselect`, INO-416 / INO-31 Phase B1).
///
/// Same structural choice [InoListbox]'s own port makes for doc 26 §5's "mobile sheet variant":
/// trigger-plus-`showModalBottomSheet`, sheet content a flattened/indented row list
/// (`ListView.builder`) ported from the web component's flatten model — see
/// `web/src/app/components/treeselect/SPEC.md` §2/§6. `ino-tree` (Phase B3) has no mobile port
/// either, so the tree-rendering core is self-contained here too (SPEC.md §1/§7).
///
/// **Not ported**: `ArrowRight`/`ArrowLeft` keyboard nav (no hardware keyboard on the target form
/// factor; the chevron tap is the only expand/collapse affordance).
class InoTreeSelect extends StatefulWidget {
  final String? label;
  final List<InoTreeSelectNode> nodes;

  /// `single` — [value] is a `String?`. `multiple`/`checkbox` — [value] is a `List<String>`.
  final dynamic value;
  final ValueChanged<dynamic> onChanged;
  final InoTreeSelectMode selectionMode;

  final String placeholder;
  final String? hint;
  final String? error;
  final InoControlSize size;
  final bool required;
  final bool disabled;
  final bool loading;

  final bool filter;
  final String filterPlaceholder;

  final String? sheetTitle;
  final ValueChanged<String>? onFilterChanged;
  final ValueChanged<bool>? onOpenChanged;
  final ValueChanged<InoTreeSelectNode>? onLoadChildren;

  const InoTreeSelect({
    super.key,
    this.label,
    required this.nodes,
    required this.value,
    required this.onChanged,
    this.selectionMode = InoTreeSelectMode.single,
    this.placeholder = 'Select',
    this.hint,
    this.error,
    this.size = InoControlSize.standard,
    this.required = false,
    this.disabled = false,
    this.loading = false,
    this.filter = true,
    this.filterPlaceholder = 'Filter…',
    this.sheetTitle,
    this.onFilterChanged,
    this.onOpenChanged,
    this.onLoadChildren,
  });

  @override
  State<InoTreeSelect> createState() => _InoTreeSelectState();
}

class _InoTreeSelectState extends State<InoTreeSelect> {
  bool get _nonInteractive => widget.disabled || widget.loading;

  List<String> get _valuesArray {
    if (widget.selectionMode != InoTreeSelectMode.single) {
      return List<String>.from(widget.value as List<dynamic>? ?? const []);
    }
    final v = widget.value as String?;
    return (v == null || v.isEmpty) ? const [] : [v];
  }

  List<InoTreeSelectNode> get _selectedNodes {
    final values = _valuesArray;
    if (values.isEmpty) return const [];
    final found = <InoTreeSelectNode>[];
    void walk(List<InoTreeSelectNode> list) {
      for (final node in list) {
        if (values.contains(node.value)) found.add(node);
        if (node.children != null) walk(node.children!);
      }
    }
    walk(widget.nodes);
    return found;
  }

  Future<void> _open(BuildContext context) async {
    if (_nonInteractive) return;
    final colors = context.inoColors;
    widget.onOpenChanged?.call(true);
    await showModalBottomSheet<void>(
      context: context,
      barrierColor: colors.overlayScrim,
      backgroundColor: colors.surfaceRaised,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(InoRadius.xl)),
      ),
      builder: (sheetContext) => _TreeSheet(
        title: widget.sheetTitle ?? widget.label ?? widget.placeholder,
        nodes: widget.nodes,
        initialValues: _valuesArray,
        selectionMode: widget.selectionMode,
        size: widget.size,
        filter: widget.filter,
        filterPlaceholder: widget.filterPlaceholder,
        onFilterChanged: widget.onFilterChanged,
        onLoadChildren: widget.onLoadChildren,
        onCommitMulti: (next) => widget.onChanged(next),
        onSelectSingle: (node) {
          widget.onChanged(node.value);
          Navigator.of(sheetContext).pop();
        },
      ),
    );
    widget.onOpenChanged?.call(false);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final invalid = widget.error != null;
    final selected = _selectedNodes;
    final triggerLabel = selected.isEmpty ? widget.placeholder : selected.map((n) => n.label).join(', ');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.label != null) ...[
          InoLabel(widget.label!, size: dims, required: widget.required, disabled: widget.disabled, invalid: invalid),
          const SizedBox(height: InoSpace.s2),
        ],
        Semantics(
          button: true,
          label: widget.label,
          value: triggerLabel,
          enabled: !_nonInteractive,
          child: GestureDetector(
            onTap: _nonInteractive ? null : () => _open(context),
            child: Opacity(
              opacity: widget.disabled ? 0.5 : 1,
              child: Container(
                constraints: BoxConstraints(minHeight: dims.height),
                padding: EdgeInsets.symmetric(horizontal: dims.paddingInline, vertical: InoSpace.s1),
                decoration: BoxDecoration(
                  color: colors.surfaceSunken,
                  border: Border.all(color: invalid ? colors.danger : colors.border),
                  borderRadius: BorderRadius.circular(InoRadius.md),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        triggerLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: dims.fontSize,
                          color: selected.isEmpty ? colors.onSurfaceSubtle : colors.onSurface,
                        ),
                      ),
                    ),
                    if (widget.loading) ...[
                      SizedBox(
                        width: dims.iconSize,
                        height: dims.iconSize,
                        child: CircularProgressIndicator(strokeWidth: 2, color: colors.onSurfaceMuted),
                      ),
                      SizedBox(width: dims.gap),
                    ],
                    ExcludeSemantics(
                      child: Text('▾', style: TextStyle(fontSize: dims.iconSize - 6, color: colors.onSurfaceMuted)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (widget.error != null) ...[
          const SizedBox(height: InoSpace.s2),
          Semantics(
            liveRegion: true,
            child: Text(widget.error!,
                style: TextStyle(fontSize: 12.5, color: colors.danger, fontWeight: FontWeight.w600)),
          ),
        ] else if (widget.hint != null) ...[
          const SizedBox(height: InoSpace.s2),
          Text(widget.hint!, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
        ],
      ],
    );
  }
}

class _TreeSheet extends StatefulWidget {
  final String title;
  final List<InoTreeSelectNode> nodes;
  final List<String> initialValues;
  final InoTreeSelectMode selectionMode;
  final InoControlSize size;
  final bool filter;
  final String filterPlaceholder;
  final ValueChanged<String>? onFilterChanged;
  final ValueChanged<InoTreeSelectNode>? onLoadChildren;
  final ValueChanged<List<String>> onCommitMulti;
  final ValueChanged<InoTreeSelectNode> onSelectSingle;

  const _TreeSheet({
    required this.title,
    required this.nodes,
    required this.initialValues,
    required this.selectionMode,
    required this.size,
    required this.filter,
    required this.filterPlaceholder,
    required this.onFilterChanged,
    required this.onLoadChildren,
    required this.onCommitMulti,
    required this.onSelectSingle,
  });

  @override
  State<_TreeSheet> createState() => _TreeSheetState();
}

class _TreeSheetState extends State<_TreeSheet> {
  String _filterText = '';
  late List<String> _values;
  final Set<String> _expanded = {};
  late Map<String, String?> _parentOf;

  @override
  void initState() {
    super.initState();
    _values = List<String>.from(widget.initialValues);
    _parentOf = {};
    _buildParentMap(widget.nodes, null, _parentOf);
  }

  List<_FlatRow> get _rows {
    final query = _filterText.trim().toLowerCase();
    final source = query.isEmpty ? widget.nodes : _buildFilteredNodes(widget.nodes, query);
    final out = <_FlatRow>[];
    _flatten(source, 0, const [], query.isNotEmpty, _expanded, out);
    return out;
  }

  bool _isSelected(InoTreeSelectNode node) => _values.contains(node.value);

  bool _isPartial(InoTreeSelectNode node) {
    if (widget.selectionMode != InoTreeSelectMode.checkbox || _isSelected(node)) return false;
    final children = node.children;
    if (children == null || children.isEmpty) return false;
    return _subtreeValues(node).skip(1).any(_values.contains);
  }

  void _toggleExpand(InoTreeSelectNode node) {
    if (node.disabled || node.loading) return;
    setState(() {
      if (_expanded.contains(node.value)) {
        _expanded.remove(node.value);
      } else {
        _expanded.add(node.value);
        if (node.hasChildren && (node.children?.isEmpty ?? true)) {
          widget.onLoadChildren?.call(node);
        }
      }
    });
  }

  List<String> _recomputeAncestors(List<String> values, InoTreeSelectNode changedNode) {
    var result = values;
    var parentValue = _parentOf[changedNode.value];
    while (parentValue != null) {
      final parent = _findNode(widget.nodes, parentValue);
      if (parent?.children == null || parent!.children!.isEmpty) break;
      final allChecked = parent.children!.every((c) => result.contains(c.value));
      final has = result.contains(parent.value);
      if (allChecked && !has) {
        result = [...result, parent.value];
      } else if (!allChecked && has) {
        result = result.where((v) => v != parent.value).toList();
      }
      parentValue = _parentOf[parent.value];
    }
    return result;
  }

  void _activate(InoTreeSelectNode node) {
    if (node.disabled) return;
    if (widget.selectionMode == InoTreeSelectMode.single) {
      widget.onSelectSingle(node);
      return;
    }
    if (widget.selectionMode == InoTreeSelectMode.multiple) {
      final selected = _values.contains(node.value);
      setState(() {
        _values = selected ? _values.where((v) => v != node.value).toList() : [..._values, node.value];
      });
      widget.onCommitMulti(_values);
      return;
    }
    // checkbox: cascade to loaded descendants, then re-derive ancestors.
    final checking = !_isSelected(node);
    final subtree = _subtreeValues(node);
    final base = checking
        ? {..._values, ...subtree}.toList()
        : _values.where((v) => !subtree.contains(v)).toList();
    setState(() => _values = _recomputeAncestors(base, node));
    widget.onCommitMulti(_values);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final rows = _rows;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(top: InoSpace.s3, bottom: InoSpace.s4),
                  decoration:
                      BoxDecoration(color: colors.borderSoft, borderRadius: BorderRadius.circular(InoRadius.sm)),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: InoSpace.s5),
                child: Text(widget.title,
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: colors.onSurface)),
              ),
              if (widget.filter) ...[
                const SizedBox(height: InoSpace.s3),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: InoSpace.s5),
                  child: TextField(
                    autofocus: true,
                    onChanged: (text) {
                      setState(() => _filterText = text);
                      widget.onFilterChanged?.call(text);
                    },
                    style: TextStyle(fontSize: dims.fontSize, color: colors.onSurface),
                    decoration: InputDecoration(
                      hintText: widget.filterPlaceholder,
                      hintStyle: TextStyle(color: colors.onSurfaceSubtle),
                      filled: true,
                      fillColor: colors.surfaceSunken,
                      constraints: BoxConstraints(minHeight: dims.height),
                      contentPadding: EdgeInsets.symmetric(horizontal: dims.paddingInline),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(InoRadius.md),
                        borderSide: BorderSide(color: colors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(InoRadius.md),
                        borderSide: BorderSide(color: colors.accent),
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: InoSpace.s3),
              if (rows.isEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(InoSpace.s5, 0, InoSpace.s5, InoSpace.s5),
                  child: Text(
                    _filterText.trim().isNotEmpty ? 'No matches.' : 'No options.',
                    style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted),
                  ),
                )
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    padding: const EdgeInsets.only(bottom: InoSpace.s5),
                    itemCount: rows.length,
                    itemBuilder: (context, i) {
                      final row = rows[i];
                      return _TreeRow(
                        node: row.node,
                        level: row.level,
                        hasVisibleChildren: row.hasVisibleChildren,
                        expanded: _expanded.contains(row.node.value) || _filterText.trim().isNotEmpty,
                        selected: _isSelected(row.node),
                        partial: _isPartial(row.node),
                        selectionMode: widget.selectionMode,
                        size: dims,
                        colors: colors,
                        onTap: () => _activate(row.node),
                        onToggleExpand: () => _toggleExpand(row.node),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TreeRow extends StatefulWidget {
  final InoTreeSelectNode node;
  final int level;
  final bool hasVisibleChildren;
  final bool expanded;
  final bool selected;
  final bool partial;
  final InoTreeSelectMode selectionMode;
  final InoControlSize size;
  final InoPalette colors;
  final VoidCallback onTap;
  final VoidCallback onToggleExpand;

  const _TreeRow({
    required this.node,
    required this.level,
    required this.hasVisibleChildren,
    required this.expanded,
    required this.selected,
    required this.partial,
    required this.selectionMode,
    required this.size,
    required this.colors,
    required this.onTap,
    required this.onToggleExpand,
  });

  @override
  State<_TreeRow> createState() => _TreeRowState();
}

class _TreeRowState extends State<_TreeRow> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final colors = widget.colors;
    final disabled = widget.node.disabled;
    final selected = widget.selected;
    final checkGlyph = widget.partial ? '⊟' : (selected ? '☑' : '☐');

    return Semantics(
      button: true,
      selected: widget.selectionMode != InoTreeSelectMode.checkbox ? selected : null,
      checked: widget.selectionMode == InoTreeSelectMode.checkbox ? selected : null,
      enabled: !disabled,
      label: widget.node.label,
      child: GestureDetector(
        onTapDown: disabled ? null : (_) => setState(() => _pressed = true),
        onTapUp: disabled ? null : (_) => setState(() => _pressed = false),
        onTapCancel: disabled ? null : () => setState(() => _pressed = false),
        onTap: disabled ? null : widget.onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: InoTarget.comfortable),
          padding: EdgeInsets.fromLTRB(
            InoSpace.s5 + widget.level * 20,
            widget.size.gap,
            InoSpace.s5,
            widget.size.gap,
          ),
          color: (_pressed && !disabled) ? colors.surfaceSunken : null,
          child: Row(
            children: [
              SizedBox(
                width: 24,
                height: 24,
                child: !widget.hasVisibleChildren
                    ? null
                    : widget.node.loading
                        ? Center(
                            child: SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(strokeWidth: 2, color: colors.onSurfaceMuted),
                            ),
                          )
                        : GestureDetector(
                            onTap: widget.onToggleExpand,
                            child: ExcludeSemantics(
                              child: Center(
                                child: Text(widget.expanded ? '▾' : '▸',
                                    style: TextStyle(fontSize: 11, color: colors.onSurfaceMuted)),
                              ),
                            ),
                          ),
              ),
              if (widget.selectionMode == InoTreeSelectMode.checkbox) ...[
                Text(
                  checkGlyph,
                  style: TextStyle(
                    fontSize: widget.size.fontSize,
                    color: disabled ? colors.onSurfaceSubtle : colors.onSurfaceMuted,
                  ),
                ),
                const SizedBox(width: InoSpace.s3),
              ],
              Expanded(
                child: Text(
                  widget.node.label,
                  style: TextStyle(
                    fontSize: widget.size.fontSize,
                    color: disabled
                        ? colors.onSurfaceSubtle
                        : selected
                            ? colors.accentTextSafe
                            : colors.onSurface,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
