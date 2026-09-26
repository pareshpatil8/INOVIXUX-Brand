import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoTextareaVariant { outline, filled }

/// `<InoTextarea>` — Flutter port of `<ino-textarea>` (web/src/app/components/textarea,
/// INO-147 / INO-31 T-7). Carries the same scope as the web component: `size`, `variant`
/// (outline/filled), `disabled`/`readOnly`/`loading` states, fixed-rows sizing, auto-resize,
/// and the character counter.
///
/// Fixed-rows mode sets `TextField.maxLines: rows` (and `minLines: rows`), a fixed box exactly
/// like the web component's native `rows` attribute. Auto-resize sets `maxLines: null` with
/// `minLines: minRows` — Flutter's `TextField` grows to fit content natively in that
/// configuration, so unlike the React Native port (which has no `scrollHeight`-equivalent
/// primitive and has to measure via `onContentSizeChange`), this needs no manual height
/// measurement; `maxRows` is approximated by wrapping the field in a `ConstrainedBox` capped at
/// `maxRows * lineHeight`, past which the field scrolls internally.
///
/// `readOnly` sets `TextField.readOnly` (not `enabled: false`) so the field stays focusable and
/// its value stays selectable/copyable to AT — the same distinction `InoInput`'s widget draws.
class InoTextarea extends StatefulWidget {
  final String? label;
  final String? placeholder;
  final String? hint;
  final String? error;
  final String? initialValue;
  final InoControlSize size;
  final InoTextareaVariant variant;
  final int rows;
  final bool autoResize;
  final int minRows;
  final int maxRows;
  final int? maxLength;
  final bool showCount;
  final bool disabled;
  final bool readOnly;
  final bool loading;
  final ValueChanged<String>? onChanged;

  const InoTextarea({
    super.key,
    this.label,
    this.placeholder,
    this.hint,
    this.error,
    this.initialValue,
    this.size = InoControlSize.standard,
    this.variant = InoTextareaVariant.outline,
    this.rows = 3,
    this.autoResize = false,
    this.minRows = 2,
    this.maxRows = 10,
    this.maxLength,
    this.showCount = false,
    this.disabled = false,
    this.readOnly = false,
    this.loading = false,
    this.onChanged,
  });

  @override
  State<InoTextarea> createState() => _InoTextareaState();
}

class _InoTextareaState extends State<InoTextarea> {
  final FocusNode _focusNode = FocusNode();
  late final TextEditingController _controller =
      TextEditingController(text: widget.initialValue);
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() => setState(() => _focused = _focusNode.hasFocus));
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _focusNode.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final invalid = widget.error != null && widget.error!.isNotEmpty;
    final filled = widget.variant == InoTextareaVariant.filled;
    final nonEditable = widget.disabled || widget.readOnly || widget.loading;
    final lineHeight = widget.size.fontSize * 1.4;

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
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: widget.autoResize ? lineHeight * widget.maxRows : double.infinity,
            ),
            child: Stack(
              alignment: Alignment.topRight,
              children: [
                TextField(
                  focusNode: _focusNode,
                  controller: _controller,
                  enabled: !widget.disabled,
                  readOnly: nonEditable,
                  maxLength: widget.maxLength,
                  minLines: widget.autoResize ? widget.minRows : widget.rows,
                  maxLines: widget.autoResize ? null : widget.rows,
                  onChanged: widget.onChanged,
                  style: TextStyle(fontSize: widget.size.fontSize, color: colors.onSurface),
                  decoration: InputDecoration(
                    hintText: widget.placeholder,
                    hintStyle: TextStyle(color: colors.onSurfaceSubtle),
                    counterText: '',
                    isDense: true,
                    filled: true,
                    fillColor: filled
                        ? (nonEditable && !widget.disabled ? colors.surfaceSunken : colors.surfaceRaised)
                        : (widget.readOnly ? colors.surfaceRaised : colors.surfaceSunken),
                    contentPadding: EdgeInsets.only(
                      left: widget.size.paddingInline,
                      right: widget.loading ? widget.size.paddingInline + 24 : widget.size.paddingInline,
                      top: InoSpace.s3,
                      bottom: InoSpace.s3,
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
                    padding: const EdgeInsets.only(right: InoSpace.s4, top: InoSpace.s3),
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
          if (invalid || widget.hint != null || (widget.showCount && widget.maxLength != null)) ...[
            const SizedBox(height: InoSpace.s2),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                if (invalid)
                  Expanded(
                    child: Semantics(
                      liveRegion: true,
                      child: Text(widget.error!,
                          style: TextStyle(fontSize: 12.5, color: colors.danger, fontWeight: FontWeight.w600)),
                    ),
                  )
                else if (widget.hint != null)
                  Expanded(
                    child: Text(widget.hint!, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
                  )
                else
                  const Spacer(),
                if (widget.showCount && widget.maxLength != null)
                  Text(
                    '${_controller.text.length}/${widget.maxLength}',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: _controller.text.length >= widget.maxLength!
                          ? colors.danger
                          : colors.onSurfaceMuted,
                      fontWeight: _controller.text.length >= widget.maxLength! ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
