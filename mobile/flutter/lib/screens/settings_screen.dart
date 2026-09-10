import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/theme_controller.dart';
import '../theme/tokens.dart';
import '../widgets/screen_template.dart';
import 'error_offline_screen.dart';
import 'onboarding_screen.dart';
import 'sign_in_screen.dart';

/// Settings / account template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row
/// 10. Grouped sections, list-row pattern inside each group. Real theme override control — the
/// one bit of live state this scaffold actually wires up, mirroring web's ThemeService toggle.
/// A second "Preview" section links to the templates that don't have a natural in-app entry
/// point yet (auth/onboarding lives pre-tab-bar, in a real app behind a signed-out state this
/// scaffold doesn't model) — kept reachable so every screen in the inventory is a real, running
/// widget, not just a file on disk.
class SettingsScreen extends StatelessWidget {
  final ThemeController controller;

  const SettingsScreen({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final options = <(InoThemeMode, String, IconData)>[
      (InoThemeMode.system, 'System', LucideIcons.sunMoon),
      (InoThemeMode.light, 'Light', LucideIcons.sun),
      (InoThemeMode.dark, 'Dark', LucideIcons.moon),
      (InoThemeMode.highContrast, 'High contrast', LucideIcons.sunMoon),
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
                      selected: controller.mode == mode,
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
            const SizedBox(height: InoSpace.s6),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: InoSpace.s2),
              child: Text('PREVIEW', style: Theme.of(context).textTheme.labelLarge),
            ),
            Container(
              decoration: BoxDecoration(
                color: colors.surfaceRaised,
                border: Border.all(color: colors.borderSoft),
                borderRadius: BorderRadius.circular(InoRadius.lg),
              ),
              child: Column(
                children: [
                  for (final (label, icon, builder) in <(String, IconData, WidgetBuilder)>[
                    ('Onboarding', LucideIcons.layoutGrid, (_) => const OnboardingScreen()),
                    ('Sign in', LucideIcons.logIn, (_) => const SignInScreen()),
                    ('Error / offline state', LucideIcons.wifiOff, (_) => const ErrorOfflineScreen()),
                  ])
                    ListTile(
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: builder)),
                      minLeadingWidth: InoTarget.comfortable,
                      leading: Icon(icon, size: 20, color: colors.onSurfaceMuted),
                      title: Text(label, style: Theme.of(context).textTheme.bodyMedium),
                      trailing: Icon(LucideIcons.chevronRight, size: 18, color: colors.onSurfaceMuted),
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
