import 'dart:async';

import 'package:flutter/widgets.dart';

import '../navigation/deep_link.dart';
import '../navigation/ino_router.dart';
import '../theme/tokens.dart';
import 'notification_category.dart';

/// One received notification. The wire format that produces it is product work (§6.7 item 3);
/// this is the shape the UI is written against, so the adapter that eventually parses an
/// APNs/FCM payload has a fixed target rather than a negotiation.
@immutable
class InoNotification {
  final String id;
  final InoNotificationCategory category;
  final String title;
  final String? body;

  /// Resolved from the payload's deep-link field (§6.5). Null means "no destination" — tapping
  /// the banner then only dismisses it.
  final InoDeepLink? target;

  /// Optional single inline action (§6.3.1). Never two: "a second action means it should have
  /// been a sheet".
  final String? actionLabel;

  /// Does this message block the user from continuing (§6.3 last row)? Defaults to the category's
  /// own answer.
  final bool blocking;

  InoNotification({
    required this.id,
    required this.category,
    required this.title,
    this.body,
    this.target,
    this.actionLabel,
    bool? blocking,
  }) : blocking = blocking ?? category.defaultsToBlocking;

  /// Build from a decoded push payload. Field names are provisional — §6.7 item 3 owns them —
  /// but the mapping from *whatever they end up being* to the visual contract is settled here, so
  /// only this constructor moves when the schema lands.
  factory InoNotification.fromPayload(Map<String, dynamic> payload) {
    final link = payload['link'];
    return InoNotification(
      id: payload['id']?.toString() ?? DateTime.now().microsecondsSinceEpoch.toString(),
      category: InoNotificationCategory.parse(payload['category']?.toString()),
      title: payload['title']?.toString() ?? '',
      body: payload['body']?.toString(),
      target: link is String && link.isNotEmpty ? resolveInoDeepLinkString(link) : null,
      actionLabel: payload['action']?.toString(),
      blocking: payload['blocking'] is bool ? payload['blocking'] as bool : null,
    );
  }
}

/// Tab-badge render state (§6.2 row 2). `count == null` while [visible] means "unknown count" →
/// draw a dot; a number → draw the numeral, capped at `99+`.
@immutable
class InoBadgeState {
  final bool visible;
  final int? count;

  const InoBadgeState({required this.visible, required this.count});

  /// `99+` above 99 (§6.2).
  String get label => count == null ? '' : (count! > 99 ? '99+' : '$count');
}

/// Which surface a received notification should use — the §6.3 decision table, made by app state
/// rather than by notification content.
enum InoNotificationSurface {
  /// Foreground, any screen except Notifications.
  banner,

  /// Foreground, already on Notifications — the new row appearing *is* the notification.
  silent,

  /// Background / killed. Not renderable in-process; the OS tray owns it.
  systemTray,

  /// The message blocks the user, in any app state.
  sheet,
}

/// Notification state + the §6.2 badge sources + the §6.3 surface decision, INO-112.
///
/// Nothing feeds this yet. There is no APNs/FCM transport in this repo (§6.7 item 1) and no
/// notification data model to count unread rows from (§6.7 item 4), so [unreadCount] stays null
/// and [receive] is only reachable from the Settings preview harness. That is the honest state:
/// the surfaces are built and correct, the supply is not wired.
class InoNotificationCenter extends ChangeNotifier {
  InoNotificationCenter();

  static final InoNotificationCenter instance = InoNotificationCenter();

  /// §6.3.1 dwell — matches web `ToastService`'s default, so the two transient surfaces don't
  /// feel like different systems. See tokens.css §9b / InoDwell (INO-174).
  static const Duration bannerDwell = InoDwell.toast;

  /// Unread count for both badge surfaces (§6.2).
  ///
  /// `null` means **unknown**, which is a real state with its own treatment, not a stand-in for
  /// zero: the tab badge renders a dot when the count is unknown and a numeral when it is known.
  /// It is null today because §6.2 requires the value come from the server ("never increment it
  /// client-side per received push — that drifts the moment one push is dropped or read on
  /// another device") and there is no server.
  final ValueNotifier<int?> unreadCount = ValueNotifier<int?>(null);

  /// Received notifications, newest first — what the Notifications list renders.
  ///
  /// Explicitly **not** a data model: it is in-memory, per-process, and lost on restart. §6.7
  /// item 4 owns the real one. It exists so the §6.2 in-row unread marker and the list/empty-state
  /// switch are exercised by something rather than asserted in a comment; the only thing that
  /// appends to it today is the Settings → Preview simulator.
  List<InoNotification> get items => List.unmodifiable(_items);
  final List<InoNotification> _items = [];

  final Set<String> _readIds = {};

  bool isRead(InoNotification notification) => _readIds.contains(notification.id);

  /// The banner currently on screen, or null. One at a time (§6.3.1 stacking): a second arrival
  /// replaces the first, dismiss-then-present, never a stack.
  InoNotification? get activeBanner => _activeBanner;
  InoNotification? _activeBanner;
  Timer? _dwellTimer;

  /// Set true when the app is not foregrounded. Driven by `AppLifecycleListener` in `InoApp`.
  bool appIsBackgrounded = false;

  /// What the tab-bar badge should render (§6.2 row 2): hidden, a dot, or a numeral.
  ///
  /// The dot-vs-numeral split is not cosmetic — it is the difference between "you have unread
  /// things" and "you have exactly 3 unread things", and only the server can say the second.
  /// With no unread-count source (§6.7 item 4) the locally-observed count is deliberately
  /// downgraded to a dot rather than shown as a numeral it hasn't earned.
  InoBadgeState get tabBadge {
    final fromServer = unreadCount.value;
    if (fromServer != null) {
      return InoBadgeState(visible: fromServer > 0, count: fromServer);
    }
    final localUnread = _items.where((n) => !_readIds.contains(n.id)).length;
    return InoBadgeState(visible: localUnread > 0, count: null);
  }

  /// §6.3's decision table, extracted so it can be read (and tested) as a table rather than
  /// inferred from control flow.
  InoNotificationSurface surfaceFor(InoNotification notification) {
    if (notification.blocking) return InoNotificationSurface.sheet;
    if (appIsBackgrounded) return InoNotificationSurface.systemTray;
    if (InoRouter.activeTab.value == InoTab.notifications) return InoNotificationSurface.silent;
    return InoNotificationSurface.banner;
  }

  /// Route an arrival to its surface. Returns the chosen surface so the caller (and tests) can
  /// assert the §6.3 table directly.
  InoNotificationSurface receive(InoNotification notification) {
    final surface = surfaceFor(notification);
    _items.insert(0, notification);
    switch (surface) {
      case InoNotificationSurface.banner:
        _present(notification);
      case InoNotificationSurface.sheet:
      // Presented by `InoNotificationHost`, which has the BuildContext a modal sheet needs.
      case InoNotificationSurface.silent:
      case InoNotificationSurface.systemTray:
        // Nothing to draw in-process. The tray presentation is the OS's, and §6.3 row 1's
        // "suppress the system tray presentation entirely" is a call the transport adapter makes
        // when it hands the push over — it is not something this object can enforce.
        break;
    }
    _pending = surface == InoNotificationSurface.sheet ? notification : null;
    notifyListeners();
    return surface;
  }

  /// A blocking notification waiting for the host widget to present it as a sheet.
  InoNotification? get pendingSheet => _pending;
  InoNotification? _pending;

  void consumePendingSheet() {
    _pending = null;
  }

  void _present(InoNotification notification) {
    _dwellTimer?.cancel();
    _activeBanner = notification;
    _dwellTimer = Timer(bannerDwell, () => dismissBanner(notification.id));
  }

  /// Dismiss the banner. `id` guards against a stale dwell timer dismissing a *newer* banner that
  /// replaced the one the timer was started for.
  void dismissBanner([String? id]) {
    if (id != null && _activeBanner?.id != id) return;
    _dwellTimer?.cancel();
    _dwellTimer = null;
    if (_activeBanner == null) return;
    _activeBanner = null;
    notifyListeners();
  }

  /// §6.3.1: "dwell pauses while the banner is focused by an assistive technology."
  void pauseDwell() => _dwellTimer?.cancel();

  void resumeDwell() {
    final banner = _activeBanner;
    if (banner == null) return;
    _dwellTimer?.cancel();
    _dwellTimer = Timer(bannerDwell, () => dismissBanner(banner.id));
  }

  /// §6.2 row 1: "Clear on Notifications-screen view, not on app open." Called by
  /// `NotificationsScreen`. A no-op against a null count — clearing an unknown count would
  /// fabricate a zero the server never sent.
  void markNotificationsViewed() {
    final hadUnread = _items.any((n) => !_readIds.contains(n.id));
    _readIds.addAll(_items.map((n) => n.id));
    if (unreadCount.value != null && unreadCount.value != 0) {
      unreadCount.value = 0;
    } else if (!hadUnread) {
      return;
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _dwellTimer?.cancel();
    unreadCount.dispose();
    super.dispose();
  }
}
