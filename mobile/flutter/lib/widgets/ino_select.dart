import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_label.dart';

/// One option row. Flat only — the web component's `group` field is deliberately not ported
/// (see `SPEC-ino-select.md` §2).
class InoSelectOption {
  final String label;
  final String value;
  final bool disabled;

  const InoSelectOption({required this.label, required this.value, this.disabled = false});
}

/// `InoSelect` — Flutter port of `<ino-select>`
/// (`web/src/app/components/select`, INO-152 / INO-31 T-9; this port INO-258).
///
/// Scope, per the plan rev 9 §5 porting rule ("Flutter is a real port, ~40% the cost of the web
/// component") and mirroring [InoDatepicker]'s single-mode precedent: a trigger plus a modal
/// bottom-sheet option list, [InoControlSize], `disabled`/`loading`, `clearable`, and the
/// in-panel filter with the same case-insensitive substring semantics web uses. Deliberately
/// **not** ported — option groups, custom option/selected-value templates, virtual scrolling, and
/// the editable free-text trigger. See `web/src/app/components/select/SPEC.md` §9 for each
/// omission's reasoning (same file the datepicker's own mobile-scope decisions live in); they are
/// documented decisions, not gaps.
///
/// **Overlay idiom.** Web anchors an absolutely-positioned panel under the trigger. This port
/// presents the same list through `showModalBottomSheet` ([showConfirmActionSheet]'s idiom,
/// `docs/brand/13-mobile-app-patterns.md` §2) because an anchored popover under a field is a
/// pointer idiom: on a phone it collides with the keyboard and the bottom safe area. This is the
/// one intentional *visual* divergence from web, and it is why this port reads `overlayScrim` and
/// `borderSoft` (roles web's select never touches) — both declared in
/// `scripts/check-theme-parity.mjs`.
///
/// **Semantics.** Web uses the APG `aria-activedescendant` combobox contract. Flutter's
/// [Semantics] has no combobox/listbox/option equivalent and no activedescendant concept, so the
/// trigger is a button carrying `expanded` and each row is a button carrying `selected` — the same
/// substitution [InoDatepicker] makes for its day cells. Web-only states with no touch equivalent
/// are dropped rather than faked (`hover`, the `:focus-visible` ring), same rule [InoButton]'s doc
/// comment states; pressed/selected/disabled carry over.
class InoSelect extends StatelessWidget {
  final String? label;
  final List<InoSelectOption> options;

  /// `''` = no selection, matching the web component's `@Input() value` contract.
  final String value;
  final ValueChanged<String> onChanged;
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

  /// Sheet heading; defaults to [label], then [placeholder]. Web has no equivalent — its panel is
  /// anchored to a labelled trigger that stays on screen, this sheet covers it.
  final String? sheetTitle;
  final ValueChanged<String>? onFilterChanged;
  final ValueChanged<bool>? onOpenChanged;
  final VoidCallback? onClear;

  const InoSelect({
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
    this.clearable = false,
    this.filter = false,
    this.filterPlaceholder = 'Search…',
    this.sheetTitle,
    this.onFilterChanged,
    this.onOpenChanged,
    this.onClear,
  });

  InoSelectOption? get _selectedOption {
    for (final option in options) {
      if (option.value == value) return option;
    }
    return null;
  }

  bool get _nonInteractive => disabled || loading;

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
      builder: (sheetContext) => _OptionSheet(
        title: sheetTitle ?? label ?? placeholder,
        options: options,
        value: value,
        size: size,
        filter: filter,
        filterPlaceholder: filterPlaceholder,
        onFilterChanged: onFilterChanged,
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
    final selected = _selectedOption;
    final showClear = clearable && value.isNotEmpty && !disabled && !loading;

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
          value: selected?.label ?? placeholder,
          // No `expanded` flag: the option list is a pushed route, not a child of this subtree, so
          // while it is open the sheet owns the semantics tree and this trigger is not reachable.
          // The RN port sets `accessibilityState.expanded` because its Modal renders in-tree.
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
                        selected?.label ?? placeholder,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: dims.fontSize,
                          color: selected != null ? colors.onSurface : colors.onSurfaceSubtle,
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
                    if (showClear) ...[
                      Semantics(
                        button: true,
                        label: 'Clear selection',
                        child: GestureDetector(
                          onTap: () {
                            onChanged('');
                            onClear?.call();
                          },
                          child: Text('×',
                              style: TextStyle(fontSize: dims.iconSize, color: colors.onSurfaceMuted)),
                        ),
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

class _OptionSheet extends StatefulWidget {
  final String title;
  final List<InoSelectOption> options;
  final String value;
  final InoControlSize size;
  final bool filter;
  final String filterPlaceholder;
  final ValueChanged<String>? onFilterChanged;

  const _OptionSheet({
    required this.title,
    required this.options,
    required this.value,
    required this.size,
    required this.filter,
    required this.filterPlaceholder,
    required this.onFilterChanged,
  });

  @override
  State<_OptionSheet> createState() => _OptionSheetState();
}

class _OptionSheetState extends State<_OptionSheet> {
  String _filterText = '';

  /// Same predicate as the web component's `recomputeFiltered()` — trimmed, lower-cased substring
  /// match on the label. Flat list only: [InoSelectOption] has no `group` field.
  List<InoSelectOption> get _filtered {
    final query = _filterText.trim().toLowerCase();
    if (query.isEmpty) return widget.options;
    return widget.options.where((o) => o.label.toLowerCase().contains(query)).toList();
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
              if (filtered.isEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(InoSpace.s5, 0, InoSpace.s5, InoSpace.s5),
                  child: Text('No options found.',
                      style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
                )
              else
                // ListView.builder, not the web component's `<ino-virtual-scroller>` — same
                // rationale virtual-scroller's own SPEC.md §1 gives for staying web-only: the
                // platform list primitive already windows rows and is strictly better than a port.
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    padding: const EdgeInsets.only(bottom: InoSpace.s5),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) => _OptionRow(
                      option: filtered[i],
                      selected: filtered[i].value == widget.value,
                      size: dims,
                      colors: colors,
                      onTap: () => Navigator.of(context).pop(filtered[i].value),
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
  final InoSelectOption option;
  final bool selected;
  final InoControlSize size;
  final InoPalette colors;
  final VoidCallback onTap;

  const _OptionRow({
    required this.option,
    required this.selected,
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
          // `null`, not a transparent Color — same idiom the datepicker's day cell uses, and it
          // keeps the row off the raw-colour rule in check-ds-adherence.mjs.
          color: (_pressed && !disabled) ? colors.surfaceSunken : null,
          child: Row(
            children: [
              Expanded(
                child: Text(
                  widget.option.label,
                  style: TextStyle(
                    fontSize: widget.size.fontSize,
                    // Web tints the selected row's text with accent-text-safe rather than filling
                    // it with accent (ino-select.component.scss `.ino-field__option--selected`);
                    // the port keeps that exact treatment.
                    color: disabled
                        ? colors.onSurfaceSubtle
                        : selected
                            ? colors.accentTextSafe
                            : colors.onSurface,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
              // Colour is not the only selection cue (WCAG SC 1.4.1) — web gets a second cue from
              // the bold weight plus the anchored panel's own selected styling; a sheet row needs
              // a glyph.
              if (selected)
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
