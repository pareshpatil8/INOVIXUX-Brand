import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_label.dart';

/// One suggestion row. Flat only — the web component's `group` field is deliberately not ported
/// (see `web/src/app/components/autocomplete/SPEC.md` §10b, same call as `InoSelectOption`'s).
class InoAutocompleteOption {
  final String label;
  final String value;
  final bool disabled;

  const InoAutocompleteOption({required this.label, required this.value, this.disabled = false});
}

/// `InoAutocomplete` — Flutter port of `<ino-autocomplete>`
/// (`web/src/app/components/autocomplete`, INO-400 / INO-31 Phase B1).
///
/// Shipped in this issue, not deferred (unlike [InoSelect]'s INO-258 split) — see
/// `web/src/app/components/autocomplete/SPEC.md` §10. Mirrors [InoSelect]'s/[InoMultiSelect]'s
/// `showModalBottomSheet` idiom and `context.inoColors` theming exactly, extended with a
/// debounced [onSearch] callback (the async-datasource hook, same 250ms window web's `search`
/// output uses), [forceSelection] (single mode only, per SPEC.md §5), and [maxSelected] (multiple
/// mode, same dim-not-lock rule as [InoMultiSelect]'s `selectionLimit`). Deliberately **not**
/// ported — option groups, virtual scrolling (both [InoSelect]'s/[InoMultiSelect]'s own reasons,
/// unchanged), and web's `mode="inline"` — see SPEC.md §10b for why the sheet idiom already is
/// this port's answer to the problem `inline` solves differently on web.
///
/// **Overlay idiom / Semantics substitution** — identical to [InoSelect]'s: a scrimmed bottom
/// sheet ([showModalBottomSheet], `overlayScrim`/`borderSoft`), and Flutter's [Semantics] has no
/// combobox/listbox/option/activedescendant equivalent, so the trigger carries `expanded`/`busy`
/// and each row is a button carrying `selected` — the same substitution [InoSelect] and
/// [InoMultiSelect] already make.
///
/// **Value shape.** Dart has no `string | string[]` union type; [value]/[onChanged] are typed
/// `Object`/`ValueChanged<Object>` and normalized at runtime by [multiple] — a `String` when
/// `multiple` is `false` (default), a `List<String>` when `true`. This mirrors the same
/// single-component-with-a-flag call web's SPEC.md §2 makes (rather than splitting into two
/// widgets the way [InoSelect]/[InoMultiSelect] are split), for the identical reason: both modes
/// share the same trigger shape here (a text field, optionally preceded by a chip row), unlike
/// select/multi-select's two structurally different triggers.
class InoAutocomplete extends StatefulWidget {
  final String? label;
  final List<InoAutocompleteOption> options;

  /// `String` (single, default) or `List<String>` (`multiple: true`). See the class doc's "Value
  /// shape" note.
  final Object value;
  final ValueChanged<Object> onChanged;
  final String placeholder;
  final String? hint;
  final String? error;
  final InoControlSize size;
  final bool required;
  final bool disabled;

  /// Suppresses row selection only — typing/searching stays live. Same contract as web's
  /// `loading` input (SPEC.md §7).
  final bool loading;
  final bool clearable;
  final bool multiple;

  /// Single mode only. `true` clears the query/value on sheet dismiss when the typed text matches
  /// no option; `false` (default) accepts it verbatim. See SPEC.md §5.
  final bool forceSelection;

  /// Multiple mode only. Hard cap on the selected-values length — unselected rows dim once
  /// reached, existing chips stay removable. `null` (default) = no limit.
  final int? maxSelected;

  /// Sheet heading; defaults to [label], then [placeholder].
  final String? sheetTitle;

  /// Debounced (250ms, matching web's `SEARCH_DEBOUNCE_MS`) — the async-datasource hook. Fires on
  /// every query change, not on selection.
  final ValueChanged<String>? onSearch;
  final ValueChanged<bool>? onOpenChanged;
  final VoidCallback? onClear;

  const InoAutocomplete({
    super.key,
    this.label,
    required this.options,
    required this.value,
    required this.onChanged,
    this.placeholder = 'Type to search…',
    this.hint,
    this.error,
    this.size = InoControlSize.standard,
    this.required = false,
    this.disabled = false,
    this.loading = false,
    this.clearable = false,
    this.multiple = false,
    this.forceSelection = false,
    this.maxSelected,
    this.sheetTitle,
    this.onSearch,
    this.onOpenChanged,
    this.onClear,
  });

  @override
  State<InoAutocomplete> createState() => _InoAutocompleteState();
}

const _searchDebounce = Duration(milliseconds: 250);

class _InoAutocompleteState extends State<InoAutocomplete> {
  Timer? _searchTimer;
  String _queryText = '';

  @override
  void dispose() {
    _searchTimer?.cancel();
    super.dispose();
  }

  List<String> get _valuesArray {
    final v = widget.value;
    if (v is List<String>) return v;
    if (v is String && v.isNotEmpty) return [v];
    return const [];
  }

  InoAutocompleteOption? get _selectedOption {
    if (widget.multiple) return null;
    for (final option in widget.options) {
      if (option.value == widget.value) return option;
    }
    return null;
  }

  List<InoAutocompleteOption> get _selectedOptions =>
      widget.options.where((o) => _valuesArray.contains(o.value)).toList();

  bool get _atMax =>
      widget.multiple && widget.maxSelected != null && _valuesArray.length >= widget.maxSelected!;

  void _onQueryChange(String text) {
    _queryText = text;
    _searchTimer?.cancel();
    _searchTimer = Timer(_searchDebounce, () => widget.onSearch?.call(text));
  }

  void _selectSingle(InoAutocompleteOption option) {
    if (option.disabled || widget.loading) return;
    widget.onChanged(option.value);
  }

  void _toggleMulti(InoAutocompleteOption option, ValueChanged<List<String>> setter) {
    if (option.disabled || widget.loading) return;
    final selected = _valuesArray.contains(option.value);
    if (!selected && _atMax) return;
    final next = selected
        ? _valuesArray.where((v) => v != option.value).toList()
        : [..._valuesArray, option.value];
    setter(next);
  }

  void _clear() {
    widget.onChanged(widget.multiple ? const <String>[] : '');
    widget.onClear?.call();
  }

  Future<void> _open(BuildContext context) async {
    if (widget.disabled) return;
    _queryText = widget.multiple ? '' : (_selectedOption?.label ?? (widget.value is String ? widget.value as String : ''));
    final colors = context.inoColors;
    widget.onOpenChanged?.call(true);
    final result = await showModalBottomSheet<Object>(
      context: context,
      barrierColor: colors.overlayScrim,
      backgroundColor: colors.surfaceRaised,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(InoRadius.xl)),
      ),
      builder: (sheetContext) => _SuggestionSheet(
        title: widget.sheetTitle ?? widget.label ?? widget.placeholder,
        options: widget.options,
        multiple: widget.multiple,
        loading: widget.loading,
        placeholder: widget.placeholder,
        initialQuery: _queryText,
        size: widget.size,
        selectedValues: _valuesArray,
        maxSelected: widget.maxSelected,
        onQueryChanged: _onQueryChange,
        onSelectSingle: _selectSingle,
        onToggleMulti: (option, setter) => _toggleMulti(option, setter),
      ),
    );
    widget.onOpenChanged?.call(false);

    if (widget.multiple) {
      if (result is List<String>) widget.onChanged(result);
      return;
    }

    // Single mode: the sheet pops with the committed String on selection, or `null` if dismissed
    // without one — forceSelection's match-or-clear rule (SPEC.md §5) runs here on dismiss.
    if (result is String) {
      widget.onChanged(result);
    } else if (widget.forceSelection) {
      final match = widget.options.where(
        (o) => o.label.toLowerCase() == _queryText.trim().toLowerCase(),
      );
      if (match.isNotEmpty) {
        widget.onChanged(match.first.value);
      } else if (_queryText.trim().isNotEmpty && _queryText.trim() != (_selectedOption?.label ?? '')) {
        widget.onChanged('');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final invalid = widget.error != null;
    final selectedOptions = _selectedOptions;
    final selectedOption = _selectedOption;
    final showClear = widget.clearable &&
        (widget.multiple ? selectedOptions.isNotEmpty : (widget.value as String? ?? '').isNotEmpty) &&
        !widget.disabled &&
        !widget.loading;

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
          value: widget.multiple
              ? (selectedOptions.isEmpty ? widget.placeholder : selectedOptions.map((o) => o.label).join(', '))
              : (selectedOption?.label ?? widget.placeholder),
          enabled: !widget.disabled,
          child: GestureDetector(
            onTap: widget.disabled ? null : () => _open(context),
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
                      child: widget.multiple && selectedOptions.isNotEmpty
                          ? Wrap(
                              spacing: InoSpace.s1,
                              runSpacing: InoSpace.s1,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                for (final chip in selectedOptions)
                                  _Chip(
                                    label: chip.label,
                                    colors: colors,
                                    onRemove: widget.disabled
                                        ? null
                                        : () => _toggleMulti(chip, (next) => widget.onChanged(next)),
                                  ),
                              ],
                            )
                          : Text(
                              selectedOption?.label ?? widget.placeholder,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: dims.fontSize,
                                color: selectedOption != null ? colors.onSurface : colors.onSurfaceSubtle,
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
                    if (showClear) ...[
                      Semantics(
                        button: true,
                        label: 'Clear',
                        child: GestureDetector(
                          onTap: () => setState(_clear),
                          child: Text('×', style: TextStyle(fontSize: dims.iconSize, color: colors.onSurfaceMuted)),
                        ),
                      ),
                      SizedBox(width: dims.gap),
                    ],
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
        ] else if (widget.multiple && _atMax) ...[
          const SizedBox(height: InoSpace.s2),
          Semantics(
            liveRegion: true,
            child: Text('Maximum ${widget.maxSelected} selected.',
                style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
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

/// The bottom-sheet body: search field + live-filtered suggestion list. Pops the sheet with the
/// committed `String` (single) on row tap; for `multiple` it never pops on row tap (same
/// toggle-and-stay-open contract [InoMultiSelect]'s sheet uses) and instead pops the accumulated
/// `List<String>` only when the sheet itself is dismissed.
class _SuggestionSheet extends StatefulWidget {
  final String title;
  final List<InoAutocompleteOption> options;
  final bool multiple;
  final bool loading;
  final String placeholder;
  final String initialQuery;
  final InoControlSize size;
  final List<String> selectedValues;
  final int? maxSelected;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<InoAutocompleteOption> onSelectSingle;
  final void Function(InoAutocompleteOption option, ValueChanged<List<String>> setter) onToggleMulti;

  const _SuggestionSheet({
    required this.title,
    required this.options,
    required this.multiple,
    required this.loading,
    required this.placeholder,
    required this.initialQuery,
    required this.size,
    required this.selectedValues,
    required this.maxSelected,
    required this.onQueryChanged,
    required this.onSelectSingle,
    required this.onToggleMulti,
  });

  @override
  State<_SuggestionSheet> createState() => _SuggestionSheetState();
}

class _SuggestionSheetState extends State<_SuggestionSheet> {
  late String _queryText = widget.initialQuery;
  late List<String> _values = List.of(widget.selectedValues);
  late final TextEditingController _queryController = TextEditingController(text: widget.initialQuery);

  @override
  void dispose() {
    _queryController.dispose();
    super.dispose();
  }

  /// Same predicate as the web component's `recomputeFiltered()` — trimmed, lower-cased substring
  /// match on the label. Flat list only: [InoAutocompleteOption] has no `group` field.
  List<InoAutocompleteOption> get _filtered {
    final query = _queryText.trim().toLowerCase();
    if (query.isEmpty) return widget.options;
    return widget.options.where((o) => o.label.toLowerCase().contains(query)).toList();
  }

  bool get _atMax => widget.multiple && widget.maxSelected != null && _values.length >= widget.maxSelected!;

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final filtered = _filtered;

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (widget.multiple && didPop) {
          Navigator.of(context).pop(_values);
        }
      },
      child: SafeArea(
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
                const SizedBox(height: InoSpace.s3),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: InoSpace.s5),
                  child: TextField(
                    autofocus: true,
                    controller: _queryController,
                    onChanged: (text) {
                      setState(() => _queryText = text);
                      widget.onQueryChanged(text);
                    },
                    style: TextStyle(fontSize: dims.fontSize, color: colors.onSurface),
                    decoration: InputDecoration(
                      hintText: widget.placeholder,
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
                const SizedBox(height: InoSpace.s3),
                if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(InoSpace.s5, 0, InoSpace.s5, InoSpace.s5),
                    child: Text(
                      widget.loading
                          ? 'Searching…'
                          : (_queryText.trim().isNotEmpty ? 'No results found.' : 'No options.'),
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
                      itemBuilder: (context, i) {
                        final option = filtered[i];
                        final selected = _values.contains(option.value);
                        return _SuggestionRow(
                          option: option,
                          selected: selected,
                          multiple: widget.multiple,
                          nonInteractive: option.disabled || widget.loading || (_atMax && !selected),
                          size: dims,
                          colors: colors,
                          onTap: () {
                            if (widget.multiple) {
                              widget.onToggleMulti(option, (next) => setState(() => _values = next));
                            } else {
                              widget.onSelectSingle(option);
                              Navigator.of(context).pop(option.value);
                            }
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SuggestionRow extends StatefulWidget {
  final InoAutocompleteOption option;
  final bool selected;
  final bool multiple;
  final bool nonInteractive;
  final InoControlSize size;
  final InoPalette colors;
  final VoidCallback onTap;

  const _SuggestionRow({
    required this.option,
    required this.selected,
    required this.multiple,
    required this.nonInteractive,
    required this.size,
    required this.colors,
    required this.onTap,
  });

  @override
  State<_SuggestionRow> createState() => _SuggestionRowState();
}

class _SuggestionRowState extends State<_SuggestionRow> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final colors = widget.colors;
    final disabled = widget.nonInteractive;
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
              if (!widget.multiple && selected)
                ExcludeSemantics(
                  child: Text('✓',
                      style: TextStyle(fontSize: widget.size.fontSize, color: colors.accentTextSafe)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
