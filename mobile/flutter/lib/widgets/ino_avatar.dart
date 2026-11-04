import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoAvatarShape { circle, square }

enum InoAvatarSize { xs, sm, defaultSize, lg, xl }

/// Diameter per tier — web/src/app/components/avatar/SPEC.md §2 five-step scale, not the shared
/// control-size scale (an avatar's size is a content decision, not a control-height one).
const Map<InoAvatarSize, double> _sizePx = {
  InoAvatarSize.xs: 24,
  InoAvatarSize.sm: 32,
  InoAvatarSize.defaultSize: 40,
  InoAvatarSize.lg: 48,
  InoAvatarSize.xl: 64,
};

// Matches tokens.css's --ino-type-caption/label-sm/body/h3/body-lg-size, same tier mapping web's
// SCSS uses — see SPEC.md §2. Literal, same precedent as InoTag's literal 11px label.
const Map<InoAvatarSize, double> _fontSize = {
  InoAvatarSize.xs: 12,
  InoAvatarSize.sm: 12,
  InoAvatarSize.defaultSize: 15,
  InoAvatarSize.lg: 16,
  InoAvatarSize.xl: 17,
};

// Overlap per tier, same mapping as web's ino-avatar-group.component.scss.
const Map<InoAvatarSize, double> _overlap = {
  InoAvatarSize.xs: InoSpace.s2,
  InoAvatarSize.sm: InoSpace.s2,
  InoAvatarSize.defaultSize: InoSpace.s3,
  InoAvatarSize.lg: InoSpace.s3,
  InoAvatarSize.xl: InoSpace.s4,
};

double _avatarRadius(InoAvatarShape shape, InoAvatarSize size) {
  return shape == InoAvatarShape.circle ? _sizePx[size]! / 2 : InoRadius.md;
}

/// `<InoAvatar>` — Flutter port of `<ino-avatar>` (web/src/app/components/avatar, INO-458 /
/// INO-31 Phase B4). Same content-form priority (image until it errors > initials > projected
/// icon > built-in fallback glyph) and decorative/informative accessibility contract as the web
/// component — full reasoning: web/src/app/components/avatar/SPEC.md. Presentational only, same
/// precedent as `InoTag` — no `onTap`. `InoAvatarGroup` is stacked in this same file, same
/// "ticket-scoped file" organization `ino_dataview.dart` uses.
class InoAvatar extends StatefulWidget {
  final String? image;
  final String? initials;
  final String? alt;
  final String? ariaLabel;
  final InoAvatarShape shape;
  final InoAvatarSize size;
  final bool decorative;
  final Widget? icon;

  const InoAvatar({
    super.key,
    this.image,
    this.initials,
    this.alt,
    this.ariaLabel,
    this.shape = InoAvatarShape.circle,
    this.size = InoAvatarSize.defaultSize,
    this.decorative = false,
    this.icon,
  });

  @override
  State<InoAvatar> createState() => _InoAvatarState();
}

class _InoAvatarState extends State<InoAvatar> {
  bool _imageFailed = false;

  @override
  void didUpdateWidget(InoAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Mirrors the web component's `ngOnChanges` reset — swapping to a new `image` URL always
    // gets a fresh load attempt instead of staying stuck on a previous failure.
    if (oldWidget.image != widget.image) {
      setState(() => _imageFailed = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dimension = _sizePx[widget.size]!;
    final showImage = (widget.image?.isNotEmpty ?? false) && !_imageFailed;
    final showInitials = !showImage && (widget.initials?.isNotEmpty ?? false);
    final label = widget.ariaLabel ?? widget.alt ?? 'Avatar';
    final radius = _avatarRadius(widget.shape, widget.size);

    Widget content;
    if (showImage) {
      content = ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Image.network(
          widget.image!,
          width: dimension,
          height: dimension,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            // Triggers a rebuild into the initials/icon fallback chain on the next frame —
            // Image.network's errorBuilder is itself a build-time callback, not an event handler.
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() => _imageFailed = true);
            });
            return const SizedBox.shrink();
          },
        ),
      );
    } else if (showInitials) {
      content = Text(
        widget.initials!.toUpperCase(),
        style: TextStyle(
          color: colors.onSurface,
          fontSize: _fontSize[widget.size],
          fontWeight: FontWeight.w500,
        ),
      );
    } else if (widget.icon != null) {
      content = widget.icon!;
    } else {
      content = Icon(LucideIcons.user, size: dimension * 0.55, color: colors.onSurfaceMuted);
    }

    return Semantics(
      label: widget.decorative || showImage ? null : label,
      image: !widget.decorative && !showImage,
      excludeSemantics: widget.decorative,
      child: Container(
        width: dimension,
        height: dimension,
        alignment: Alignment.center,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: colors.surfaceSunken,
          borderRadius: BorderRadius.circular(radius),
        ),
        child: content,
      ),
    );
  }
}

/// One avatar's content, as plain data — same data-driven shape as web's `InoAvatarGroupItem`;
/// see web/src/app/components/avatar/SPEC.md §5 for why the group renders from a list rather
/// than accepting projected/child avatars.
class InoAvatarGroupItem {
  final String? image;
  final String? initials;
  final String? alt;

  const InoAvatarGroupItem({this.image, this.initials, this.alt});
}

/// `<InoAvatarGroup>` — Flutter port of `<ino-avatar-group>`
/// (web/src/app/components/avatar-group, INO-458 / INO-31 Phase B4). Overlapping avatars with an
/// optional "+N" surplus avatar when `avatars.length` exceeds `max` — full reasoning:
/// `web/src/app/components/avatar/SPEC.md` §5.
class InoAvatarGroup extends StatelessWidget {
  final List<InoAvatarGroupItem> avatars;
  final int? max;
  final InoAvatarShape shape;
  final InoAvatarSize size;
  final String? ariaLabel;

  const InoAvatarGroup({
    super.key,
    required this.avatars,
    this.max,
    this.shape = InoAvatarShape.circle,
    this.size = InoAvatarSize.defaultSize,
    this.ariaLabel,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final visible = max != null ? avatars.take(max!).toList() : avatars;
    final surplus = max != null ? (avatars.length - max!).clamp(0, avatars.length) : 0;
    final count = avatars.length;
    final label = ariaLabel ?? (count == 1 ? '1 avatar' : '$count avatars');
    final overlap = _overlap[size]!;
    final radius = _avatarRadius(shape, size);

    Widget ring(Widget child, {required bool isFirst}) {
      return Container(
        margin: EdgeInsets.only(left: isFirst ? 0 : -overlap),
        decoration: BoxDecoration(
          border: Border.all(color: colors.surfaceRaised, width: InoBorderWidth.thick),
          borderRadius: BorderRadius.circular(radius + InoBorderWidth.thick),
        ),
        child: child,
      );
    }

    return Semantics(
      label: label,
      container: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < visible.length; i++)
            ring(
              InoAvatar(
                image: visible[i].image,
                initials: visible[i].initials,
                alt: visible[i].alt,
                // Individually decorative unless the caller supplied this item's own `alt` — a
                // group of named people still announces each name on request, while an unnamed
                // cluster relies on the group's own one-line count. See SPEC.md §4.
                decorative: visible[i].alt == null || visible[i].alt!.isEmpty,
                shape: shape,
                size: size,
              ),
              isFirst: i == 0,
            ),
          if (surplus > 0)
            ring(
              InoAvatar(
                initials: '+$surplus',
                ariaLabel: '$surplus more',
                shape: shape,
                size: size,
              ),
              isFirst: visible.isEmpty,
            ),
        ],
      ),
    );
  }
}
