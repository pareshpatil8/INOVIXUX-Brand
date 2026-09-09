import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/screen_template.dart';

/// Auth / onboarding template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory rows
/// 3 (Sign in/Sign up) and 4 (Forgot/reset password, pushed from here — not yet added).
/// Single-column form shell, `--ino-target-comfortable` (44px) on every input/button, display-sm
/// (38px) headline, not the 56px desktop size.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    return ScreenTemplate(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: InoSpace.s6),
          Text('Sign in', style: Theme.of(context).textTheme.displaySmall),
          const SizedBox(height: InoSpace.s2),
          Text(
            'Welcome back — enter your details to continue.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: InoSpace.s7),
          Text('EMAIL', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: InoSpace.s2),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress),
          const SizedBox(height: InoSpace.s4),
          Text('PASSWORD', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: InoSpace.s2),
          TextField(controller: _password, obscureText: true),
          const SizedBox(height: InoSpace.s5),
          ElevatedButton(onPressed: () {}, child: const Text('Continue')),
          const SizedBox(height: InoSpace.s2),
          TextButton(
            onPressed: () {},
            style: TextButton.styleFrom(minimumSize: const Size.fromHeight(InoTarget.comfortable)),
            child: Text('Forgot password?', style: TextStyle(color: colors.accentTextSafe)),
          ),
        ],
      ),
    );
  }
}
