import 'package:flutter/widgets.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `<InoIftaLabel>` — Flutter port of `<ino-ifta-label>`
/// (web/src/app/components/iftalabel, INO-142 / INO-31 T-20).
///
/// Unlike `InoFloatLabel` (a real, stateful `StatefulWidget` driven by a `FocusNode`/
/// `TextEditingController`, see that widget's own doc comment), this port is deliberately
/// **stateless**: the web component has no rest/floated toggle either — PrimeNG's `IftaLabel`
/// ships one permanently-docked style, not an animated one (`ino-iftalabel.component.ts`'s own doc
/// comment) — so there is no focus/value transition for a `StatefulWidget` to own here.
///
/// ```dart
/// InoIftaLabel(
///   label: 'Username',
///   child: TextField(),
/// )
/// ```
class InoIftaLabel extends StatelessWidget {
  final String label;
  final InoControlSize size;
  final bool disabled;
  final bool invalid;
  final bool readOnly;
  final Widget child;

  const InoIftaLabel({
    super.key,
    required this.label,
    required this.child,
    this.size = InoControlSize.standard,
    this.disabled = false,
    this.invalid = false,
    this.readOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;

    // readOnly has no distinct colour here (unlike `InoLabel`'s onSurface -> onSurfaceMuted
    // step): the docked label is already onSurfaceMuted at rest (ino-label.component.scss
    // `--ino-color-label-muted`), so readOnly is a no-op visually — accepted purely to keep the
    // prop surface 1:1 with the web component's `readonly` -> internal `<ino-label>` forward.
    final color = disabled
        ? colors.onSurfaceSubtle
        : invalid
            ? colors.dangerTextSafe
            : colors.onSurfaceMuted;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        // Permanently reserves the docked label's space — the Flutter equivalent of the web
        // component's unconditional Renderer2 padding-block-start bump
        // (ino-iftalabel.component.ts). Contrast ino_float_label.dart, which only reserves this
        // space for its docked (`in`/`on`) variants.
        Padding(
          padding: const EdgeInsets.only(top: InoSpace.s3),
          child: child,
        ),
        // `Positioned.directional(start:, textDirection:)`, not `Positioned(left:)` — Flutter
        // resolves this against the ambient `Directionality` automatically (same fix
        // `ino_toggle.dart`'s thumb alignment uses), so the docked label mirrors to the trailing
        // edge under RTL.
        Positioned.directional(
          textDirection: Directionality.of(context),
          start: InoSpace.s4,
          top: InoSpace.s2,
          child: IgnorePointer(
            child: Text(
              label,
              style: TextStyle(fontSize: 12, height: 1.4, color: color),
            ),
          ),
        ),
      ],
    );
  }
}
