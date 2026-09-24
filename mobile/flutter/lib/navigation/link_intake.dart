import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

import 'deep_link.dart';
import 'ino_router.dart';

/// Link intake — the `app_links` half of docs/brand/13-mobile-app-patterns.md §6.6's Flutter row,
/// INO-112. Deliberately thin: every rule about *what a link means* lives in `deep_link.dart`,
/// every rule about *where it lands* lives in `ino_router.dart`. This file only decides when to
/// ask the OS.
///
/// What actually arrives today: `inovixux://` custom-scheme links only. The
/// `https://app.inovixux.com/...` form parses correctly (see [resolveInoDeepLink]) but the OS will
/// never hand it to the app until that host serves an Apple App Site Association file and an
/// Android `assetlinks.json` — §6.7 item 2, tracked separately. Nothing here needs to change when
/// it does; the two forms already resolve through the same grammar.
///
/// Native manifest entries are NOT in this repo: neither `android/` nor `ios/` exists on this
/// track yet (`flutter create .` has not been run — see the app-icon note in `pubspec.yaml`).
/// When they are generated, the custom scheme needs:
///   - Android — an `<intent-filter>` on the launch activity with
///     `<data android:scheme="inovixux" />`, `VIEW` action, `DEFAULT` + `BROWSABLE` categories.
///   - iOS — a `CFBundleURLTypes` entry in `Info.plist` with `CFBundleURLSchemes = ["inovixux"]`.
/// Without those the stream below is simply never fed; it does not error, which is exactly the
/// failure mode to expect if a link "does nothing" on device.
class InoLinkIntake {
  InoLinkIntake._();

  static final AppLinks _appLinks = AppLinks();
  static StreamSubscription<Uri>? _subscription;

  /// Cold start (§6.6): read the launch link *before the first frame*, so the resolved screen can
  /// be painted with its parent stack already in place. Flutter's native splash stays up until the
  /// first frame renders, which is precisely the "hold on the platform splash while it resolves"
  /// behaviour the spec asks for — as long as this is awaited in `main()` before `runApp`, and not
  /// in an `initState` after the tree is already mounted. Painting Home and then navigating is the
  /// visible jump §6.6 calls "the tell that a deep link was bolted on afterwards".
  ///
  /// Returns null on any failure. A missing platform implementation (desktop, tests, or a build
  /// where the manifest entries above are absent) must not stop the app from launching.
  static Future<InoDeepLink?> readInitialLink() async {
    try {
      final uri = await _appLinks.getInitialLink();
      if (uri == null) return null;
      return resolveInoDeepLink(uri);
    } catch (error, stack) {
      debugPrint('InoLinkIntake: initial link read failed — $error\n$stack');
      return null;
    }
  }

  /// Warm start (§6.6): links that arrive while the app is already running resolve onto the
  /// existing navigation state. Safe to call more than once — re-subscribing cancels first.
  static void start() {
    _subscription?.cancel();
    _subscription = _appLinks.uriLinkStream.listen(
      (uri) => InoRouter.open(resolveInoDeepLink(uri)),
      onError: (Object error) => debugPrint('InoLinkIntake: link stream error — $error'),
    );
  }

  static Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
  }
}
