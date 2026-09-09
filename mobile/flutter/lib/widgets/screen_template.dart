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

  const ScreenTemplate({super.key, this.title, required this.child, this.scroll = true});

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
            if (title != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(InoSpace.s5, InoSpace.s4, InoSpace.s5, InoSpace.s3),
                child: Text(title!, style: Theme.of(context).textTheme.headlineMedium),
              ),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}
