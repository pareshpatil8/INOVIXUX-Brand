import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoCarouselOrientation { horizontal, vertical }

/// `InoCarousel` — Flutter port of `web/src/app/components/carousel/ino-carousel.component.ts`
/// (INO-483 / INO-31 B5). Re-authored, not shared: Flutter has no CSS custom properties, so every
/// value below reads the same [InoControlSize] / [InoSpace] / palette-role names the web
/// component reads, never a literal.
///
/// Scope differences from web, all deliberate:
/// - **Chrome only.** This renders prev/next/indicators/pause buttons and reports navigation;
///   the parent renders the actual slides (typically an [IndexedStack] or custom widget). Web uses
///   content projection (`<ino-carousel-item>`), which has no Flutter equivalent worth inventing.
/// - **Controlled only, index-based.** Matches web's `[activeIndex]` binding exactly — a Flutter
///   caller already holds `State`, so an internal fallback would be a second source of truth.
/// - **Host-owned autoplay timer.** Component does not run a timer — the host app drives autoplay
///   by calling [onNext] at its own interval (SPEC.md §6). The component only shows/hides the
///   pause button and tracks [playing] state for the pause-control glyph.
/// - **No keyboard map / focus ring.** Arrow-key roving tabindex and `:focus-visible` have no
///   touch equivalent; external-keyboard focus is an OS-level highlight.
class InoCarousel extends StatelessWidget {
  final int itemCount;
  final int activeIndex;
  final ValueChanged<int> onActiveIndexChanged;
  final int visibleCount;
  final int step;
  final bool circular;
  final InoCarouselOrientation orientation;
  final InoControlSize size;
  final bool showNavigation;
  final bool showIndicators;
  final bool autoplay;
  final bool playing;
  final ValueChanged<bool>? onPlayingChanged;

  const InoCarousel({
    super.key,
    required this.itemCount,
    required this.activeIndex,
    required this.onActiveIndexChanged,
    this.visibleCount = 1,
    this.step = 1,
    this.circular = false,
    this.orientation = InoCarouselOrientation.horizontal,
    this.size = InoControlSize.standard,
    this.showNavigation = true,
    this.showIndicators = true,
    this.autoplay = false,
    this.playing = false,
    this.onPlayingChanged,
  });

  int get _maxStart => (itemCount - visibleCount).clamp(0, double.infinity).toInt();
  int get _clampedIndex => itemCount == 0 ? 0 : activeIndex.clamp(0, _maxStart);
  bool get _isAtStart => _clampedIndex <= 0;
  bool get _isAtEnd => _clampedIndex >= _maxStart;

  /// Compute reachable stops: every step-sized stop from 0 to maxStart, always including maxStart.
  List<int> get _stops {
    if (itemCount == 0) return [];
    final result = <int>[];
    for (int i = 0; i <= _maxStart; i += step) {
      result.add(i);
    }
    if (result.isEmpty || result.last != _maxStart) {
      result.add(_maxStart);
    }
    return result;
  }

  int get _currentStopIndex => _stops.indexOf(_clampedIndex);

  String get _rangeLabel {
    if (itemCount == 0) return '';
    final first = _clampedIndex + 1;
    final last = (_clampedIndex + visibleCount).clamp(0, itemCount);
    return first == last ? 'Slide $first of $itemCount' : 'Slides $first-$last of $itemCount';
  }

  void _goTo(int index) {
    final clamped = index.clamp(0, _maxStart);
    if (clamped != _clampedIndex) {
      onActiveIndexChanged(clamped);
    }
  }

  void _onNext() {
    final next = _clampedIndex + step;
    if (next > _maxStart) {
      if (circular) {
        _goTo(0);
      } else {
        _goTo(_maxStart);
      }
      return;
    }
    _goTo(next);
  }

  void _onPrev() {
    final prev = _clampedIndex - step;
    if (prev < 0) {
      _goTo(circular ? _maxStart : 0);
      return;
    }
    _goTo(prev);
  }

  void _togglePlaying() {
    onPlayingChanged?.call(!playing);
  }

  Widget _buildNavButton({
    required BuildContext context,
    required bool isNext,
    required bool isDisabled,
    required String label,
  }) {
    final colors = context.inoColors;
    final c = size;

    return Semantics(
      button: true,
      enabled: !isDisabled,
      label: label,
      child: InkWell(
        onTap: isDisabled ? null : (isNext ? _onNext : _onPrev),
        child: Container(
          width: c.height,
          height: c.height,
          decoration: BoxDecoration(
            color: colors.surfaceRaised,
            border: Border.all(color: colors.border),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Opacity(
            opacity: isDisabled ? 0.6 : 1.0,
            child: Center(
              child: Text(
                isNext ? '›' : '‹',
                style: TextStyle(color: colors.onSurface, fontSize: 18),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildIndicator({required BuildContext context, required int index, required bool isActive}) {
    final colors = context.inoColors;
    final stop = _stops[index];

    return Semantics(
      button: true,
      selected: isActive,
      label: 'Go to slide ${stop + 1} of $itemCount',
      child: InkWell(
        onTap: () => _goTo(stop),
        child: Container(
          width: InoSpace.s2,
          height: InoSpace.s2,
          decoration: BoxDecoration(
            color: isActive ? colors.accent : colors.border,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final stops = _stops;
    final currentStopIndex = _currentStopIndex;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Viewport with nav and pause buttons
        Semantics(
          container: true,
          label: 'Carousel',
          child: Container(
            padding: EdgeInsets.zero,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (showNavigation)
                  _buildNavButton(
                    context: context,
                    isNext: false,
                    isDisabled: !circular && _isAtStart,
                    label: orientation == InoCarouselOrientation.horizontal
                        ? 'Previous slide'
                        : 'Previous slide (up)',
                  ),
                Expanded(child: SizedBox.shrink()),
                if (showNavigation)
                  _buildNavButton(
                    context: context,
                    isNext: true,
                    isDisabled: !circular && _isAtEnd,
                    label: orientation == InoCarouselOrientation.horizontal
                        ? 'Next slide'
                        : 'Next slide (down)',
                  ),
                if (autoplay)
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: InoSpace.s2),
                    child: Semantics(
                      button: true,
                      selected: playing,
                      label: playing ? 'Pause autoplay' : 'Play autoplay',
                      child: InkWell(
                        onTap: _togglePlaying,
                        child: Container(
                          width: size.height,
                          height: size.height,
                          decoration: BoxDecoration(
                            color: Colors.transparent,
                            border: Border.all(color: colors.border),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Text(
                              playing ? '⏸' : '▶',
                              style: TextStyle(
                                color: playing ? colors.accent : colors.onSurface,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),

        // Indicators strip
        if (showIndicators && stops.length > 1)
          Padding(
            padding: EdgeInsets.only(top: InoSpace.s3),
            child: Semantics(
              container: true,
              label: 'Choose slide',
              child: Wrap(
                spacing: InoSpace.s2,
                children: List.generate(
                  stops.length,
                  (i) => _buildIndicator(
                    context: context,
                    index: i,
                    isActive: i == currentStopIndex,
                  ),
                ),
              ),
            ),
          ),

        // Screen-reader range announcement
        Semantics(
          liveRegion: true,
          label: _rangeLabel,
          child: SizedBox.shrink(),
        ),
      ],
    );
  }
}
