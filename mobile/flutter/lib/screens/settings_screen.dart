import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../navigation/deep_link.dart';
import '../notifications/notification_category.dart';
import '../notifications/notification_glyphs.dart';
import '../notifications/notification_center.dart';
import '../theme/app_theme.dart';
import '../theme/theme_controller.dart';
import '../theme/tokens.dart';
import '../widgets/screen_template.dart';

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
                  // Named routes now (INO-112) — these three live on the ROOT navigator, above
                  // the tab shell, because `/sign-in` and friends are the pre-tab-bar auth stack.
                  // `rootNavigator: true` is what sends them there instead of into the Settings
                  // tab's own stack, where they would render under the tab bar.
                  for (final (label, icon, route) in <(String, IconData, String)>[
                    ('Onboarding', LucideIcons.layoutGrid, '/onboarding'),
                    ('Sign in', LucideIcons.logIn, InoPaths.signIn),
                    ('Error / offline state', LucideIcons.wifiOff, '/error-offline'),
                  ])
                    ListTile(
                      onTap: () =>
                          Navigator.of(context, rootNavigator: true).pushNamed(route),
                      minLeadingWidth: InoTarget.comfortable,
                      leading: Icon(icon, size: 20, color: colors.onSurfaceMuted),
                      title: Text(label, style: Theme.of(context).textTheme.bodyMedium),
                      trailing: Icon(LucideIcons.chevronRight, size: 18, color: colors.onSurfaceMuted),
                    ),
                ],
              ),
            ),
            const SizedBox(height: InoSpace.s6),
            const _PushSimulatorSection(),
          ],
        ),
      ),
    );
  }
}

/// Local push simulator — INO-112.
///
/// Not a product feature and not a transport. There is no APNs/FCM credential, no device-token
/// registration and no server that sends (13-mobile-app-patterns.md §6.7 item 1), so the §6.3
/// surface rules, the §6.3.1 banner and the §6.2 badges would otherwise be unreachable code that
/// nobody could look at. This fires the same [InoNotificationCenter.receive] path a real transport
/// adapter will call, with a locally-built payload.
///
/// When the transport lands, this section should be deleted, not extended — the adapter replaces
/// the trigger, and `receive()` stays exactly as it is.
class _PushSimulatorSection extends StatelessWidget {
  const _PushSimulatorSection();

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;

    // One per category (§6.4), each with a deep link (§6.5) so the tap-through is exercised too.
    // `critical` is the §6.3 sheet case, not a banner — presented blocking, no auto-dismiss.
    const samples = <(InoNotificationCategory, String, String, String)>[
      (InoNotificationCategory.info, 'Weekly digest ready', 'Three items changed this week.', 'inovixux:///notifications'),
      (InoNotificationCategory.success, 'Submission approved', 'Sample item one passed review.', 'inovixux:///home/1'),
      (InoNotificationCategory.warning, 'Document expiring', 'Renew within 14 days.', 'inovixux:///home/2'),
      (InoNotificationCategory.critical, 'Session expired', 'Sign in again to continue.', 'inovixux:///sign-in'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: InoSpace.s2),
          child: Text('PUSH SIMULATOR (LOCAL)', style: Theme.of(context).textTheme.labelLarge),
        ),
        Container(
          decoration: BoxDecoration(
            color: colors.surfaceRaised,
            border: Border.all(color: colors.borderSoft),
            borderRadius: BorderRadius.circular(InoRadius.lg),
          ),
          child: Column(
            children: [
              for (final (category, title, body, link) in samples)
                ListTile(
                  onTap: () => InoNotificationCenter.instance.receive(
                    InoNotification.fromPayload({
                      'id': '${category.name}-${title.hashCode}',
                      'category': category.name,
                      'title': title,
                      'body': body,
                      'link': link,
                    }),
                  ),
                  minLeadingWidth: InoTarget.comfortable,
                  leading: Icon(category.glyph, size: 20, color: category.tint(colors)),
                  title: Text(title, style: Theme.of(context).textTheme.bodyMedium),
                  subtitle: Text(link, style: Theme.of(context).textTheme.bodySmall),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
