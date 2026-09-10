import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/screen_template.dart';

/// Auth / onboarding template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row 2
/// ("1–3 steps"). Same template family as [SignInScreen]/forgot-password: single-column shell,
/// `--ino-type-display-size-sm` headline, `--ino-target-comfortable` (44px) on every control.
/// Pre-tab-bar, own stack — not part of [RootShell]'s bottom nav.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingStep {
  final IconData icon;
  final String headline;
  final String body;
  const _OnboardingStep({required this.icon, required this.headline, required this.body});
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  static const _steps = [
    _OnboardingStep(
      icon: LucideIcons.shieldCheck,
      headline: 'Verified by design',
      body: 'Every action carries the same verified-node mark you see across INOVIXUX.',
    ),
    _OnboardingStep(
      icon: LucideIcons.layoutGrid,
      headline: 'One system, everywhere',
      body: 'The same tokens and components you know from web, native on mobile.',
    ),
    _OnboardingStep(
      icon: LucideIcons.moon,
      headline: 'Dark by default',
      body: 'Follows your system appearance, with a manual override anytime in Settings.',
    ),
  ];

  final _controller = PageController();
  int _page = 0;

  void _next() {
    if (_page == _steps.length - 1) {
      Navigator.of(context).maybePop();
      return;
    }
    _controller.nextPage(duration: InoMotion.base, curve: InoMotion.easingStandard);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final isLast = _page == _steps.length - 1;

    return ScreenTemplate(
      scroll: false,
      actions: [
        if (!isLast)
          TextButton(
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('Skip'),
          ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: _steps.length,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (context, i) {
                final step = _steps[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: InoSpace.s5),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(step.icon, size: 32, color: colors.accent),
                      const SizedBox(height: InoSpace.s6),
                      Text(step.headline, style: Theme.of(context).textTheme.displaySmall, textAlign: TextAlign.center),
                      const SizedBox(height: InoSpace.s3),
                      Text(step.body, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
                    ],
                  ),
                );
              },
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < _steps.length; i++)
                AnimatedContainer(
                  duration: InoMotion.fast,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _page ? 20 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i == _page ? colors.accent : colors.borderSoft,
                    borderRadius: BorderRadius.circular(InoRadius.pill),
                  ),
                ),
            ],
          ),
          const SizedBox(height: InoSpace.s5),
          Padding(
            padding: const EdgeInsets.fromLTRB(InoSpace.s5, 0, InoSpace.s5, InoSpace.s5),
            child: ElevatedButton(
              onPressed: _next,
              child: Text(isLast ? 'Get started' : 'Next'),
            ),
          ),
        ],
      ),
    );
  }
}
