import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Empty state / error-offline template — docs/brand/13-mobile-app-patterns.md §2 row "Empty
/// state" + docs/brand/15-mobile-screen-inventory.md rows 12/13. Icon set: Lucide
/// (docs/brand/14-icon-system.md), 32px row, on-surface-muted by default.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String headline;
  final String? body;
  final String? ctaLabel;
  final VoidCallback? onPressCta;

  const EmptyState({
    super.key,
    this.icon = LucideIcons.inbox,
    required this.headline,
    this.body,
    this.ctaLabel,
    this.onPressCta,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: InoSpace.s6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 32, color: colors.onSurfaceMuted),
            const SizedBox(height: InoSpace.s3),
            Text(headline, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
            if (body != null) ...[
              const SizedBox(height: InoSpace.s2),
              Text(body!, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
            ],
            if (ctaLabel != null && onPressCta != null) ...[
              const SizedBox(height: InoSpace.s2),
              ElevatedButton(onPressed: onPressCta, child: Text(ctaLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}
