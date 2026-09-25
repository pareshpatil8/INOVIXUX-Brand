import 'package:flutter/widgets.dart';

import '../theme/tokens.dart';

/// Category → visual mapping — docs/brand/13-mobile-app-patterns.md §6.4, INO-112.
///
/// Four categories, mapped to glyphs and tokens that already exist. The *payload field* that
/// carries the category is product work (§6.7 item 3); what each value means visually is fixed
/// here, identically on all three tracks (see
/// `mobile/react-native/src/notifications/categories.ts` and the Capacitor track's
/// `notification-category.ts` for the same table in the other two idioms).
enum InoNotificationCategory {
  info,
  success,
  warning,
  critical;

  /// Parse the wire value. Unknown values fall back to [info] rather than throwing — a category
  /// added server-side before a client ships must not break notification rendering, and `info` is
  /// the non-alarming register to be wrong in. Same defensive posture as §6.5's "unknown path →
  /// Home, silently".
  static InoNotificationCategory parse(String? raw) => switch (raw?.toLowerCase().trim()) {
        'success' => InoNotificationCategory.success,
        'warning' => InoNotificationCategory.warning,
        'critical' => InoNotificationCategory.critical,
        _ => InoNotificationCategory.info,
      };
}

extension InoNotificationCategoryVisuals on InoNotificationCategory {
  /// Tints the **glyph only**, never the banner's surface (§6.4). A full-bleed status-coloured
  /// card was already ruled out for the web alert component, and a coloured surface would force
  /// every foreground token in the banner to be re-audited per category for no communicative gain.
  ///
  /// NOTE — `info` maps to `accent`, not to the `info` palette role, because §6.4's table says
  /// `--ino-color-accent`. That table was written (INO-97) before `--ino-color-info` existed
  /// (added by INO-128 on the parallel INO-31 wave). Implemented as specified rather than
  /// silently re-pointed; flagged on INO-112 as a spec question for whoever owns doc 13.
  Color tint(InoPalette palette) => switch (this) {
        InoNotificationCategory.info => palette.accent,
        InoNotificationCategory.success => palette.success,
        InoNotificationCategory.warning => palette.warning,
        InoNotificationCategory.critical => palette.danger,
      };

  /// §6.4: "the glyph also never carries the meaning alone: the banner title must state the
  /// category in words". This is the words — prefixed onto the title when the title does not
  /// already say it, see `InoPushBanner`.
  String get word => switch (this) {
        InoNotificationCategory.info => 'Info',
        InoNotificationCategory.success => 'Success',
        InoNotificationCategory.warning => 'Warning',
        InoNotificationCategory.critical => 'Critical',
      };

  /// §6.3 last row + §6.4's own "(→ sheet, per §6.3)" note: a blocking message must not
  /// auto-dismiss, and banners auto-dismiss, so a banner is the wrong vessel regardless of app
  /// state. Overridable per notification — "blocks the user" is a property of the message, and
  /// this is only the default for the category.
  bool get defaultsToBlocking => this == InoNotificationCategory.critical;
}
