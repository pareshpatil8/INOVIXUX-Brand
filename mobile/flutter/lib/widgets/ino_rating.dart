import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoRatingSize { sm, md, lg }

/// `<InoRating>` — Flutter port of `<ino-rating>` (web/src/app/components/rating, INO-471 /
/// INO-31 B5). Doc 26 §5 row disposition: "Port both".
///
/// A row of tappable star glyphs: tapping star *N* sets [value] to `N`, filling every star up to
/// that index — the same "radio per star" selection model the web component uses, expressed here
/// as a plain tap handler (there is no Flutter radiogroup primitive worth wrapping for five
/// glyphs). `cancelable` mirrors the web clear/cancel toggle: tapping the already-selected star
/// clears [value] to `0`. Hover-preview is web-only (touch has no hover) — see SPEC.md §9/the
/// docs page's Mobile parity section.
class InoRating extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? error;
  final InoRatingSize size;
  final int count;
  final String iconFilled;
  final String iconEmpty;
  final bool cancelable;
  final bool disabled;
  final bool readonly;
  final int value;
  final ValueChanged<int>? onValueChange;

  const InoRating({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.size = InoRatingSize.md,
    this.count = 5,
    this.iconFilled = '★',
    this.iconEmpty = '☆',
    this.cancelable = false,
    this.disabled = false,
    this.readonly = false,
    required this.value,
    this.onValueChange,
  });

  bool get _isInteractive => !disabled && !readonly;

  double get _starSize {
    switch (size) {
      case InoRatingSize.sm:
        return 20;
      case InoRatingSize.lg:
        return 32;
      case InoRatingSize.md:
        return 24;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final invalid = error != null && error!.isNotEmpty;

    final stars = Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (i) {
        final star = i + 1;
        final filled = star <= value;
        return Semantics(
          label: '$star ${star == 1 ? 'star' : 'stars'}',
          selected: star == value,
          button: true,
          enabled: _isInteractive,
          child: GestureDetector(
            onTap: _isInteractive
                ? () => onValueChange?.call(cancelable && star == value ? 0 : star)
                : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: InoSpace.s1),
              child: Text(
                filled ? iconFilled : iconEmpty,
                style: TextStyle(
                  fontSize: _starSize,
                  color: filled ? colors.warning : colors.onSurfaceMuted,
                ),
              ),
            ),
          ),
        );
      }),
    );

    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Semantics(
        label: label,
        enabled: _isInteractive,
        readOnly: readonly,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (label != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  label!,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: disabled ? colors.onSurfaceMuted : colors.onSurface,
                  ),
                ),
              ),
            Container(
              decoration: invalid
                  ? BoxDecoration(
                      border: Border.all(color: colors.danger, width: InoBorderWidth.hairline),
                      borderRadius: BorderRadius.circular(InoRadius.sm),
                    )
                  : null,
              padding: invalid ? const EdgeInsets.all(4) : EdgeInsets.zero,
              child: stars,
            ),
            if (invalid)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(error!, style: TextStyle(fontSize: 12.5, color: colors.danger, fontWeight: FontWeight.w600)),
              )
            else if (hint != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(hint!, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
              ),
          ],
        ),
      ),
    );
  }
}
