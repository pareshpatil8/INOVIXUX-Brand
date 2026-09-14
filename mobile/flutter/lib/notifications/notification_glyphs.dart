import 'package:flutter/widgets.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'notification_category.dart';

/// The glyph half of docs/brand/13-mobile-app-patterns.md §6.4's category table — split out of
/// `notification_category.dart` so that file stays free of any icon-package import.
///
/// The split is not stylistic. Two reasons:
///
/// 1. **Testability.** The §6.4 category contract (parse, words, blocking default) and the §6.5
///    grammar are cross-track contracts that need unit tests. `lucide_icons` 0.257.0 — the latest
///    published version, and unmaintained since Dart 2.x (`sdk: '>=2.12.0 <3.0.0'`) — fails to
///    compile against Flutter 3.47, which made `IconData` a `final class` that can no longer be
///    extended. Any test that transitively imports it fails to load. Keeping the pure contract
///    importable without it is what lets `test/deep_link_test.dart` run at all.
/// 2. **Replaceability.** When that package is swapped (it has to be — see the note above and the
///    follow-up filed off INO-112), this is the only file in the notification layer that changes.
const Map<InoNotificationCategory, IconData> inoCategoryGlyphs = {
  InoNotificationCategory.info: LucideIcons.info,
  InoNotificationCategory.success: LucideIcons.checkCircle,
  InoNotificationCategory.warning: LucideIcons.alertTriangle,
  InoNotificationCategory.critical: LucideIcons.alertOctagon,
};

extension InoNotificationCategoryGlyph on InoNotificationCategory {
  /// 20px Lucide glyph in the banner's leading slot (§6.3.1 composition).
  IconData get glyph => inoCategoryGlyphs[this]!;
}
