import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoInputNumberMode { decimal, currency, percent }
enum InoInputNumberVariant { outline, filled }

/// `<InoInputNumber>` — Flutter port of `<ino-inputnumber>` (web/src/app/components/inputnumber,
/// INO-402 / INO-31 B1).
///
/// Promotes from `<InoInput keyboardType: TextInputType.number>` with:
/// - Spinner buttons (increment/decrement) — hideable via `showButtons: false`
/// - Currency/percent/decimal modes with locale-aware formatting via `intl` package
/// - Prefix/suffix support
/// - Locale digit grouping (including Indic scripts)
/// - Min/max constraints with at-min/at-max visual states
///
/// Keyboard contract: numeric keyboard; spinner buttons provide increment/decrement.
/// Accessibility: proper labels, semantic value, button labels.
///
/// Mobile-specific notes:
/// - `showButtons` defaults to `false` on mobile (native pickers preferred)
/// - Flutter `TextInputType.numberWithOptions` supports signed/decimal flags
/// - Intl package handles all locale-specific formatting including Indic grouping
class InoInputNumber extends StatefulWidget {
  final String? label;
  final String? hint;
  /// In-field placeholder, shown while the field is empty — web's `[placeholder]` input and the
  /// React Native port's `placeholder` prop. Distinct from [hint], which is the helper line BELOW
  /// the field. Added in INO-724: this port had no placeholder surface at all, so the
  /// on-surface-subtle placeholder role the other two ports read had nothing to paint here.
  final String? placeholder;
  final String? error;
  final double? value;
  final ValueChanged<double?>? onValueChange;
  final InoControlSize size;
  final InoInputNumberVariant variant;
  final InoInputNumberMode mode;
  final String? prefix;
  final String? suffix;
  final String locale;
  final String currency;
  final double? min;
  final double? max;
  final double step;
  final int minFractionDigits;
  final int maxFractionDigits;
  final bool useGrouping;
  final bool showButtons;
  final bool disabled;
  final bool readOnly;
  final bool loading;

  const InoInputNumber({
    super.key,
    this.label,
    this.hint,
    this.placeholder,
    this.error,
    this.value,
    this.onValueChange,
    this.size = InoControlSize.standard,
    this.variant = InoInputNumberVariant.outline,
    this.mode = InoInputNumberMode.decimal,
    this.prefix,
    this.suffix,
    this.locale = 'en_US',
    this.currency = 'USD',
    this.min,
    this.max,
    this.step = 1.0,
    this.minFractionDigits = 0,
    this.maxFractionDigits = 3,
    this.useGrouping = true,
    this.showButtons = false,
    this.disabled = false,
    this.readOnly = false,
    this.loading = false,
  });

  @override
  State<InoInputNumber> createState() => _InoInputNumberState();
}

class _InoInputNumberState extends State<InoInputNumber> {
  final FocusNode _focusNode = FocusNode();
  late TextEditingController _controller;
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value?.toString() ?? '');
    _focusNode.addListener(() {
      setState(() => _focused = _focusNode.hasFocus);
      if (!_focused) {
        _controller.text = _formatValue(widget.value);
      } else {
        _controller.text = widget.value?.toString() ?? '';
      }
    });
  }

  @override
  void didUpdateWidget(InoInputNumber oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value && !_focused) {
      _controller.text = _formatValue(widget.value);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  String _formatValue(double? val) {
    if (val == null) return '';

    try {
      NumberFormat formatter;

      if (widget.mode == InoInputNumberMode.currency) {
        formatter = NumberFormat.currency(
          locale: widget.locale,
          symbol: '',
          decimalDigits: widget.maxFractionDigits,
        );
      } else if (widget.mode == InoInputNumberMode.percent) {
        formatter = NumberFormat.percentPattern(widget.locale);
        formatter.minimumFractionDigits = widget.minFractionDigits;
        formatter.maximumFractionDigits = widget.maxFractionDigits;
      } else {
        formatter = NumberFormat.decimalPattern(widget.locale);
        formatter.minimumFractionDigits = widget.minFractionDigits;
        formatter.maximumFractionDigits = widget.maxFractionDigits;
      }

      return formatter.format(val);
    } catch (e) {
      return val.toString();
    }
  }

  void _updateValue(double newValue) {
    double clampedValue = newValue;

    if (widget.min != null && clampedValue < widget.min!) {
      clampedValue = widget.min!;
    }
    if (widget.max != null && clampedValue > widget.max!) {
      clampedValue = widget.max!;
    }

    widget.onValueChange?.call(clampedValue);
  }

  void _handleTextChange(String text) {
    if (text.isEmpty || text == '-') {
      widget.onValueChange?.call(null);
      return;
    }

    final parsed = double.tryParse(text);
    if (parsed != null) {
      _updateValue(parsed);
    }
  }

  void _increment() {
    if (widget.disabled || widget.readOnly || widget.loading) return;
    final currentValue = widget.value ?? 0;
    _updateValue(currentValue + widget.step);
  }

  void _decrement() {
    if (widget.disabled || widget.readOnly || widget.loading) return;
    final currentValue = widget.value ?? 0;
    _updateValue(currentValue - widget.step);
  }

  bool get _isAtMin => widget.value != null && widget.min != null && widget.value! <= widget.min!;
  bool get _isAtMax => widget.value != null && widget.max != null && widget.value! >= widget.max!;

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final invalid = widget.error != null && widget.error!.isNotEmpty;
    final filled = widget.variant == InoInputNumberVariant.filled;
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (widget.prefix != null) ...[
                Text(
                  widget.prefix!,
                  style: TextStyle(fontSize: 14.5, color: colors.onSurfaceMuted),
                ),
                const SizedBox(width: InoSpace.s2),
              ],
              Expanded(
                child: SizedBox(
                  height: widget.size.height,
                  child: Stack(
                    alignment: Alignment.centerRight,
                    children: [
                      Semantics(
                        container: true,
                        value: widget.value?.toString(),
                        child: TextField(
                          focusNode: _focusNode,
                          controller: _controller,
                          enabled: !widget.disabled,
                          readOnly: nonEditable,
                          keyboardType: TextInputType.numberWithOptions(
                            signed: widget.min == null || widget.min! < 0,
                            decimal: widget.maxFractionDigits > 0,
                          ),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(RegExp(r'[0-9.-]')),
                          ],
                          onChanged: _handleTextChange,
                          style: TextStyle(fontSize: widget.size.fontSize, color: colors.onSurface),
                          decoration: InputDecoration(
                            isDense: true,
                            filled: true,
                            // INO-724. Web colours the placeholder on-surface-subtle
                            // (`&::placeholder`, ino-inputnumber.component.scss:72) and the React
                            // Native port matches it via `placeholderTextColor`. Without an
                            // explicit hintStyle the text falls back to Material's own hintColor.
                            // Only the colour is overridden — InputDecorator merges hintStyle over
                            // the field's own `style`, so the size-token fontSize still applies.
                            hintText: widget.placeholder,
                            hintStyle: TextStyle(color: colors.onSurfaceSubtle),
                            fillColor: filled
                                ? (nonEditable && !widget.disabled ? colors.surfaceSunken : colors.surfaceRaised)
                                : (widget.readOnly ? colors.surfaceRaised : colors.surfaceSunken),
                            contentPadding: EdgeInsets.only(
                              left: widget.size.paddingInline,
                              right: widget.showButtons
                                  ? widget.size.paddingInline + 60
                                  : (widget.loading ? widget.size.paddingInline + 24 : widget.size.paddingInline),
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
                      ),
                      if (widget.showButtons && !widget.loading)
                        Padding(
                          padding: const EdgeInsets.only(right: InoSpace.s2),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _SpinnerButton(
                                icon: Icons.add,
                                label: 'Increment value',
                                disabled: nonEditable || _isAtMax,
                                onPressed: _increment,
                                colors: colors,
                              ),
                              const SizedBox(height: 2),
                              _SpinnerButton(
                                icon: Icons.remove,
                                label: 'Decrement value',
                                disabled: nonEditable || _isAtMin,
                                onPressed: _decrement,
                                colors: colors,
                              ),
                            ],
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
              ),
              if (widget.suffix != null) ...[
                const SizedBox(width: InoSpace.s2),
                Text(
                  widget.suffix!,
                  style: TextStyle(fontSize: 14.5, color: colors.onSurfaceMuted),
                ),
              ],
            ],
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

class _SpinnerButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool disabled;
  final VoidCallback onPressed;
  final InoPalette colors;

  const _SpinnerButton({
    required this.icon,
    required this.label,
    required this.disabled,
    required this.onPressed,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      enabled: !disabled,
      child: Opacity(
        opacity: disabled ? 0.5 : 1,
        child: Material(
          color: colors.surfaceRaised,
          borderRadius: BorderRadius.circular(4),
          child: InkWell(
            onTap: disabled ? null : onPressed,
            borderRadius: BorderRadius.circular(4),
            child: Container(
              width: 24,
              height: 18,
              decoration: BoxDecoration(
                border: Border.all(color: colors.border),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Icon(icon, size: 12, color: colors.onSurface),
            ),
          ),
        ),
      ),
    );
  }
}
