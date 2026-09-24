import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_label.dart';

/// One option row. Flat only — the web component's `group` field is deliberately not ported
/// (see `web/src/app/components/multiselect/SPEC.md` §9, same call as `InoSelectOption`'s).
class InoMultiSelectOption {
  final String label;
  final String value;
  final bool disabled;

  const InoMultiSelectOption({required this.label, required this.value, this.disabled = false});
}

/// `InoMultiSelect` — Flutter port of `<ino-multiselect>`
/// (`web/src/app/components/multiselect`, INO-153 / INO-31 T-10).
///
/// Mirrors [InoSelect]'s (INO-152/INO-258) porting scope and idiom exactly — the same
/// `showModalBottomSheet` pattern, the same `context.inoColors` theming idiom — with the
/// multi-selection surfaces web's SPEC.md §1 calls out: [value]/[onChanged] are `List<String>`,
/// rows are checkable and the sheet stays open across taps, the trigger shows a chip row or a
/// comma summary, an optional "select all visible" row, and a hard [selectionLimit]. Deliberately
/// **not** ported — option groups, virtual scrolling, and (not applicable to this component in the
/// first place) the editable free-text trigger. See
/// `web/src/app/components/multiselect/SPEC.md` §9 for each omission's reasoning.
///
/// **Overlay idiom / Semantics substitution** — identical to [InoSelect]'s: a scrimmed bottom
/// sheet ([showModalBottomSheet], `overlayScrim`/`borderSoft`), and Flutter's [Semantics] has no
/// listbox/option/multiselectable equivalent, so each row is a button carrying `selected` — same
/// substitution [InoSelect] makes for its own rows.
class InoMultiSelect extends StatefulWidget {
  final String? label;
  final List<InoMultiSelectOption> options;

  /// `[]` = no selection, matching the web component's `@Input() value: string[]` contract.
  final List<String> value;
  final ValueChanged<List<String>> onChanged;
  final String placeholder;
  final String? hint;
  final String? error;
  final InoControlSize size;
  final bool required;
  final bool disabled;
  final bool loading;
  final bool clearable;

  /// Adds a search box at the top of the sheet that narrows the visible options without touching
  /// [value] — same contract as the web component's `filter` input.
  final bool filter;
  final String filterPlaceholder;

  /// `chip` (default) renders a wrapping row of dismissible chips on the trigger; `comma` renders
  /// one truncated `"A, B, C"` text summary — same contract as web's `display` input.
  final InoMultiSelectDisplay display;

  /// Chip mode only — chips beyond this count collapse into a `"+K more"` indicator.
  final int maxSelectedLabels;

  /// Renders a "select all visible" row at the top of the sheet.
  final bool selectAll;

  /// Hard cap on `value.length` — unselected rows become non-interactive once reached.
  final int? selectionLimit;

  /// Sheet heading; defaults to [label], then [placeholder].
  final String? sheetTitle;
  final ValueChanged<String>? onFilterChanged;
  final ValueChanged<bool>? onOpenChanged;
  final VoidCallback? onClear;

  const InoMultiSelect({
    super.key,
    this.label,
    required this.options,
    required this.value,
    required this.onChanged,
    this.placeholder = 'Select options',
    this.hint,
    this.error,
    this.size = InoControlSize.standard,
    this.required = false,
    this.disabled = false,
    this.loading = false,
    this.clearable = false,
    this.filter = false,
    this.filterPlaceholder = 'Search…',
    this.display = InoMultiSelectDisplay.chip,
    this.maxSelectedLabels = 3,
    this.selectAll = false,
    this.selectionLimit,
    this.sheetTitle,
    this.onFilterChanged,
    this.onOpenChanged,
    this.onClear,
  });

  @override
  State<InoMultiSelect> createState() => _InoMultiSelectState();
}

enum InoMultiSelectDisplay { chip, comma }

class _InoMultiSelectState extends State<InoMultiSelect> {
  bool get _nonInteractive => widget.disabled || widget.loading;

  List<InoMultiSelectOption> get _selectedOptions =>
      widget.options.where((o) => widget.value.contains(o.value)).toList();

  bool get _atLimit => widget.selectionLimit != null && widget.value.length >= widget.selectionLimit!;

  void _toggleOption(InoMultiSelectOption option) {
    if (option.disabled) return;
    final selected = widget.value.contains(option.value);
    if (!selected && _atLimit) return;
    final next = selected
        ? widget.value.where((v) => v != option.value).toList()
        : [...widget.value, option.value];
    widget.onChanged(next);
  }

  void _clearAll() {
    widget.onChanged(const []);
    widget.onClear?.call();
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
      builder: (sheetContext) => _OptionSheet(
        title: widget.sheetTitle ?? widget.label ?? widget.placeholder,
        options: widget.options,
        value: widget.value,
        size: widget.size,
        filter: widget.filter,
        filterPlaceholder: widget.filterPlaceholder,
        selectAll: widget.selectAll,
        selectionLimit: widget.selectionLimit,
        onFilterChanged: widget.onFilterChanged,
        onToggleOption: (option) => setState(() => _toggleOption(option)),
        onToggleSelectAll: (values) => setState(() {
          final allSelected = values.isNotEmpty && values.every((v) => widget.value.contains(v));
          if (allSelected) {
            widget.onChanged(widget.value.where((v) => !values.contains(v)).toList());
          } else {
            final toAdd = values.where((v) => !widget.value.contains(v)).toList();
            final remaining = widget.selectionLimit != null
                ? (widget.selectionLimit! - widget.value.length).clamp(0, toAdd.length)
                : toAdd.length;
            widget.onChanged([...widget.value, ...toAdd.take(remaining)]);
          }
        }),
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
    final showClear = widget.clearable && widget.value.isNotEmpty && !_nonInteractive;
    final overflowCount = (selected.length - widget.maxSelectedLabels).clamp(0, selected.length);
    final visibleChips = selected.take(widget.maxSelectedLabels).toList();

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
          value: selected.isEmpty ? widget.placeholder : selected.map((o) => o.label).join(', '),
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
                      child: selected.isEmpty
                          ? Text(
                              widget.placeholder,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: dims.fontSize, color: colors.onSurfaceSubtle),
                            )
                          : widget.display == InoMultiSelectDisplay.comma
                              ? Text(
                                  selected.map((o) => o.label).join(', '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: dims.fontSize, color: colors.onSurface),
                                )
                              : Wrap(
                                  spacing: InoSpace.s1,
                                  runSpacing: InoSpace.s1,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    for (final chip in visibleChips)
                                      _Chip(
                                        label: chip.label,
                                        colors: colors,
                                        onRemove: widget.disabled ? null : () => setState(() => _toggleOption(chip)),
                                      ),
                                    if (overflowCount > 0)
                                      Text('+$overflowCount more',
                                          style: TextStyle(fontSize: dims.fontSize - 2, color: colors.onSurfaceMuted)),
                                  ],
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
                    if (showClear) ...[
                      Semantics(
                        button: true,
                        label: 'Clear all selections',
                        child: GestureDetector(
                          onTap: () => setState(_clearAll),
                          child: Text('×', style: TextStyle(fontSize: dims.iconSize, color: colors.onSurfaceMuted)),
                        ),
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

class _Chip extends StatelessWidget {
  final String label;
  final InoPalette colors;
  final VoidCallback? onRemove;

  const _Chip({required this.label, required this.colors, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: InoSpace.s2, vertical: InoSpace.s1),
      decoration: BoxDecoration(
        color: colors.surfaceRaised,
        border: Border.all(color: colors.border),
        borderRadius: BorderRadius.circular(InoRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: TextStyle(fontSize: 12.5, color: colors.onSurface)),
          if (onRemove != null) ...[
            const SizedBox(width: InoSpace.s1),
            Semantics(
              button: true,
              label: 'Remove $label',
              child: GestureDetector(
                onTap: onRemove,
                child: Text('×', style: TextStyle(fontSize: 14, color: colors.onSurfaceMuted)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _OptionSheet extends StatefulWidget {
  final String title;
  final List<InoMultiSelectOption> options;
  final List<String> value;
  final InoControlSize size;
  final bool filter;
  final String filterPlaceholder;
  final bool selectAll;
  final int? selectionLimit;
  final ValueChanged<String>? onFilterChanged;
  final ValueChanged<InoMultiSelectOption> onToggleOption;
  final ValueChanged<List<String>> onToggleSelectAll;

  const _OptionSheet({
    required this.title,
    required this.options,
    required this.value,
    required this.size,
    required this.filter,
    required this.filterPlaceholder,
    required this.selectAll,
    required this.selectionLimit,
    required this.onFilterChanged,
    required this.onToggleOption,
    required this.onToggleSelectAll,
  });

  @override
  State<_OptionSheet> createState() => _OptionSheetState();
}

class _OptionSheetState extends State<_OptionSheet> {
  String _filterText = '';

  /// Same predicate as the web component's `recomputeFiltered()` — trimmed, lower-cased substring
  /// match on the label. Flat list only: [InoMultiSelectOption] has no `group` field.
  List<InoMultiSelectOption> get _filtered {
    final query = _filterText.trim().toLowerCase();
    if (query.isEmpty) return widget.options;
    return widget.options.where((o) => o.label.toLowerCase().contains(query)).toList();
  }

  bool get _atLimit => widget.selectionLimit != null && widget.value.length >= widget.selectionLimit!;

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final filtered = _filtered;
    final visibleEnabled = filtered.where((o) => !o.disabled).map((o) => o.value).toList();
    final selectAllChecked = visibleEnabled.isNotEmpty && visibleEnabled.every((v) => widget.value.contains(v));
    final selectAllIndeterminate =
        !selectAllChecked && visibleEnabled.any((v) => widget.value.contains(v));

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
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
              if (widget.selectAll && filtered.isNotEmpty)
                Semantics(
                  button: true,
                  label: 'Select all',
                  child: GestureDetector(
                    onTap: () => widget.onToggleSelectAll(visibleEnabled),
                    child: Container(
                      constraints: const BoxConstraints(minHeight: InoTarget.comfortable),
                      padding: const EdgeInsets.symmetric(horizontal: InoSpace.s5),
                      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.border))),
                      child: Row(
                        children: [
                          Text(
                            selectAllChecked ? '☑' : (selectAllIndeterminate ? '◪' : '☐'),
                            style: TextStyle(fontSize: dims.fontSize, color: colors.onSurfaceMuted),
                          ),
                          const SizedBox(width: InoSpace.s3),
                          Text('Select all',
                              style: TextStyle(
                                  fontSize: dims.fontSize, fontWeight: FontWeight.w600, color: colors.onSurface)),
                        ],
                      ),
                    ),
                  ),
                ),
              if (filtered.isEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(InoSpace.s5, 0, InoSpace.s5, InoSpace.s5),
                  child: Text('No options found.',
                      style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
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
                      selected: widget.value.contains(filtered[i].value),
                      atLimit: _atLimit,
                      size: dims,
                      colors: colors,
                      onTap: () => widget.onToggleOption(filtered[i]),
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
  final InoMultiSelectOption option;
  final bool selected;
  final bool atLimit;
  final InoControlSize size;
  final InoPalette colors;
  final VoidCallback onTap;

  const _OptionRow({
    required this.option,
    required this.selected,
    required this.atLimit,
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
    // Non-interactive when the option itself is disabled, or the panel is at `selectionLimit` and
    // this row is not already selected — removal always stays available (SPEC.md §4).
    final disabled = widget.option.disabled || (widget.atLimit && !widget.selected);
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
              Text(
                selected ? '☑' : '☐',
                style: TextStyle(
                  fontSize: widget.size.fontSize,
                  color: disabled ? colors.onSurfaceSubtle : colors.onSurfaceMuted,
                ),
              ),
              const SizedBox(width: InoSpace.s3),
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
