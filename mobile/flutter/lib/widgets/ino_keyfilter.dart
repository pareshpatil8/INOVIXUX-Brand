import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Flutter formatter equivalent of `[inoKeyfilter]` (web/src/app/components/keyfilter, INO-420 /
/// INO-31 B1). Not a widget — plug `InoKeyfilterFormatter` into any `TextField`'s
/// `inputFormatters:` list, the framework's own per-edit interception point and the same
/// mechanism `ino_inputnumber.dart`/`ino_input_otp.dart` already use via the built-in
/// `FilteringTextInputFormatter`. The same "platform-idiomatic non-visual primitive, not a
/// forced widget port" call `../../../react-native/src/components/InoKeyfilter.ts`'s hook makes
/// on the other mobile track. See `web/src/app/components/keyfilter/SPEC.md` §5.
///
/// `formatEditUpdate` receives the full old/new `TextEditingValue` per edit — including the
/// caret (`selection`) — which is strictly more than RN's `onChangeText` gives, so this port
/// tests each newly-inserted character at its true position rather than diffing blind. IME
/// composition commits as a single resolved edit the same way it does on the RN track: there is
/// no intermediate composing state visible to a `TextInputFormatter`, so composition can never
/// be interrupted by construction, matching web's explicit `isComposing`/`keyCode === 229` guard.
///
/// Preset rules are re-implemented here rather than imported — Dart cannot import a web
/// TypeScript module, the same boundary every other port in this codebase crosses — but are kept
/// byte-for-byte equivalent to `web/src/app/components/keyfilter/keyfilter-presets.ts`.
enum InoKeyfilterPreset { int_, num_, alpha, alphanum, regex }

class _KeyfilterContext {
  final String value;
  final int selectionStart;
  const _KeyfilterContext(this.value, this.selectionStart);
}

final RegExp _digit = RegExp(r'^[0-9]$');
final RegExp _alpha = RegExp(r'^[a-zA-Z]$');
final RegExp _alphanum = RegExp(r'^[a-zA-Z0-9]$');

bool _isLeadingMinus(String ch, _KeyfilterContext ctx) {
  return ch == '-' && ctx.selectionStart == 0 && !ctx.value.contains('-');
}

bool Function(String, _KeyfilterContext) _presetTest(InoKeyfilterPreset preset) {
  switch (preset) {
    case InoKeyfilterPreset.int_:
      return (ch, ctx) => _digit.hasMatch(ch) || _isLeadingMinus(ch, ctx);
    case InoKeyfilterPreset.num_:
      return (ch, ctx) =>
          _digit.hasMatch(ch) || _isLeadingMinus(ch, ctx) || (ch == '.' && !ctx.value.contains('.'));
    case InoKeyfilterPreset.alpha:
      return (ch, _) => _alpha.hasMatch(ch);
    case InoKeyfilterPreset.alphanum:
      return (ch, _) => _alphanum.hasMatch(ch);
    case InoKeyfilterPreset.regex:
      throw StateError('regex preset must be tested via the constructor-supplied RegExp, not _presetTest');
  }
}

class InoKeyfilterFormatter extends TextInputFormatter {
  final InoKeyfilterPreset preset;
  final RegExp? pattern;
  /// Fires with the rejected substring whenever at least one inserted character was filtered out.
  final void Function(String rejected)? onReject;

  InoKeyfilterFormatter({required this.preset, this.pattern, this.onReject})
      : assert(preset != InoKeyfilterPreset.regex || pattern != null, 'regex preset requires `pattern`');

  bool _test(String ch, _KeyfilterContext ctx) {
    if (preset == InoKeyfilterPreset.regex) return pattern!.hasMatch(ch);
    return _presetTest(preset)(ch, ctx);
  }

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final oldText = oldValue.text;
    final newText = newValue.text;

    // Diffs `newText` against `oldText` as a single contiguous edit — common prefix, common
    // suffix, whatever's left in the middle is the removed run (from `oldText`) and the inserted
    // run (from `newText`). Unlike a net-length comparison, this tells a replacement (a selection
    // typed over) apart from a delete regardless of whether the edit grew, shrank, or stayed the
    // same length — the same diff `../../react-native/src/components/InoKeyfilter.ts`'s
    // `diffEdit` uses, since `onChangeText` has the identical "only the two whole strings, no
    // selection" limitation this formatter now deliberately matches rather than trusting
    // `newValue.selection`, which does not always pin the true edit boundary.
    final maxPrefix = oldText.length < newText.length ? oldText.length : newText.length;
    var start = 0;
    while (start < maxPrefix && oldText[start] == newText[start]) {
      start++;
    }
    final maxSuffix = maxPrefix - start;
    var end = 0;
    while (end < maxSuffix && oldText[oldText.length - 1 - end] == newText[newText.length - 1 - end]) {
      end++;
    }

    final inserted = newText.substring(start, newText.length - end);
    if (inserted.isEmpty) return newValue; // pure deletion — nothing to filter

    final before = oldText.substring(0, start);
    final after = oldText.substring(oldText.length - end);

    var value = before + after;
    var pos = start;
    var filtered = StringBuffer();
    for (final ch in inserted.characters) {
      if (_test(ch, _KeyfilterContext(value, pos))) {
        value = value.substring(0, pos) + ch + value.substring(pos);
        filtered.write(ch);
        pos++;
      }
    }

    final filteredStr = filtered.toString();
    if (filteredStr == inserted) return newValue;
    onReject?.call(inserted);

    final result = before + filteredStr + after;
    final caret = start + filteredStr.length;
    return TextEditingValue(
      text: result,
      selection: TextSelection.collapsed(offset: caret),
    );
  }
}
