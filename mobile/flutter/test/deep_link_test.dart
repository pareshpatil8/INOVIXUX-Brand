import 'package:flutter_test/flutter_test.dart';
import 'package:inovixux_mobile/navigation/deep_link.dart';
import 'package:inovixux_mobile/notifications/notification_category.dart';

/// Grammar tests for docs/brand/13-mobile-app-patterns.md §6.5 / §6.6 (INO-112).
///
/// This grammar is a cross-track contract, not a Flutter detail: §6.5 requires that "one link
/// string must resolve to the same screen on all three tracks, or the link can't be put in a
/// notification payload at all". These cases are therefore written as assertions about the *spec*,
/// and the React Native and Capacitor tracks assert the same table in their own suites.
void main() {
  group('§6.5 path grammar', () {
    test('resolves every row of the path table', () {
      expect(resolveInoDeepLinkString('inovixux:///home').pattern, InoPaths.home);
      expect(resolveInoDeepLinkString('inovixux:///home/42').pattern, InoPaths.detail);
      expect(resolveInoDeepLinkString('inovixux:///search').pattern, InoPaths.search);
      expect(resolveInoDeepLinkString('inovixux:///notifications').pattern, InoPaths.notifications);
      expect(resolveInoDeepLinkString('inovixux:///settings').pattern, InoPaths.settings);
      expect(resolveInoDeepLinkString('inovixux:///sign-in').pattern, InoPaths.signIn);
      expect(resolveInoDeepLinkString('inovixux:///forgot-password').pattern,
          InoPaths.forgotPassword);
    });

    test('accepts both spellings of the custom scheme', () {
      // `inovixux://home/42` (host-form) and `inovixux:///home/42` (path-form) are the same link.
      expect(resolveInoDeepLinkString('inovixux://home/42').path, '/home/42');
      expect(resolveInoDeepLinkString('inovixux:///home/42').path, '/home/42');
      expect(resolveInoDeepLinkString('inovixux://settings').pattern, InoPaths.settings);
    });

    test('accepts the Universal Link form on the same paths', () {
      final link = resolveInoDeepLinkString('https://app.inovixux.com/home/42');
      expect(link.pattern, InoPaths.detail);
      expect(link.detailId, '42');
    });

    test('rejects an https link for a host that is not ours', () {
      // An in-app webview or a foreign Intent can hand the app any https URL at all.
      expect(resolveInoDeepLinkString('https://evil.example.com/home/42').recognised, isFalse);
      expect(resolveInoDeepLinkString('https://evil.example.com/home/42').path, InoPaths.home);
    });

    test('unknown path falls through to Home, silently', () {
      for (final raw in [
        'inovixux:///nope',
        'inovixux:///home/42/extra',
        'inovixux:///settings/deep',
        'mailto:hello@inovixux.com',
        '',
        '::::',
      ]) {
        final link = resolveInoDeepLinkString(raw);
        expect(link.path, InoPaths.home, reason: 'unknown link "$raw" must resolve to Home');
        expect(link.recognised, isFalse, reason: '"$raw" should be flagged unrecognised');
      }
    });

    test('carries the auth flag from the table', () {
      expect(resolveInoDeepLinkString('inovixux:///home').requiresAuth, isTrue);
      expect(resolveInoDeepLinkString('inovixux:///notifications').requiresAuth, isTrue);
      expect(resolveInoDeepLinkString('inovixux:///sign-in').requiresAuth, isFalse);
      expect(resolveInoDeepLinkString('inovixux:///forgot-password').requiresAuth, isFalse);
    });

    test('preserves the query string — /forgot-password is the reset-token landing', () {
      final link = resolveInoDeepLinkString('https://app.inovixux.com/forgot-password?token=abc123');
      expect(link.pattern, InoPaths.forgotPassword);
      expect(link.query['token'], 'abc123');
    });

    test('decodes an encoded detail id', () {
      expect(resolveInoDeepLinkString('inovixux:///home/a%2Fb').detailId, 'a/b');
    });
  });

  group('§6.6 parent chain', () {
    test('Detail synthesizes Home beneath it — Detail → Home → exit, never Detail → exit', () {
      expect(resolveInoDeepLinkString('inovixux:///home/42').stack, ['/home', '/home/42']);
    });

    test('Search sits in the Home stack, matching React Navigation nesting', () {
      expect(resolveInoDeepLinkString('inovixux:///search').stack, ['/home', '/search']);
    });

    test('tab roots are their own chain', () {
      expect(resolveInoDeepLinkString('inovixux:///home').stack, ['/home']);
      expect(resolveInoDeepLinkString('inovixux:///notifications').stack, ['/notifications']);
      expect(resolveInoDeepLinkString('inovixux:///settings').stack, ['/settings']);
    });

    test('forgot-password returns to sign-in, not out of the app', () {
      expect(resolveInoDeepLinkString('inovixux:///forgot-password').stack,
          ['/sign-in', '/forgot-password']);
    });

    test('owning tab drives the warm-start tab switch', () {
      expect(resolveInoDeepLinkString('inovixux:///home/42').tab, InoTab.home);
      expect(resolveInoDeepLinkString('inovixux:///search').tab, InoTab.home);
      expect(resolveInoDeepLinkString('inovixux:///notifications').tab, InoTab.notifications);
      expect(resolveInoDeepLinkString('inovixux:///settings').tab, InoTab.settings);
      // The auth stack is pre-tab-bar — it has no owning tab.
      expect(resolveInoDeepLinkString('inovixux:///sign-in').tab, isNull);
    });
  });

  group('§6.4 category mapping', () {
    test('parses the four categories', () {
      expect(InoNotificationCategory.parse('success'), InoNotificationCategory.success);
      expect(InoNotificationCategory.parse('WARNING'), InoNotificationCategory.warning);
      expect(InoNotificationCategory.parse('critical'), InoNotificationCategory.critical);
      expect(InoNotificationCategory.parse('info'), InoNotificationCategory.info);
    });

    test('an unknown category degrades to info rather than throwing', () {
      expect(InoNotificationCategory.parse('catastrophic'), InoNotificationCategory.info);
      expect(InoNotificationCategory.parse(null), InoNotificationCategory.info);
    });

    test('critical defaults to the blocking sheet, the other three do not', () {
      expect(InoNotificationCategory.critical.defaultsToBlocking, isTrue);
      for (final c in [
        InoNotificationCategory.info,
        InoNotificationCategory.success,
        InoNotificationCategory.warning,
      ]) {
        expect(c.defaultsToBlocking, isFalse);
      }
    });
  });
}
