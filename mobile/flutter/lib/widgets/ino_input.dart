import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoInputVariant { outline, filled }

/// `<InoInput>` — Flutter port of `<ino-input>` (web/src/app/components/input, INO-157 /
/// INO-31 U-2). Carries the same uplift scope as the web component: `size`, `variant`
/// (outline/filled), and explicit `disabled`/`readOnly`/`loading` states. No icon-slot
/// parameter — matching the web component's scope (SPEC.md §1); T-16/T-17 (`ino-icon-field`/
/// `ino-input-group`) are Capacitor-only per the porting rule, so there is no Flutter wrapper to
/// compose with yet.
///
/// `readOnly` sets `TextField.readOnly` (not `enabled: false`) so the field stays focusable and
/// its value stays selectable/copyable to AT — the same focusable-but-not-editable distinction
/// the web component's SPEC.md §2 draws between `readonly` and `disabled`.
class InoInput extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? error;
  final String? initialValue;
  final InoControlSize size;
  final InoInputVariant variant;
  final bool disabled;
  final bool readOnly;
  final bool loading;
  final bool obscureText;
  final ValueChanged<String>? onChanged;

  const InoInput({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.initialValue,
    this.size = InoControlSize.standard,
    this.variant = InoInputVariant.outline,
    this.disabled = false,
    this.readOnly = false,
    this.loading = false,
    this.obscureText = false,
    this.onChanged,
  });

  @override
  State<InoInput> createState() => _InoInputState();
}

class _InoInputState extends State<InoInput> {
  final FocusNode _focusNode = FocusNode();
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() => setState(() => _focused = _focusNode.hasFocus));
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final invalid = widget.error != null && widget.error!.isNotEmpty;
    final filled = widget.variant == InoInputVariant.filled;
    final nonEditable = widget.disabled || widget.readOnly || widget.loading;

    final Color borderColor = invalid
        ? colors.danger
        : _focused
            ? colors.accent
            : colors.border;

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
          SizedBox(
            height: widget.size.height,
            child: Stack(
              alignment: Alignment.centerRight,
              children: [
                TextField(
                  focusNode: _focusNode,
                  enabled: !widget.disabled,
                  readOnly: nonEditable,
                  obscureText: widget.obscureText,
                  onChanged: widget.onChanged,
                  controller: widget.initialValue != null
                      ? TextEditingController(text: widget.initialValue)
                      : null,
                  style: TextStyle(fontSize: widget.size.fontSize, color: colors.onSurface),
                  decoration: InputDecoration(
                    isDense: true,
                    filled: true,
                    fillColor: filled
                        ? (nonEditable && !widget.disabled ? colors.surfaceSunken : colors.surfaceRaised)
                        : (widget.readOnly ? colors.surfaceRaised : colors.surfaceSunken),
                    contentPadding: EdgeInsets.only(
                      left: widget.size.paddingInline,
                      right: widget.loading ? widget.size.paddingInline + 24 : widget.size.paddingInline,
                    ),
                    border: filled
                        ? UnderlineInputBorder(borderSide: BorderSide(color: colors.border))
                        : OutlineInputBorder(
                            borderRadius: BorderRadius.circular(InoRadius.md),
                            borderSide: BorderSide(color: colors.border),
                          ),
                    enabledBorder: filled
                        ? UnderlineInputBorder(borderSide: BorderSide(color: colors.border, width: 1))
                        : OutlineInputBorder(
                            borderRadius: BorderRadius.circular(InoRadius.md),
                            borderSide: BorderSide(color: colors.border),
                          ),
                    focusedBorder: filled
                        ? UnderlineInputBorder(borderSide: BorderSide(color: borderColor, width: 2))
                        : OutlineInputBorder(
                            borderRadius: BorderRadius.circular(InoRadius.md),
                            borderSide: BorderSide(color: borderColor, width: 2),
                          ),
                    disabledBorder: filled
                        ? UnderlineInputBorder(borderSide: BorderSide(color: colors.border))
                        : OutlineInputBorder(
                            borderRadius: BorderRadius.circular(InoRadius.md),
                            borderSide: BorderSide(color: colors.border),
                          ),
                  ),
                ),
                if (widget.loading)
                  Padding(
                    padding: const EdgeInsets.only(right: InoSpace.s4),
                    child: SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(colors.onSurfaceMuted),
                      ),
                    ),
                  ),
              ],
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
