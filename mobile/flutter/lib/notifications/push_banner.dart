import 'package:flutter/material.dart';

import '../navigation/ino_router.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'notification_category.dart';
import 'notification_glyphs.dart';
import 'notification_center.dart';

/// In-app push banner — docs/brand/13-mobile-app-patterns.md §6.3.1, INO-112.
///
/// Reuses the shipped toast pattern rather than inventing a second transient surface; the web
/// `ino-toast-container` is the reference implementation and this is the same contract in
/// Flutter's idiom. The one deliberate divergence from toasts: **banners anchor top**
/// (`--ino-safe-area-top` + `--ino-space-4`), so an incoming notification never covers the bottom
/// sheet or the tab bar the user is mid-interaction with.
class InoNotificationHost extends StatefulWidget {
  final Widget child;

  const InoNotificationHost({super.key, required this.child});

  @override
  State<InoNotificationHost> createState() => _InoNotificationHostState();
}

class _InoNotificationHostState extends State<InoNotificationHost>
    with SingleTickerProviderStateMixin {
  final _center = InoNotificationCenter.instance;
  late final AnimationController _controller = AnimationController(
    vsync: this,
    // §4/§6.3.1: same duration in and out; only the curve differs.
    duration: InoMotion.base,
    reverseDuration: InoMotion.base,
  );

  @override
  void initState() {
    super.initState();
    _center.addListener(_onCenterChanged);
  }

  @override
  void dispose() {
    _center.removeListener(_onCenterChanged);
    _controller.dispose();
    super.dispose();
  }

  void _onCenterChanged() {
    if (!mounted) return;
    if (_center.activeBanner != null) {
      _controller.forward(from: 0);
    } else {
      _controller.reverse();
    }
    // A blocking notification is a sheet, not a banner (§6.3 last row) — and a sheet needs a
    // BuildContext, which the center doesn't have. Presented here, after the frame, so it does
    // not run inside the notifyListeners() that triggered it.
    final pending = _center.pendingSheet;
    if (pending != null) {
      _center.consumePendingSheet();
      WidgetsBinding.instance.addPostFrameCallback((_) => _presentSheet(pending));
    }
    setState(() {});
  }

  Future<void> _presentSheet(InoNotification notification) async {
    if (!mounted) return;
    final colors = context.inoColors;
    final acted = await showModalBottomSheet<bool>(
      context: context,
      // §6.3.1: "No scrim — a banner is non-modal; the scrim belongs to the bottom-sheet case."
      // This is that case.
      barrierColor: colors.overlayScrim,
      backgroundColor: colors.surfaceRaised,
      isDismissible: !notification.blocking,
      enableDrag: !notification.blocking,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(InoRadius.xl)),
      ),
      builder: (sheetContext) => _BlockingSheet(notification: notification),
    );
    if (acted == true && notification.target != null) {
      InoRouter.open(notification.target!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final banner = _center.activeBanner;

    return Stack(
      children: [
        widget.child,
        if (banner != null || _controller.value > 0)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                // §6.3.1 anchoring: safe-area top (SafeArea above) + --ino-space-4.
                padding: const EdgeInsets.fromLTRB(
                  InoSpace.s4,
                  InoSpace.s4,
                  InoSpace.s4,
                  0,
                ),
                child: banner == null
                    ? const SizedBox.shrink()
                    : _AnimatedBanner(
                        controller: _controller,
                        notification: banner,
                      ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Applies §6.3.1's motion contract: in with `--ino-motion-duration-base` +
/// `--ino-motion-easing-decelerate`, out with the same duration + `--ino-motion-easing-accelerate`.
/// Under reduced motion, cross-fade only — never slide (§4).
class _AnimatedBanner extends StatelessWidget {
  final AnimationController controller;
  final InoNotification notification;

  const _AnimatedBanner({required this.controller, required this.notification});

  @override
  Widget build(BuildContext context) {
    // Flutter's platform-level "reduce motion" signal — the equivalent of web's
    // `prefers-reduced-motion` and RN's `AccessibilityInfo.isReduceMotionEnabled`.
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    final card = _InoPushBanner(notification: notification);

    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final fade = CurvedAnimation(
          parent: controller,
          curve: InoMotion.easingDecelerate,
          reverseCurve: InoMotion.easingAccelerate,
        ).value;

        if (reduceMotion) {
          return Opacity(opacity: fade, child: child);
        }
        return Opacity(
          opacity: fade,
          // Slides down from just above its resting position — a banner entering from the top
          // edge, matching the sheet convention §4 sets for the bottom edge.
          child: Transform.translate(offset: Offset(0, (fade - 1) * InoSpace.s6), child: child),
        );
      },
      child: card,
    );
  }
}

class _InoPushBanner extends StatelessWidget {
  final InoNotification notification;

  const _InoPushBanner({required this.notification});

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final center = InoNotificationCenter.instance;
    final text = Theme.of(context).textTheme;

    return Semantics(
      // §6.3.1: announced `polite` — `assertive` would interrupt whatever the user is reading,
      // and a push is by definition not a response to their current action. `liveRegion` is
      // Flutter's polite announcement; there is no assertive variant to accidentally reach for.
      liveRegion: true,
      container: true,
      onDidGainAccessibilityFocus: center.pauseDwell,
      onDidLoseAccessibilityFocus: center.resumeDwell,
      child: Dismissible(
        key: ValueKey(notification.id),
        // "Swipe-up dismisses early" (§6.3.1).
        direction: DismissDirection.up,
        onDismissed: (_) => center.dismissBanner(notification.id),
        child: Material(
          color: colors.surfaceRaised,
          borderRadius: BorderRadius.circular(InoRadius.lg),
          // --ino-elevation-2 (tokens.css §"elevation"): surfaces above the overlay scrim.
          // Deliberately inlined rather than added to theme/tokens.dart — that file is a
          // colour/space/radius/motion port guarded byte-for-byte by
          // scripts/check-theme-parity.mjs, and elevation has no entry there on any mobile track
          // yet. Porting the elevation scale is its own change, not a side effect of this one.
          elevation: 0,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(InoRadius.lg),
              border: Border.all(color: colors.border),
              boxShadow: [
                BoxShadow(
                  color: colors.overlayScrim,
                  blurRadius: 60,
                  spreadRadius: -32,
                  offset: const Offset(0, 24),
                ),
              ],
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(InoRadius.lg),
              onTap: () {
                center.dismissBanner(notification.id);
                final target = notification.target;
                if (target != null) InoRouter.open(target);
              },
              child: Container(
                // Tap target spans the full banner and is ≥ --ino-target-comfortable (§6.3.1).
                constraints: const BoxConstraints(minHeight: InoTarget.comfortable),
                padding: const EdgeInsets.symmetric(
                  horizontal: InoSpace.s4,
                  vertical: InoSpace.s3,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 20px Lucide category glyph — tinted; the surface is not (§6.4).
                    Icon(
                      notification.category.glyph,
                      size: 20,
                      color: notification.category.tint(colors),
                    ),
                    const SizedBox(width: InoSpace.s3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _titleWithCategoryWord(notification),
                            style: text.titleMedium,
                            // Title: 1 line, truncate.
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (notification.body != null && notification.body!.isNotEmpty)
                            Text(
                              notification.body!,
                              style: text.bodySmall,
                              // Body: 2 lines max, truncate.
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    // Optional SINGLE inline action. Never two competing actions in a banner;
                    // a second action means it should have been a sheet (§6.3.1).
                    if (notification.actionLabel != null) ...[
                      const SizedBox(width: InoSpace.s2),
                      TextButton(
                        onPressed: () {
                          center.dismissBanner(notification.id);
                          final target = notification.target;
                          if (target != null) InoRouter.open(target);
                        },
                        style: TextButton.styleFrom(
                          minimumSize: const Size(InoTarget.comfortable, InoTarget.comfortable),
                          foregroundColor: colors.accentTextSafe,
                        ),
                        child: Text(notification.actionLabel!),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// §6.4: "the glyph also never carries the meaning alone: the banner title must state the category
/// in words." Enforced here rather than left to whoever writes the payload copy — the glyph is
/// drawn by this component, so the words that legitimise it are this component's responsibility.
/// A title that already opens with the category word is left alone, so a well-written payload
/// doesn't read "Warning — Warning: card expiring".
String _titleWithCategoryWord(InoNotification notification) {
  final word = notification.category.word;
  final title = notification.title.trim();
  if (title.isEmpty) return word;
  if (title.toLowerCase().startsWith(word.toLowerCase())) return title;
  return '$word — $title';
}

class _BlockingSheet extends StatelessWidget {
  final InoNotification notification;

  const _BlockingSheet({required this.notification});

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final text = Theme.of(context).textTheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          InoSpace.s5,
          InoSpace.s5,
          InoSpace.s5,
          InoSpace.s5,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(
                  notification.category.glyph,
                  size: 20,
                  color: notification.category.tint(colors),
                ),
                const SizedBox(width: InoSpace.s3),
                Expanded(
                  child: Text(_titleWithCategoryWord(notification), style: text.titleMedium),
                ),
              ],
            ),
            if (notification.body != null && notification.body!.isNotEmpty) ...[
              const SizedBox(height: InoSpace.s2),
              Text(notification.body!, style: text.bodyMedium),
            ],
            const SizedBox(height: InoSpace.s5),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(notification.actionLabel ?? 'Continue'),
            ),
          ],
        ),
      ),
    );
  }
}
