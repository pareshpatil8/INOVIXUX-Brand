import 'package:flutter/material.dart';
// SemanticsService lives in semantics.dart, not services.dart — without this the two
// SemanticsService.announce calls below did not resolve and the file did not compile at all.
// Pre-existing, unrelated to INO-723's retokenisation; fixed here because the gate work made it
// visible and it is a one-line fix in a file this change already touches.
import 'package:flutter/semantics.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Model for a tag in InoInputTags
class InoInputTag {
  final String value;
  final String label;
  final bool invalid;

  const InoInputTag({
    required this.value,
    required this.label,
    this.invalid = false,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InoInputTag &&
          runtimeType == other.runtimeType &&
          value == other.value;

  @override
  int get hashCode => value.hashCode;
}

/// Model for an autocomplete suggestion
class InoInputTagsSuggestion {
  final String label;
  final String value;
  final bool disabled;

  const InoInputTagsSuggestion({
    required this.label,
    required this.value,
    this.disabled = false,
  });
}

/// Size variants for InoInputTags
enum InoInputTagsSize { small, medium, large }

/// `InoInputTags` — free-entry tag/chip input with autocomplete suggestions
///
/// Port of the web component (INO-418, INO-31 Phase B1).
///
/// **Features:**
/// - Free-entry tags: type and press Return/comma to add
/// - Autocomplete suggestions while typing
/// - Per-tag validation with visual invalid state
/// - Max tags limit with disabled input when reached
/// - Backspace removes last tag when input is empty
/// - Full Material a11y: semantic labels, announcements
///
/// **States:**
/// - `tag-invalid`: when `validateTag` returns false
/// - `at-max`: when tags length >= `maxTags`
///
/// **Theming (INO-723).** Colours come from `context.inoColors` — the [InoPalette] theme
/// extension — not from `Theme.of(context).colorScheme`. The two are related (buildInoTheme does
/// derive the ColorScheme from the palette), but the derivation is lossy in ways that mattered
/// here: `colorScheme.primary` is `accentTextSafe`, the *text* accent, so using it as a chip fill
/// read the wrong role; and the ColorScheme has no slot at all for `surfaceRaised` /
/// `surfaceSunken` / `border`, which is why the field and chip previously fell back to Material
/// defaults. Reading the extension directly is the idiom every other widget here uses, and it is
/// what lets check-theme-parity.mjs state which Ino roles this port consumes.
///
/// Contract: doc 26 §2 (Variants/Structure, States, Sizing, Labels, a11y, Mobile port).
class InoInputTags extends StatefulWidget {
  final String? label;
  final List<InoInputTag> value;
  final List<InoInputTagsSuggestion> suggestions;
  final String? placeholder;
  final String? hint;
  final String? error;
  final InoInputTagsSize size;
  final bool required;
  final bool enabled;
  final bool readOnly;
  final bool allowDuplicates;
  final bool addOnBlur;
  final int? maxTags;
  final bool Function(String)? validateTag;
  final String separators;
  final ValueChanged<List<InoInputTag>>? onChanged;
  final ValueChanged<InoInputTag>? onTagAdd;
  final ValueChanged<InoInputTag>? onTagRemove;
  final ValueChanged<String>? onSearch;

  const InoInputTags({
    super.key,
    this.label,
    this.value = const [],
    this.suggestions = const [],
    this.placeholder,
    this.hint,
    this.error,
    this.size = InoInputTagsSize.medium,
    this.required = false,
    this.enabled = true,
    this.readOnly = false,
    this.allowDuplicates = false,
    this.addOnBlur = true,
    this.maxTags,
    this.validateTag,
    this.separators = ',',
    this.onChanged,
    this.onTagAdd,
    this.onTagRemove,
    this.onSearch,
  });

  @override
  State<InoInputTags> createState() => _InoInputTagsState();
}

class _InoInputTagsState extends State<InoInputTags> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;
  List<InoInputTagsSuggestion> _filteredSuggestions = [];

  bool get _isAtMax =>
      widget.maxTags != null && widget.value.length >= widget.maxTags!;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onTextChanged);
    _focusNode.addListener(_onFocusChanged);
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    _focusNode.removeListener(_onFocusChanged);
    _focusNode.dispose();
    _removeOverlay();
    super.dispose();
  }

  void _onTextChanged() {
    final query = _controller.text.trim().toLowerCase();
    setState(() {
      _filteredSuggestions = query.isEmpty
          ? widget.suggestions
          : widget.suggestions
              .where((s) => s.label.toLowerCase().contains(query))
              .toList();
    });

    if (widget.onSearch != null) {
      widget.onSearch!(_controller.text);
    }

    _updateOverlay();
  }

  void _onFocusChanged() {
    if (_focusNode.hasFocus) {
      _updateOverlay();
    } else {
      if (widget.addOnBlur && _controller.text.trim().isNotEmpty) {
        _addTag(_controller.text.trim());
      }
      _removeOverlay();
    }
  }

  void _addTag(String text) {
    if (_isAtMax) return;

    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    if (!widget.allowDuplicates &&
        widget.value.any((t) => t.value == trimmed)) {
      _controller.clear();
      return;
    }

    final isValid = widget.validateTag?.call(trimmed) ?? true;
    final newTag = InoInputTag(
      value: trimmed,
      label: trimmed,
      invalid: !isValid,
    );

    final nextValue = [...widget.value, newTag];
    widget.onChanged?.call(nextValue);
    widget.onTagAdd?.call(newTag);

    _controller.clear();
    _removeOverlay();

    // Announce tag addition for screen readers
    SemanticsService.announce('Added $trimmed', TextDirection.ltr);
  }

  void _removeTag(InoInputTag tag) {
    final nextValue = widget.value.where((t) => t != tag).toList();
    widget.onChanged?.call(nextValue);
    widget.onTagRemove?.call(tag);

    // Announce tag removal for screen readers
    SemanticsService.announce('Removed ${tag.label}', TextDirection.ltr);

    // Focus input after removal
    _focusNode.requestFocus();
  }

  void _removeLastTag() {
    if (widget.value.isNotEmpty) {
      _removeTag(widget.value.last);
    }
  }

  void _selectSuggestion(InoInputTagsSuggestion suggestion) {
    if (suggestion.disabled) return;
    _addTag(suggestion.value);
  }

  void _updateOverlay() {
    if (_isAtMax ||
        !_focusNode.hasFocus ||
        _filteredSuggestions.isEmpty ||
        !widget.enabled) {
      _removeOverlay();
      return;
    }

    _overlayEntry ??= _createOverlayEntry();
    Overlay.of(context).insert(_overlayEntry!);
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  OverlayEntry _createOverlayEntry() {
    // Captured from the field's own context: the overlay builder runs against the Overlay's
    // element, which sits above this subtree, so reading the palette in there would work only by
    // accident of both being under the same MaterialApp. Resolve it here instead.
    final p = context.inoColors;

    return OverlayEntry(
      builder: (context) => Positioned(
        width: context.size?.width,
        child: CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: const Offset(0, 56),
          child: Material(
            elevation: 8,
            color: p.surfaceRaised,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(InoRadius.md),
              side: BorderSide(color: p.border),
            ),
            clipBehavior: Clip.antiAlias,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 280),
              child: ListView.builder(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                itemCount: _filteredSuggestions.length,
                itemBuilder: (context, index) {
                  final suggestion = _filteredSuggestions[index];
                  return ListTile(
                    title: Text(
                      suggestion.label,
                      style: TextStyle(
                        color: suggestion.disabled
                            ? p.onSurfaceSubtle
                            : p.onSurface,
                      ),
                    ),
                    minTileHeight: inoRowMinHeight,
                    enabled: !suggestion.disabled,
                    onTap: () => _selectSuggestion(suggestion),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.inoColors;
    final chipHeight = _getChipHeight();
    final fontSize = _getFontSize();

    return CompositedTransformTarget(
      link: _layerLink,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.label != null)
            Padding(
              padding: const EdgeInsets.only(bottom: InoSpace.s2),
              child: Text.rich(
                TextSpan(
                  text: widget.label,
                  children: [
                    // dangerTextSafe, not danger: the marker is text on a surface. Same split
                    // tokens.css §2 makes between the fill red and the legible text red.
                    if (widget.required)
                      TextSpan(
                        text: ' *',
                        style: TextStyle(color: p.dangerTextSafe),
                      ),
                  ],
                ),
                style: TextStyle(
                  fontSize: InoTypeLabel.label.fontSize,
                  height: InoTypeLabel.label.height,
                  letterSpacing: InoTypeLabel.label.letterSpacing,
                  fontWeight: FontWeight.w500,
                  color: p.onSurface,
                ),
              ),
            ),
          InputDecorator(
            decoration: InputDecoration(
              filled: true,
              fillColor: widget.readOnly ? p.surfaceRaised : p.surfaceSunken,
              hintText: widget.value.isEmpty ? widget.placeholder : null,
              hintStyle: TextStyle(color: p.onSurfaceSubtle),
              helperText: widget.error ?? widget.hint,
              helperStyle: TextStyle(
                color: widget.error != null ? p.dangerTextSafe : p.onSurfaceMuted,
                fontWeight: widget.error != null ? FontWeight.w600 : null,
              ),
              errorText: widget.error,
              errorStyle: TextStyle(color: p.dangerTextSafe, fontWeight: FontWeight.w600),
              enabled: widget.enabled && !_isAtMax,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(InoRadius.md),
                borderSide: BorderSide(color: p.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(InoRadius.md),
                borderSide: BorderSide(color: p.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(InoRadius.md),
                borderSide: BorderSide(color: p.accent, width: 2),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(InoRadius.md),
                borderSide: BorderSide(color: p.danger),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(InoRadius.md),
                borderSide: BorderSide(color: p.danger, width: 2),
              ),
              constraints: const BoxConstraints(minHeight: inoRowMinHeight),
              contentPadding: const EdgeInsets.all(InoSpace.s1),
            ),
            child: Wrap(
              spacing: InoSpace.s1,
              runSpacing: InoSpace.s1,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                ...widget.value.map((tag) => _buildChip(tag, chipHeight)),
                SizedBox(
                  width: 120,
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    enabled: widget.enabled && !_isAtMax,
                    readOnly: widget.readOnly,
                    style: TextStyle(fontSize: fontSize, color: p.onSurface),
                    cursorColor: p.accent,
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                    onSubmitted: (value) {
                      if (value.trim().isNotEmpty) {
                        _addTag(value.trim());
                      }
                    },
                    onChanged: (value) {
                      for (var i = 0; i < widget.separators.length; i++) {
                        if (value.endsWith(widget.separators[i])) {
                          final text =
                              value.substring(0, value.length - 1).trim();
                          if (text.isNotEmpty) {
                            _addTag(text);
                          }
                          return;
                        }
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// The chip is the neutral raised pill the rest of the system uses (`ino_multi_select.dart`'s
  /// chip, `.ino-field__chip` on web), not an accent tint — INO-723 converged all three platforms
  /// on it. The invalid variant keeps that fill and signals through the danger border plus
  /// danger-text-safe label, which is also how the web component now spells it.
  Widget _buildChip(InoInputTag tag, double height) {
    final p = context.inoColors;
    final textColor = tag.invalid ? p.dangerTextSafe : p.onSurface;

    return Chip(
      label: Text(tag.label),
      labelStyle: TextStyle(color: textColor, fontSize: _getFontSize() - 2),
      backgroundColor: p.surfaceRaised,
      deleteIcon: Icon(Icons.close, size: 16, color: textColor),
      onDeleted: widget.enabled && !widget.readOnly
          ? () => _removeTag(tag)
          : null,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      shape: StadiumBorder(
        side: BorderSide(color: tag.invalid ? p.danger : p.border),
      ),
    );
  }

  double _getChipHeight() {
    switch (widget.size) {
      case InoInputTagsSize.small:
        return 24;
      case InoInputTagsSize.medium:
        return 32;
      case InoInputTagsSize.large:
        return 40;
    }
  }

  double _getFontSize() {
    switch (widget.size) {
      case InoInputTagsSize.small:
        return 12;
      case InoInputTagsSize.medium:
        return 14;
      case InoInputTagsSize.large:
        return 16;
    }
  }
}
