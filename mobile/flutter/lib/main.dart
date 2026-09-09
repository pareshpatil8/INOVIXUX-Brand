import 'package:flutter/material.dart';
import 'navigation/root_shell.dart';
import 'theme/app_theme.dart';
import 'theme/theme_controller.dart';
import 'theme/tokens.dart';

void main() {
  runApp(const InovixuxApp());
}

class InovixuxApp extends StatefulWidget {
  const InovixuxApp({super.key});

  @override
  State<InovixuxApp> createState() => _InovixuxAppState();
}

class _InovixuxAppState extends State<InovixuxApp> {
  final _themeController = ThemeController();

  @override
  void initState() {
    super.initState();
    _themeController.load();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _themeController,
      builder: (context, _) => MaterialApp(
        title: 'INOVIXUX',
        debugShowCheckedModeBanner: false,
        themeMode: _themeController.mode,
        theme: buildInoTheme(InoPalette.light, Brightness.light),
        darkTheme: buildInoTheme(InoPalette.dark, Brightness.dark),
        home: RootShell(themeController: _themeController),
      ),
    );
  }
}
