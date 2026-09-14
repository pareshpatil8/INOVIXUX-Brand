import 'package:flutter/material.dart';

import 'navigation/deep_link.dart';
import 'navigation/ino_router.dart';
import 'navigation/link_intake.dart';
import 'navigation/root_shell.dart';
import 'notifications/notification_center.dart';
import 'notifications/push_banner.dart';
import 'theme/app_theme.dart';
import 'theme/theme_controller.dart';
import 'theme/tokens.dart';

Future<void> main() async {
  // Required before any plugin channel call — `readInitialLink` below is one.
  WidgetsFlutterBinding.ensureInitialized();

  // Cold start, docs/brand/13-mobile-app-patterns.md §6.6: "Capture the link *before the first
  // screen paints*, hold on the platform splash while it resolves, then paint the resolved screen
  // with its parent stack already in place. Never paint Home and then navigate — the visible jump
  // is the tell that a deep link was bolted on afterwards."
  //
  // Awaiting here rather than in an initState is what makes that true: Flutter's native splash
  // stays up until the first frame, so this await *is* the hold.
  final initialLink = await InoLinkIntake.readInitialLink();

  runApp(InovixuxApp(initialLink: initialLink));
}

class InovixuxApp extends StatefulWidget {
  final InoDeepLink? initialLink;

  const InovixuxApp({super.key, this.initialLink});

  @override
  State<InovixuxApp> createState() => _InovixuxAppState();
}

class _InovixuxAppState extends State<InovixuxApp> {
  final _themeController = ThemeController();
  AppLifecycleListener? _lifecycle;

  @override
  void initState() {
    super.initState();
    _themeController.load();

    // Warm start (§6.6): links arriving while the app is running resolve onto the existing
    // navigation state.
    InoLinkIntake.start();

    // §6.3's surface decision is made by app state, not by notification content — so app state
    // has to be observed. Foreground → in-app banner; background/killed → system tray.
    _lifecycle = AppLifecycleListener(
      onStateChange: (state) {
        InoNotificationCenter.instance.appIsBackgrounded =
            state != AppLifecycleState.resumed;
      },
    );
  }

  @override
  void dispose() {
    _lifecycle?.dispose();
    InoLinkIntake.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _themeController,
      builder: (context, _) => MaterialApp(
        title: 'INOVIXUX',
        debugShowCheckedModeBanner: false,
        themeMode: _themeController.materialMode,
        theme: buildInoTheme(InoPalette.light, Brightness.light),
        darkTheme: buildInoTheme(
          _themeController.mode == InoThemeMode.highContrast
              ? InoPalette.highContrast : InoPalette.dark,
          Brightness.dark,
        ),
        // Root navigator: hosts the shell, plus the pre-tab-bar auth stack pushed above it
        // (`/sign-in`, `/forgot-password` — the same two-branch split `app.routes.ts` uses on the
        // Capacitor track).
        navigatorKey: InoRouter.rootNavigatorKey,
        onGenerateRoute: InoRouter.generateRootRoute,
        // The in-app banner (§6.3.1) is mounted above every screen but below the root navigator's
        // own overlays, so it can appear over any tab without being torn down by navigation.
        home: InoNotificationHost(
          child: RootShell(
            themeController: _themeController,
            initialLink: widget.initialLink,
          ),
        ),
      ),
    );
  }
}
