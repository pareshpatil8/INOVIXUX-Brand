import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoCardVariant { standard, sunken, overlay }

enum InoCardPadding { sm, md, lg }

double _bodyPadding(InoCardPadding padding) {
  switch (padding) {
    case InoCardPadding.sm:
      return InoSpace.s4;
    case InoCardPadding.md:
      return InoSpace.s6;
    case InoCardPadding.lg:
      return InoSpace.s8;
  }
}

/// `<InoCard>` — Flutter port of `<ino-card>` (web/src/app/components/card, INO-161 / INO-31
/// U-6). `standard` — not `default` — names the base variant because `default` is a reserved
/// word in Dart, the same reserved-word rename `InoControlSize.standard` already makes for
/// `size="default"` (tokens.dart's own note on that).
///
/// Deviation from the web component's "caller owns the interactive element" contract: Flutter
/// has no equivalent of wrapping a styled shell in a caller-supplied element, so when [onTap] is
/// supplied this widget itself becomes the tappable surface and owns the `button` semantic —
/// unlike web, where `interactive` only ever supplies the visual state.
///
/// No shadow/elevation is rendered — `theme/tokens.dart` ports no elevation tokens (mirrors the
/// same gap `theme/tokens.ts` notes on the React Native side); `InoCardVariant.overlay` only
/// differentiates by not being `sunken`, it does not gain a heavier shadow the way web's
/// `--ino-elevation-2` does.
///
/// [loading] is conveyed visually only (dimmed body + spinner) — this Flutter SDK's `Semantics`
/// widget has no `busy` flag to reflect web's `aria-busy`/RN's `accessibilityState.busy`.
class InoCard extends StatelessWidget {
  final InoCardVariant variant;

  /// Body content padding — independent of [size] below. Mirrors web's `padding` @Input; see
  /// web/src/app/components/card/SPEC.md §3 for why the two stay separate.
  final InoCardPadding padding;

  /// Sizes the header/footer bars only (control-size scale).
  final InoControlSize size;

  /// Full-bleed slot above the header, clipped to the card's own corner radius. Sizing (e.g. a
  /// fixed height on an `Image`) is caller-owned, same as the RN port.
  final Widget? media;

  /// Title/eyebrow bar.
  final Widget? header;

  /// Actions bar.
  final Widget? footer;

  final Widget? child;
  final bool disabled;
  final bool loading;
  final VoidCallback? onTap;
  final String? semanticLabel;

  const InoCard({
    super.key,
    this.variant = InoCardVariant.standard,
    this.padding = InoCardPadding.md,
    this.size = InoControlSize.standard,
    this.media,
    this.header,
    this.footer,
    this.child,
    this.disabled = false,
    this.loading = false,
    this.onTap,
    this.semanticLabel,
  });

  bool get _interactive => onTap != null;
  bool get _isInteractive => _interactive && !disabled && !loading;

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final background = variant == InoCardVariant.sunken ? colors.surfaceSunken : colors.surfaceRaised;

    final sections = <Widget>[
      if (media != null) media!,
      if (header != null)
        Container(
          padding: EdgeInsets.symmetric(
            horizontal: size.paddingInlineRoomy,
            vertical: size.paddingInlineRoomy,
          ),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: colors.borderSoft)),
          ),
          child: header,
        ),
      Stack(
        children: [
          Padding(
            padding: EdgeInsets.all(_bodyPadding(padding)),
            child: Opacity(opacity: loading ? 0.5 : 1, child: child ?? const SizedBox.shrink()),
          ),
          // Static ring, not an animated spinner — same scope call InoRadio/InoTag's Flutter
          // ports already made.
          if (loading)
            Positioned.fill(
              child: Center(
                child: SizedBox(
                  width: size.iconSize,
                  height: size.iconSize,
                  child: CircularProgressIndicator(strokeWidth: 2, color: colors.onSurfaceMuted),
                ),
              ),
            ),
        ],
      ),
      if (footer != null)
        Container(
          padding: EdgeInsets.symmetric(
            horizontal: size.paddingInlineRoomy,
            vertical: size.paddingInlineRoomy,
          ),
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: colors.borderSoft)),
          ),
          child: footer,
        ),
    ];

    final shell = Opacity(
      opacity: disabled ? 0.5 : 1,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(InoRadius.xl),
        child: Container(
          decoration: BoxDecoration(
            color: background,
            border: Border.all(color: colors.border),
            borderRadius: BorderRadius.circular(InoRadius.xl),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: sections),
        ),
      ),
    );

    if (!_interactive) {
      return Semantics(
        label: semanticLabel,
        container: semanticLabel != null,
        child: shell,
      );
    }

    return Semantics(
      label: semanticLabel,
      button: true,
      enabled: _isInteractive,
      child: GestureDetector(
        onTap: _isInteractive ? onTap : null,
        child: shell,
      ),
    );
  }
}
