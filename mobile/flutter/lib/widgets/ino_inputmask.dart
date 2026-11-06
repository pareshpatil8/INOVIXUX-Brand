import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `<InoInputMask>` — Flutter port of `<ino-inputmask>` (web/src/app/components/inputmask,
/// INO-404 / INO-31 B1).
///
/// Mask grammar and India-stack presets are duplicated here rather than shared (same "each port
/// carries its own platform-native copy" convention `ino-password`'s SPEC.md §9 documents) —
/// `9`/`a`/`A`/`*` editable tokens, `\` literal-escape, everything else a literal separator. See
/// `web/src/app/components/inputmask/mask-tokens.ts` for the canonical grammar doc.
///
/// Flutter's `TextEditingController` + a `TextInputFormatter` gives per-keystroke interception
/// closer to the web port's `keydown` model than RN's `onChangeText`-only path does — this port
/// re-derives the full slot set from the controller's raw text on every edit via
/// `_InoInputMaskFormatter`, the same "thread raw characters through in order" approach the web
/// component's `applyStream` uses.
enum InoInputMaskPreset { pan, gstin, ifsc, phone, date }

class InoInputMaskPresetDef {
  final String mask;
  final String? placeholderChar;
  const InoInputMaskPresetDef({required this.mask, this.placeholderChar});
}

const Map<InoInputMaskPreset, InoInputMaskPresetDef> inoInputMaskPresets = {
  InoInputMaskPreset.pan: InoInputMaskPresetDef(mask: 'AAAAA9999A'),
  InoInputMaskPreset.gstin: InoInputMaskPresetDef(mask: '99AAAAA9999A9Z*'),
  InoInputMaskPreset.ifsc: InoInputMaskPresetDef(mask: 'AAAA0******'),
  InoInputMaskPreset.phone: InoInputMaskPresetDef(mask: '+\\91 99999 99999'),
  InoInputMaskPreset.date: InoInputMaskPresetDef(mask: '99/99/9999'),
};

enum _TokenKind { digit, alpha, alnum, literal }

class _MaskToken {
  final _TokenKind kind;
  final String char;
  final bool optional;
  final bool upper;
  const _MaskToken(this.kind, this.char, this.optional, {this.upper = false});
}

List<_MaskToken> _parseMask(String mask) {
  final tokens = <_MaskToken>[];
  var optional = false;
  for (var i = 0; i < mask.length; i++) {
    final ch = mask[i];
    if (ch == '\\') {
      i++;
      if (i < mask.length) tokens.add(_MaskToken(_TokenKind.literal, mask[i], optional));
      continue;
    }
    if (ch == '?') {
      optional = true;
      continue;
    }
    switch (ch) {
      case '9':
        tokens.add(_MaskToken(_TokenKind.digit, ch, optional));
        break;
      case 'a':
        tokens.add(_MaskToken(_TokenKind.alpha, ch, optional));
        break;
      case 'A':
        tokens.add(_MaskToken(_TokenKind.alpha, ch, optional, upper: true));
        break;
      case '*':
        tokens.add(_MaskToken(_TokenKind.alnum, ch, optional));
        break;
      default:
        tokens.add(_MaskToken(_TokenKind.literal, ch, optional));
    }
  }
  return tokens;
}

bool _testChar(_MaskToken token, String ch) {
  switch (token.kind) {
    case _TokenKind.digit:
      return RegExp(r'^[0-9]$').hasMatch(ch);
    case _TokenKind.alpha:
      return RegExp(r'^[a-zA-Z]$').hasMatch(ch);
    case _TokenKind.alnum:
      return RegExp(r'^[a-zA-Z0-9]$').hasMatch(ch);
    case _TokenKind.literal:
      return false;
  }
}

const Map<_TokenKind, List<String>> _kindWords = {
  _TokenKind.digit: ['digit', 'digits'],
  _TokenKind.alpha: ['letter', 'letters'],
  _TokenKind.alnum: ['letter or digit', 'letters or digits'],
};

String _describeMask(List<_MaskToken> tokens) {
  final runs = <MapEntry<_TokenKind, int>>[];
  for (final t in tokens) {
    if (t.kind == _TokenKind.literal) continue;
    if (runs.isNotEmpty && runs.last.key == t.kind) {
      runs[runs.length - 1] = MapEntry(t.kind, runs.last.value + 1);
    } else {
      runs.add(MapEntry(t.kind, 1));
    }
  }
  return runs
      .map((r) => '${r.value} ${_kindWords[r.key]![r.value == 1 ? 0 : 1]}')
      .join(', ');
}

/// Mirrors the web component's `applyStream(0, raw)` — threads a raw character cursor and a mask
/// token cursor forward together, so pre-formatted (already-literal-bearing) and bare input both
/// land in the right slots.
List<String?> _applyStream(List<_MaskToken> tokens, String raw) {
  final slots = List<String?>.filled(tokens.length, null);
  var ti = 0;
  var ri = 0;
  while (ti < tokens.length && ri < raw.length) {
    final token = tokens[ti];
    if (token.kind == _TokenKind.literal) {
      if (raw[ri] == token.char) ri++;
      ti++;
      continue;
    }
    while (ri < raw.length && !_testChar(token, raw[ri])) {
      ri++;
    }
    if (ri >= raw.length) break;
    slots[ti] = token.upper ? raw[ri].toUpperCase() : raw[ri];
    ri++;
    ti++;
  }
  return slots;
}

bool _isComplete(List<_MaskToken> tokens, List<String?> slots) {
  for (var i = 0; i < tokens.length; i++) {
    final t = tokens[i];
    if (t.kind == _TokenKind.literal || t.optional) continue;
    if (slots[i] == null) return false;
  }
  return true;
}

String _display(List<_MaskToken> tokens, List<String?> slots, String placeholderChar) {
  final sb = StringBuffer();
  for (var i = 0; i < tokens.length; i++) {
    final t = tokens[i];
    sb.write(t.kind == _TokenKind.literal ? t.char : (slots[i] ?? placeholderChar));
  }
  return sb.toString();
}

String _compact(List<_MaskToken> tokens, List<String?> slots) {
  final sb = StringBuffer();
  for (var i = 0; i < tokens.length; i++) {
    final t = tokens[i];
    if (t.kind != _TokenKind.literal) sb.write(slots[i] ?? '');
  }
  return sb.toString();
}

class InoInputMask extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? error;
  final String value;
  final ValueChanged<String>? onValueChange;
  final ValueChanged<String>? onMaskComplete;
  final String mask;
  final InoInputMaskPreset? preset;
  final String placeholderChar;
  final InoControlSize size;
  final bool required;
  final bool disabled;
  final bool readOnly;

  const InoInputMask({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.value = '',
    this.onValueChange,
    this.onMaskComplete,
    this.mask = '',
    this.preset,
    this.placeholderChar = '_',
    this.size = InoControlSize.standard,
    this.required = false,
    this.disabled = false,
    this.readOnly = false,
  });

  @override
  State<InoInputMask> createState() => _InoInputMaskState();
}

class _InoInputMaskState extends State<InoInputMask> {
  final FocusNode _focusNode = FocusNode();
  late TextEditingController _controller;
  bool _focused = false;
  bool _hasCompleted = false;

  String get _resolvedMask =>
      widget.preset != null ? inoInputMaskPresets[widget.preset]!.mask : widget.mask;
  String get _resolvedPlaceholderChar =>
      widget.preset != null
          ? (inoInputMaskPresets[widget.preset]!.placeholderChar ?? widget.placeholderChar)
          : widget.placeholderChar;

  @override
  void initState() {
    super.initState();
    final tokens = _parseMask(_resolvedMask);
    final slots = _applyStream(tokens, widget.value);
    _controller = TextEditingController(text: _display(tokens, slots, _resolvedPlaceholderChar));
    _focusNode.addListener(() => setState(() => _focused = _focusNode.hasFocus));
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _handleChanged(String raw) {
    final tokens = _parseMask(_resolvedMask);
    final slots = _applyStream(tokens, raw);
    final displayValue = _display(tokens, slots, _resolvedPlaceholderChar);
    final compactValue = _compact(tokens, slots);

    _controller.value = TextEditingValue(
      text: displayValue,
      selection: TextSelection.collapsed(offset: displayValue.length),
    );

    widget.onValueChange?.call(compactValue);
    final complete = _isComplete(tokens, slots);
    if (complete && !_hasCompleted) {
      _hasCompleted = true;
      widget.onMaskComplete?.call(compactValue);
    } else if (!complete) {
      _hasCompleted = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final tokens = _parseMask(_resolvedMask);
    final slots = _applyStream(tokens, widget.value);
    final anyFilled = slots.any((v) => v != null);
    final incomplete = anyFilled && !_isComplete(tokens, slots);
    final invalid = widget.error != null && widget.error!.isNotEmpty;

    final Color borderColor = invalid
        ? colors.danger
        : _focused
            ? colors.accent
            : incomplete
                ? colors.warning
                : colors.border;

    return Opacity(
      opacity: widget.disabled ? 0.5 : 1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.label != null) ...[
            Text(
              widget.required ? '${widget.label!} *' : widget.label!,
              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: colors.onSurface),
            ),
            const SizedBox(height: InoSpace.s2),
          ],
          Semantics(
            textField: true,
            label: widget.label,
            hint:
                'Format: ${_describeMask(tokens)}. Empty characters shown as "$_resolvedPlaceholderChar".',
            child: SizedBox(
              height: widget.size.height,
              child: TextField(
                focusNode: _focusNode,
                controller: _controller,
                enabled: !widget.disabled,
                readOnly: widget.readOnly,
                autocorrect: false,
                onChanged: _handleChanged,
                style: TextStyle(
                  fontSize: widget.size.fontSize,
                  color: colors.onSurface,
                  fontFeatures: const [FontFeature.tabularFigures()],
                  letterSpacing: 0.4,
                ),
                decoration: InputDecoration(
                  isDense: true,
                  filled: true,
                  fillColor: widget.readOnly ? colors.surfaceRaised : colors.surfaceSunken,
                  contentPadding: EdgeInsets.symmetric(horizontal: widget.size.paddingInline),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(InoRadius.md),
                    borderSide: BorderSide(color: colors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(InoRadius.md),
                    borderSide: BorderSide(color: colors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(InoRadius.md),
                    borderSide: BorderSide(color: borderColor, width: 2),
                  ),
                  disabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(InoRadius.md),
                    borderSide: BorderSide(color: colors.border),
                  ),
                ),
              ),
            ),
          ),
          if (invalid) ...[
            const SizedBox(height: InoSpace.s2),
            Semantics(
              liveRegion: true,
              child: Text(widget.error!, style: TextStyle(fontSize: 12.5, color: colors.danger, fontWeight: FontWeight.w600)),
            ),
          ] else if (widget.hint != null) ...[
            const SizedBox(height: InoSpace.s2),
            Text(widget.hint!, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
          ],
        ],
      ),
    );
  }
}
