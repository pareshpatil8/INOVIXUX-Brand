import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/screen_template.dart';

/// Auth / onboarding template — screen inventory row 4 (Forgot/reset password). Stack push from
/// [SignInScreen], not a tab, per docs/brand/15-mobile-screen-inventory.md row 4. Single field +
/// a confirmation state, same 44px targets / display-sm headline contract as sign-in.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _sent = false;

  @override
  Widget build(BuildContext context) {
    return ScreenTemplate(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: InoSpace.s6),
          Text('Reset password', style: Theme.of(context).textTheme.displaySmall),
          const SizedBox(height: InoSpace.s2),
          Text(
            _sent
                ? 'Check your inbox for a reset link.'
                : "Enter the email on your account and we'll send a reset link.",
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: InoSpace.s7),
          if (!_sent) ...[
            Text('EMAIL', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: InoSpace.s2),
            TextField(controller: _email, keyboardType: TextInputType.emailAddress),
            const SizedBox(height: InoSpace.s5),
            ElevatedButton(
              onPressed: () => setState(() => _sent = true),
              child: const Text('Send reset link'),
            ),
          ] else
            OutlinedButton(
              onPressed: () => Navigator.of(context).maybePop(),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(InoTarget.comfortable)),
              child: const Text('Back to sign in'),
            ),
        ],
      ),
    );
  }
}
