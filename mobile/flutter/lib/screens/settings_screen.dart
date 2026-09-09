import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/theme_controller.dart';
import '../theme/tokens.dart';
import '../widgets/screen_template.dart';

/// Settings / account template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row
/// 10. Grouped sections, list-row pattern inside each group. Real theme override control — the
/// one bit of live state this scaffold actually wires up, mirroring web's ThemeService toggle.
class SettingsScreen extends StatelessWidget {
  final ThemeController controller;

  const SettingsScreen({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final options = <(ThemeMode, String, IconData)>[
      (ThemeMode.system, 'System', LucideIcons.sunMoon),
      (ThemeMode.light, 'Light', LucideIcons.sun),
      (ThemeMode.dark, 'Dark', LucideIcons.moon),
    ];

    return ScreenTemplate(
      title: 'Settings',
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: InoSpace.s2),
              child: Text('APPEARANCE', style: Theme.of(context).textTheme.labelLarge),
            ),
            Container(
              decoration: BoxDecoration(
                color: colors.surfaceRaised,
                border: Border.all(color: colors.borderSoft),
                borderRadius: BorderRadius.circular(InoRadius.lg),
              ),
              child: Column(
                children: [
                  for (final (mode, label, icon) in options)
                    ListTile(
                      onTap: () => controller.setMode(mode),
                      minLeadingWidth: InoTarget.comfortable,
                      leading: Icon(icon, size: 20, color: colors.onSurfaceMuted),
                      title: Text(label, style: Theme.of(context).textTheme.bodyMedium),
                      trailing: controller.mode == mode
                          ? Icon(LucideIcons.chevronRight, size: 18, color: colors.accent)
                          : null,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
