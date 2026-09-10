import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Shared screen shell — every screen in lib/screens/ renders inside this, so the safe-area /
/// fluid-density / surface-color contract only has to be gotten right once. `SafeArea` covers
/// the safe-area-inset tokens (tokens.css §11) natively in Flutter.
/// Maps to docs/brand/13-mobile-app-patterns.md §2 "structural, token-mapped" screen templates.
class ScreenTemplate extends StatelessWidget {
  final String? title;
  final Widget child;
  final bool scroll;

  /// Trailing header actions (e.g. a search icon button) — kept optional and generic rather than
  /// a full AppBar, since most screens in this scaffold don't need one. Each action still needs
  /// to carry its own `--ino-target-comfortable` (44px) hit area; see [ScreenIconAction].
  final List<Widget> actions;

  const ScreenTemplate({
    super.key,
    this.title,
    required this.child,
    this.scroll = true,
    this.actions = const [],
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final body = scroll
        ? SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(InoSpace.s5, 0, InoSpace.s5, InoSpace.s9),
            child: child,
          )
        : Padding(padding: const EdgeInsets.symmetric(horizontal: InoSpace.s5), child: child);

    return Container(
      color: colors.surface,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null || actions.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(InoSpace.s5, InoSpace.s4, InoSpace.s5, InoSpace.s3),
                child: Row(
                  children: [
                    if (title != null)
                      Expanded(child: Text(title!, style: Theme.of(context).textTheme.headlineMedium)),
                    ...actions,
                  ],
                ),
              ),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

/// A single tappable header action — 44px hit area (`InoTarget.comfortable`) around a Lucide
/// icon, per `--ino-target-comfortable`. Used for things like [ScreenTemplate]'s search action.
class ScreenIconAction extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  const ScreenIconAction({super.key, required this.icon, required this.tooltip, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    return IconButton(
      icon: Icon(icon, color: colors.onSurface),
      tooltip: tooltip,
      onPressed: onPressed,
      constraints: const BoxConstraints(minWidth: InoTarget.comfortable, minHeight: InoTarget.comfortable),
    );
  }
}
