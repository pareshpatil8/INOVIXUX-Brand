import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_label.dart';

/// One option in the tree. A non-empty [children] makes this a drill target, never a selectable
/// value — see `SPEC.md` §2 of the web component this ports.
class InoCascadeSelectOption {
  final String label;
  final String value;
  final bool disabled;
  final List<InoCascadeSelectOption>? children;

  const InoCascadeSelectOption({
    required this.label,
    required this.value,
    this.disabled = false,
    this.children,
  });

  bool get hasChildren => children != null && children!.isNotEmpty;
}

/// `InoCascadeSelect` — Flutter port of `<ino-cascade-select>`
/// (`web/src/app/components/cascade-select`, INO-422 / INO-31 Phase B1).
///
/// **Overlay idiom — stacked sheet pages, not an anchored popover.** Doc 26 §5's mobile
/// disposition for this row is literally "stacked sheet pages": each drill-in replaces the sheet's
/// visible content with the next level and pushes a back chevron + breadcrumb header, which is the
/// same `path` + "what level is showing" state machine the web popup uses (see the web
/// component's SPEC.md §1) — just rendered as one sheet whose content swaps, rather than a web
/// anchored panel. There is no actual `Navigator` route stack; "stacked" describes the UX (back
/// steps up exactly one level at a time), not the implementation.
///
/// **Semantics.** Same substitution [InoSelect]'s own port documents: no combobox/listbox/option
/// equivalent in Flutter [Semantics], so the trigger is a button carrying `expanded` and each row a
/// button carrying `selected`; hover/`:focus-visible` are dropped (no touch equivalent).
///
/// **Not ported**: custom option templates and virtual scrolling — same omissions [InoSelect]'s
/// port documents, for the same reason (cascading option trees in this product are shallow enough
/// per level that `ListView.builder` is sufficient).
class InoCascadeSelect extends StatelessWidget {
  final String? label;
  final List<InoCascadeSelectOption> options;

  /// Selected leaf's value. `''` = no selection.
  final String value;
  final ValueChanged<String> onChanged;
  final String placeholder;
  final String? hint;
  final String? error;
  final InoControlSize size;
  final bool required;
  final bool disabled;
  final bool loading;

  /// Sheet heading at the root level; defaults to [label], then [placeholder].
  final String? sheetTitle;
  final ValueChanged<bool>? onOpenChanged;

  const InoCascadeSelect({
    super.key,
    this.label,
    required this.options,
    required this.value,
    required this.onChanged,
    this.placeholder = 'Select an option',
    this.hint,
    this.error,
    this.size = InoControlSize.standard,
    this.required = false,
    this.disabled = false,
    this.loading = false,
    this.sheetTitle,
    this.onOpenChanged,
  });

  bool get _nonInteractive => disabled || loading;

  /// DFS for the root-to-leaf path of options ending in [value]. `null` when nothing matches,
  /// including when [value] only matches a non-leaf option — parents are never valid values.
  static List<InoCascadeSelectOption>? _findPath(
      List<InoCascadeSelectOption> level, String value) {
    for (final option in level) {
      if (!option.hasChildren) {
        if (option.value == value) return [option];
        continue;
      }
      final childPath = _findPath(option.children!, value);
      if (childPath != null) return [option, ...childPath];
    }
    return null;
  }

  List<InoCascadeSelectOption>? get _selectedPath =>
      value.isEmpty ? null : _findPath(options, value);

  String get _selectedLabel =>
      _selectedPath?.map((o) => o.label).join(' / ') ?? '';

  Future<void> _open(BuildContext context) async {
    if (_nonInteractive) return;
    final colors = context.inoColors;
    onOpenChanged?.call(true);
    final picked = await showModalBottomSheet<String>(
      context: context,
      barrierColor: colors.overlayScrim,
      backgroundColor: colors.surfaceRaised,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(InoRadius.xl)),
      ),
      builder: (sheetContext) => _CascadePageSheet(
        rootTitle: sheetTitle ?? label ?? placeholder,
        rootOptions: options,
        value: value,
        size: size,
      ),
    );
    onOpenChanged?.call(false);
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = size;
    final invalid = error != null;
    final selectedLabel = _selectedLabel;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (label != null) ...[
          InoLabel(label!, size: size, required: required, disabled: disabled, invalid: invalid),
          const SizedBox(height: InoSpace.s2),
        ],
        Semantics(
          button: true,
          label: label,
          value: selectedLabel.isEmpty ? placeholder : selectedLabel,
          enabled: !_nonInteractive,
          child: GestureDetector(
            onTap: _nonInteractive ? null : () => _open(context),
            child: Opacity(
              opacity: disabled ? 0.5 : 1,
              child: Container(
                constraints: BoxConstraints(minHeight: dims.height),
                padding: EdgeInsets.symmetric(horizontal: dims.paddingInline),
                decoration: BoxDecoration(
                  color: colors.surfaceSunken,
                  border: Border.all(color: invalid ? colors.danger : colors.border),
                  borderRadius: BorderRadius.circular(InoRadius.md),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        selectedLabel.isEmpty ? placeholder : selectedLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: dims.fontSize,
                          color: selectedLabel.isEmpty ? colors.onSurfaceSubtle : colors.onSurface,
                        ),
                      ),
                    ),
                    if (loading) ...[
                      SizedBox(
                        width: dims.iconSize,
                        height: dims.iconSize,
                        child: CircularProgressIndicator(strokeWidth: 2, color: colors.onSurfaceMuted),
                      ),
                      SizedBox(width: dims.gap),
                    ],
                    ExcludeSemantics(
                      child: Text('▾',
                          style: TextStyle(fontSize: dims.iconSize - 6, color: colors.onSurfaceMuted)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (error != null) ...[
          const SizedBox(height: InoSpace.s2),
          Semantics(
            liveRegion: true,
            child: Text(error!,
                style: TextStyle(fontSize: 12.5, color: colors.danger, fontWeight: FontWeight.w600)),
          ),
        ] else if (hint != null) ...[
          const SizedBox(height: InoSpace.s2),
          Text(hint!, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
        ],
      ],
    );
  }
}

/// The sheet's own "page" state — a breadcrumb [path] of ancestors chosen so far, plus whatever
/// level that leaves on screen. See the class doc comment on [InoCascadeSelect] for why this is
/// one swapped sheet, not a real pushed-route stack.
class _CascadePageSheet extends StatefulWidget {
  final String rootTitle;
  final List<InoCascadeSelectOption> rootOptions;
  final String value;
  final InoControlSize size;

  const _CascadePageSheet({
    required this.rootTitle,
    required this.rootOptions,
    required this.value,
    required this.size,
  });

  @override
  State<_CascadePageSheet> createState() => _CascadePageSheetState();
}

class _CascadePageSheetState extends State<_CascadePageSheet> {
  List<InoCascadeSelectOption> _path = [];

  List<InoCascadeSelectOption> get _currentOptions =>
      _path.isEmpty ? widget.rootOptions : (_path.last.children ?? const []);

  String get _pageTitle =>
      _path.isEmpty ? widget.rootTitle : _path.map((o) => o.label).join(' / ');

  void _drillInto(InoCascadeSelectOption option) {
    if (option.disabled) return;
    if (option.hasChildren) {
      setState(() => _path = [..._path, option]);
    } else {
      Navigator.of(context).pop(option.value);
    }
  }

  void _goBack() {
    if (_path.isEmpty) return;
    setState(() => _path = _path.sublist(0, _path.length - 1));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final options = _currentOptions;

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
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
              child: Row(
                children: [
                  if (_path.isNotEmpty)
                    Semantics(
                      button: true,
                      label: 'Back',
                      child: GestureDetector(
                        onTap: _goBack,
                        child: Padding(
                          padding: const EdgeInsets.only(right: InoSpace.s3),
                          child: Text('‹', style: TextStyle(fontSize: 16, color: colors.onSurfaceMuted)),
                        ),
                      ),
                    ),
                  Expanded(
                    child: Text(
                      _pageTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: colors.onSurface),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: InoSpace.s3),
            if (options.isEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(InoSpace.s5, 0, InoSpace.s5, InoSpace.s5),
                child: Text('No options found.',
                    style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
              )
            else
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  padding: const EdgeInsets.only(bottom: InoSpace.s5),
                  itemCount: options.length,
                  itemBuilder: (context, i) => _CascadeOptionRow(
                    option: options[i],
                    selected: !options[i].hasChildren && options[i].value == widget.value,
                    size: dims,
                    colors: colors,
                    onTap: () => _drillInto(options[i]),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CascadeOptionRow extends StatefulWidget {
  final InoCascadeSelectOption option;
  final bool selected;
  final InoControlSize size;
  final InoPalette colors;
  final VoidCallback onTap;

  const _CascadeOptionRow({
    required this.option,
    required this.selected,
    required this.size,
    required this.colors,
    required this.onTap,
  });

  @override
  State<_CascadeOptionRow> createState() => _CascadeOptionRowState();
}

class _CascadeOptionRowState extends State<_CascadeOptionRow> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final colors = widget.colors;
    final disabled = widget.option.disabled;
    final selected = widget.selected;
    final hasChildren = widget.option.hasChildren;

    return Semantics(
      button: true,
      selected: selected,
      enabled: !disabled,
      label: widget.option.label,
      child: GestureDetector(
        onTapDown: disabled ? null : (_) => setState(() => _pressed = true),
        onTapUp: disabled ? null : (_) => setState(() => _pressed = false),
        onTapCancel: disabled ? null : () => setState(() => _pressed = false),
        onTap: disabled ? null : widget.onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: InoTarget.comfortable),
          padding: EdgeInsets.symmetric(horizontal: InoSpace.s5, vertical: widget.size.gap),
          color: (_pressed && !disabled) ? colors.surfaceSunken : null,
          child: Row(
            children: [
              Expanded(
                child: Text(
                  widget.option.label,
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
              if (selected)
                ExcludeSemantics(
                  child: Text('✓',
                      style: TextStyle(fontSize: widget.size.fontSize, color: colors.accentTextSafe)),
                ),
              if (hasChildren)
                ExcludeSemantics(
                  child: Text('›',
                      style: TextStyle(fontSize: widget.size.fontSize, color: colors.onSurfaceMuted)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
