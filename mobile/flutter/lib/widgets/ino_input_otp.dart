import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/semantics.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `<InoInputOtp>` — Flutter port of `<ino-input-otp>` (web/src/app/components/input-otp,
/// INO-146 / INO-31 T-6). One `TextField` per box with its own `FocusNode`, mirroring the web
/// component's real-input-per-box approach. `autofillHints: [AutofillHints.oneTimeCode]` is
/// Flutter/Android's equivalent of `autocomplete="one-time-code"` — the mechanism the platform
/// SMS autofill service uses to target these fields (see web SPEC.md §1 for the same contract on
/// web/iOS).
///
/// Per-cell progress is announced via [SemanticsService.announce] — Flutter has no `aria-live`
/// primitive — carrying the same "Digit N of length entered" / "Code complete." contract as the
/// web component's live region.
class InoInputOtp extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? error;
  final int length;
  final bool mask;
  final bool integerOnly;
  final String value;
  final InoControlSize size;
  final bool disabled;
  final bool readOnly;
  final bool loading;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onComplete;

  const InoInputOtp({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.length = 6,
    this.mask = false,
    this.integerOnly = true,
    this.value = '',
    this.size = InoControlSize.standard,
    this.disabled = false,
    this.readOnly = false,
    this.loading = false,
    this.onChanged,
    this.onComplete,
  });

  @override
  State<InoInputOtp> createState() => _InoInputOtpState();
}

class _InoInputOtpState extends State<InoInputOtp> {
  late List<TextEditingController> _controllers;
  late List<FocusNode> _focusNodes;
  int? _focusedIndex;

  @override
  void initState() {
    super.initState();
    final chars = _charsFromValue(widget.value);
    _controllers = List.generate(widget.length, (i) => TextEditingController(text: chars[i]));
    _focusNodes = List.generate(widget.length, (i) {
      final node = FocusNode();
      node.addListener(() {
        setState(() => _focusedIndex = node.hasFocus ? i : (_focusedIndex == i ? null : _focusedIndex));
      });
      return node;
    });
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final n in _focusNodes) {
      n.dispose();
    }
    super.dispose();
  }

  List<String> _charsFromValue(String value) =>
      List.generate(widget.length, (i) => i < value.length ? value[i] : '');

  void _focusCell(int index) {
    final clamped = index.clamp(0, widget.length - 1);
    _focusNodes[clamped].requestFocus();
  }

  void _commit(List<String> chars, int announceIndex) {
    final next = chars.join().substring(0, widget.length.clamp(0, chars.join().length));
    widget.onChanged?.call(next);
    final filledCount = chars.where((c) => c.isNotEmpty).length;
    if (filledCount == widget.length) {
      SemanticsService.announce('Code complete.', TextDirection.ltr);
      widget.onComplete?.call(next);
    } else if (chars[announceIndex].isNotEmpty) {
      SemanticsService.announce(
          'Digit ${announceIndex + 1} of ${widget.length} entered.', TextDirection.ltr);
    } else {
      SemanticsService.announce(
          'Digit ${announceIndex + 1} of ${widget.length} cleared.', TextDirection.ltr);
    }
  }

  void _onChanged(int index, String text) {
    final char = text.isEmpty ? '' : text.characters.last;
    if (char.isNotEmpty && widget.integerOnly && !RegExp(r'^\d$').hasMatch(char)) {
      _controllers[index].text = '';
      return;
    }
    final chars = _controllers.map((c) => c.text).toList();
    chars[index] = char;
    _controllers[index].text = char;
    _commit(chars, index);
    if (char.isNotEmpty && index < widget.length - 1) _focusCell(index + 1);
  }

  KeyEventResult _onKeyEvent(int index, FocusNode node, KeyEvent event) {
    final nonEditable = widget.disabled || widget.readOnly || widget.loading;
    if (nonEditable) return KeyEventResult.ignored;
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.backspace &&
        _controllers[index].text.isEmpty &&
        index > 0) {
      final chars = _controllers.map((c) => c.text).toList();
      chars[index - 1] = '';
      _controllers[index - 1].text = '';
      _commit(chars, index - 1);
      _focusCell(index - 1);
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final invalid = widget.error != null && widget.error!.isNotEmpty;
    final nonEditable = widget.disabled || widget.readOnly || widget.loading;

    return Opacity(
      opacity: widget.disabled ? 0.5 : 1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.label != null) ...[
            Text(
              widget.label!,
              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: colors.onSurface),
            ),
            const SizedBox(height: InoSpace.s2),
          ],
          Semantics(
            label: widget.label ?? 'One-time code',
            container: true,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < widget.length; i++) ...[
                  if (i > 0) const SizedBox(width: InoSpace.s3),
                  _cell(context, colors, i, invalid, nonEditable),
                ],
                if (widget.loading) ...[
                  const SizedBox(width: InoSpace.s3),
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(colors.onSurfaceMuted),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (invalid) ...[
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
      ),
    );
  }

  Widget _cell(BuildContext context, InoPalette colors, int index, bool invalid, bool nonEditable) {
    final focused = _focusedIndex == index;
    final borderColor = invalid ? colors.danger : (focused ? colors.accent : colors.border);

    return Semantics(
      label: 'Digit ${index + 1} of ${widget.length}',
      textField: true,
      child: SizedBox(
        width: widget.size.height,
        height: widget.size.height,
        child: Focus(
          onKeyEvent: (node, event) => _onKeyEvent(index, node, event),
          child: TextField(
            controller: _controllers[index],
            focusNode: _focusNodes[index],
            enabled: !widget.disabled,
            readOnly: nonEditable,
            obscureText: widget.mask,
            textAlign: TextAlign.center,
            maxLength: 1,
            keyboardType: widget.integerOnly ? TextInputType.number : TextInputType.text,
            inputFormatters:
                widget.integerOnly ? [FilteringTextInputFormatter.digitsOnly] : null,
            autofillHints: const [AutofillHints.oneTimeCode],
            onChanged: (text) => _onChanged(index, text),
            style: TextStyle(fontSize: widget.size.fontSize, color: colors.onSurface),
            decoration: InputDecoration(
              counterText: '',
              isDense: true,
              filled: true,
              fillColor: colors.surfaceSunken,
              contentPadding: EdgeInsets.zero,
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
    );
  }
}
