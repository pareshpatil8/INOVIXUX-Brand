import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_label.dart';

/// One option row. Flat only — the web component's `group` field is deliberately not ported
/// (see `web/src/app/components/listbox/SPEC.md` §8, same call as `InoMultiSelectOption`'s).
class InoListboxOption {
  final String label;
  final String value;
  final bool disabled;

  const InoListboxOption({required this.label, required this.value, this.disabled = false});
}

/// `InoListbox` — Flutter port of `<ino-listbox>`
/// (`web/src/app/components/listbox`, INO-414 / INO-31 Phase B1).
///
/// Doc 26 §5 calls for "mobile = full-screen sheet reuse of multiselect": an always-visible
/// inline list is a web-only layout choice (no phone screen has room to dedicate to a permanently
/// expanded list alongside the rest of a form), so this port is structurally [InoMultiSelect]'s
/// trigger-plus-`showModalBottomSheet`, not [InoSelect]'s shorter, content-sized sheet.
/// Single-selection mode closes the sheet immediately on row tap (matching [InoSelect]'s
/// close-on-select); multiple mode keeps the sheet open across taps and requires an explicit
/// dismiss (matching [InoMultiSelect]). See `web/src/app/components/listbox/SPEC.md` §8.
///
/// Deliberately **not** ported — option groups and virtual scrolling, same omissions
/// [InoMultiSelect]'s own port documents, for the same reasons (no shared build graph; mobile
/// option lists in this product are short enough that `ListView.builder`'s own windowing is
/// sufficient).
///
/// **Overlay idiom / Semantics substitution** — identical to [InoMultiSelect]'s: a scrimmed
/// bottom sheet (`overlayScrim`/`borderSoft`), and Flutter's [Semantics] has no listbox/option/
/// multiselectable equivalent, so each row is a button carrying `selected`.
class InoListbox extends StatefulWidget {
  final String? label;
  final List<InoListboxOption> options;

  /// `multiple: false` (default) — [value] is a single `String?` (`null`/`''` = no selection).
  /// `multiple: true` — [value] must be a `List<String>` via [InoListbox.multiple].
  final dynamic value;
  final ValueChanged<dynamic> onChanged;
  final bool multiple;

  final String placeholder;
  final String? hint;
  final String? error;
  final InoControlSize size;
  final bool required;
  final bool disabled;
  final bool loading;

  /// Always-visible-on-web filter moves inside the sheet here (there is no inline list to filter
  /// above) — same contract as the web component's `filter` input. Defaults to `true`, matching
  /// web's default (doc 26 §5 lists the filter box as baseline structure, not opt-in).
  final bool filter;
  final String filterPlaceholder;

  final String? sheetTitle;
  final ValueChanged<String>? onFilterChanged;
  final ValueChanged<bool>? onOpenChanged;

  const InoListbox({
    super.key,
    this.label,
    required this.options,
    required this.value,
    required this.onChanged,
    this.multiple = false,
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
  });

  @override
  State<InoListbox> createState() => _InoListboxState();
}

class _InoListboxState extends State<InoListbox> {
  bool get _nonInteractive => widget.disabled || widget.loading;

  List<String> get _valuesArray {
    if (widget.multiple) {
      return List<String>.from(widget.value as List<dynamic>? ?? const []);
    }
    final v = widget.value as String?;
    return (v == null || v.isEmpty) ? const [] : [v];
  }

  List<InoListboxOption> get _selectedOptions =>
      widget.options.where((o) => _valuesArray.contains(o.value)).toList();

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
      builder: (sheetContext) => _OptionSheet(
        title: widget.sheetTitle ?? widget.label ?? widget.placeholder,
        options: widget.options,
        initialValues: _valuesArray,
        multiple: widget.multiple,
        size: widget.size,
        filter: widget.filter,
        filterPlaceholder: widget.filterPlaceholder,
        onFilterChanged: widget.onFilterChanged,
        // Multi-select: fires on every toggle, sheet stays open (the sheet keeps its own local
        // selection copy so its checkboxes update immediately — see `_OptionSheetState`).
        onToggleMultiple: (nextValues) => widget.onChanged(nextValues),
        // Single-select: fires once, closes the sheet immediately — matches InoSelect.
        onSelectSingle: (option) {
          widget.onChanged(option.value);
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
    final selected = _selectedOptions;
    final triggerLabel = selected.isEmpty ? widget.placeholder : selected.map((o) => o.label).join(', ');

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

class _OptionSheet extends StatefulWidget {
  final String title;
  final List<InoListboxOption> options;
  final List<String> initialValues;
  final bool multiple;
  final InoControlSize size;
  final bool filter;
  final String filterPlaceholder;
  final ValueChanged<String>? onFilterChanged;
  final ValueChanged<List<String>> onToggleMultiple;
  final ValueChanged<InoListboxOption> onSelectSingle;

  const _OptionSheet({
    required this.title,
    required this.options,
    required this.initialValues,
    required this.multiple,
    required this.size,
    required this.filter,
    required this.filterPlaceholder,
    required this.onFilterChanged,
    required this.onToggleMultiple,
    required this.onSelectSingle,
  });

  @override
  State<_OptionSheet> createState() => _OptionSheetState();
}

class _OptionSheetState extends State<_OptionSheet> {
  String _filterText = '';
  // A local copy, not a read of the parent's live selection: the sheet is a separate overlay
  // route whose content is built once by `showModalBottomSheet`'s `builder`, so it needs its own
  // mutable copy to reflect taps immediately — the parent's `setState` (from `widget.onChanged`)
  // rebuilds the trigger, not this already-presented route.
  late List<String> _values;

  @override
  void initState() {
    super.initState();
    _values = List<String>.from(widget.initialValues);
  }

  /// Same predicate as the web component's `recomputeFiltered()` — trimmed, lower-cased substring
  /// match on the label. Flat list only: [InoListboxOption] has no `group` field.
  List<InoListboxOption> get _filtered {
    final query = _filterText.trim().toLowerCase();
    if (query.isEmpty) return widget.options;
    return widget.options.where((o) => o.label.toLowerCase().contains(query)).toList();
  }

  void _activate(InoListboxOption option) {
    if (option.disabled) return;
    if (widget.multiple) {
      final selected = _values.contains(option.value);
      setState(() {
        _values = selected ? _values.where((v) => v != option.value).toList() : [..._values, option.value];
      });
      widget.onToggleMultiple(_values);
      return; // Stays open — matches InoMultiSelect's "stays open across selections" contract.
    }
    widget.onSelectSingle(option);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final filtered = _filtered;

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
                      BoxDecoration(color: colors.borderSoft, borderRadius: BorderRadius.circular(2)),
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
              if (filtered.isEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(InoSpace.s5, 0, InoSpace.s5, InoSpace.s5),
                  child: Text(
                    _filterText.trim().isNotEmpty ? 'No options match your filter.' : 'No options.',
                    style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted),
                  ),
                )
              else
                // ListView.builder, not the web component's `<ino-virtual-scroller>` — same
                // rationale virtual-scroller's own SPEC.md §1 gives for staying web-only.
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    padding: const EdgeInsets.only(bottom: InoSpace.s5),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) => _OptionRow(
                      option: filtered[i],
                      selected: _values.contains(filtered[i].value),
                      multiple: widget.multiple,
                      size: dims,
                      colors: colors,
                      onTap: () => _activate(filtered[i]),
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

class _OptionRow extends StatefulWidget {
  final InoListboxOption option;
  final bool selected;
  final bool multiple;
  final InoControlSize size;
  final InoPalette colors;
  final VoidCallback onTap;

  const _OptionRow({
    required this.option,
    required this.selected,
    required this.multiple,
    required this.size,
    required this.colors,
    required this.onTap,
  });

  @override
  State<_OptionRow> createState() => _OptionRowState();
}

class _OptionRowState extends State<_OptionRow> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final colors = widget.colors;
    final disabled = widget.option.disabled;
    final selected = widget.selected;

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
              if (widget.multiple) ...[
                Text(
                  selected ? '☑' : '☐',
                  style: TextStyle(
                    fontSize: widget.size.fontSize,
                    color: disabled ? colors.onSurfaceSubtle : colors.onSurfaceMuted,
                  ),
                ),
                const SizedBox(width: InoSpace.s3),
              ],
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
            ],
          ),
        ),
      ),
    );
  }
}
