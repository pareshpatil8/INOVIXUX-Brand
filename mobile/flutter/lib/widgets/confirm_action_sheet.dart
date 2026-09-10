import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Modal / bottom-sheet template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory
/// row 11 (confirm/delete, quick-create). `variant="overlay"`, `--ino-color-overlay-scrim`
/// backdrop — Flutter's `showModalBottomSheet` barrier already renders the scrim; we set its
/// color to [InoPalette.overlayScrim] explicitly rather than trust Material's default so it
/// matches tokens.css exactly in both themes. Not a nav destination — always dismissed back to
/// whatever screen presented it, never pushed onto the stack.
Future<bool?> showConfirmActionSheet(
  BuildContext context, {
  required String title,
  String? body,
  String confirmLabel = 'Delete',
  String cancelLabel = 'Cancel',
  bool destructive = true,
}) {
  final colors = context.inoColors;
  return showModalBottomSheet<bool>(
    context: context,
    barrierColor: colors.overlayScrim,
    backgroundColor: colors.surfaceRaised,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(InoRadius.xl)),
    ),
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(InoSpace.s5, InoSpace.s3, InoSpace.s5, InoSpace.s5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: InoSpace.s4),
                decoration: BoxDecoration(color: colors.borderSoft, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Text(title, style: Theme.of(sheetContext).textTheme.titleMedium),
            if (body != null) ...[
              const SizedBox(height: InoSpace.s2),
              Text(body, style: Theme.of(sheetContext).textTheme.bodyMedium),
            ],
            const SizedBox(height: InoSpace.s5),
            ElevatedButton(
              onPressed: () => Navigator.of(sheetContext).pop(true),
              style: destructive
                  ? ElevatedButton.styleFrom(
                      backgroundColor: colors.danger,
                      foregroundColor: colors.onDanger,
                      minimumSize: const Size.fromHeight(InoTarget.comfortable),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(InoRadius.md)),
                    )
                  : null,
              child: Text(confirmLabel),
            ),
            const SizedBox(height: InoSpace.s2),
            TextButton(
              onPressed: () => Navigator.of(sheetContext).pop(false),
              style: TextButton.styleFrom(minimumSize: const Size.fromHeight(InoTarget.comfortable)),
              child: Text(cancelLabel),
            ),
          ],
        ),
      ),
    ),
  );
}
