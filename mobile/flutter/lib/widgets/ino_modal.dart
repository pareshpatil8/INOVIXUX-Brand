import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `standard`, not `default` — `default` is a reserved word in Dart, same rename
/// [InoControlSize.standard] already makes.
enum InoModalSize { sm, standard, lg }

const Map<InoModalSize, double> _panelMaxWidth = {
  InoModalSize.sm: 360,
  InoModalSize.standard: 480,
  InoModalSize.lg: 720,
};

/// `showInoModal` — Flutter port of `<ino-modal>` (web/src/app/components/modal, INO-162 /
/// INO-31 U-7). Real port of the base dialog: `size` and backdrop/back-gesture dismissal. Does
/// **not** carry a maximize or drag surface — both are desktop-idiom affordances with no mobile
/// counterpart; full reasoning in web/src/app/components/modal/SPEC.md §4. Distinct from
/// `showConfirmActionSheet` (a bottom sheet, a different pattern for the confirm/delete
/// template) — this is the general centered-dialog primitive that sheet is not.
///
/// Focus containment: `showDialog` already scopes focus via Flutter's own `FocusScope` for the
/// lifetime of the route, the same platform-native equivalent `focus-trap/SPEC.md` §5 already
/// decided web's `[inoFocusTrap]` would not try to replace on this track. The Android back
/// gesture / button pops the dialog route by default (`barrierDismissible` below governs both
/// the backdrop tap and, via `PopScope` semantics `showDialog` already wires up, the back
/// gesture) — this platform's direct equivalent of the web component's `Escape` handling.
Future<void> showInoModal(
  BuildContext context, {
  String? heading,
  InoModalSize size = InoModalSize.standard,
  bool closeOnBackdrop = true,
  required WidgetBuilder bodyBuilder,
  WidgetBuilder? footerBuilder,
}) {
  final colors = context.inoColors;
  return showDialog<void>(
    context: context,
    barrierDismissible: closeOnBackdrop,
    barrierColor: colors.overlayScrim,
    builder: (dialogContext) => Dialog(
      backgroundColor: colors.surfaceRaised,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(InoRadius.xl)),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: _panelMaxWidth[size]!),
        child: Padding(
          padding: const EdgeInsets.all(InoSpace.s6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (heading != null)
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(heading, style: Theme.of(dialogContext).textTheme.titleMedium),
                      ),
                    ),
                  SizedBox(
                    width: InoTarget.comfortable,
                    height: InoTarget.comfortable,
                    child: IconButton(
                      onPressed: () => Navigator.of(dialogContext).pop(),
                      icon: const Icon(Icons.close),
                      tooltip: 'Close dialog',
                      color: colors.onSurfaceMuted,
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: InoSpace.s4),
              Flexible(child: bodyBuilder(dialogContext)),
              if (footerBuilder != null) ...[
                const SizedBox(height: InoSpace.s5),
                footerBuilder(dialogContext),
              ],
            ],
          ),
        ),
      ),
    ),
  );
}
