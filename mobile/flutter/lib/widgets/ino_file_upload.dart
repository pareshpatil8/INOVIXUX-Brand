import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `InoFileUpload` — Flutter port of `<ino-file-upload>`
/// (`web/src/app/components/file-upload`, INO-145 / INO-31 T-5). Full reasoning:
/// `web/src/app/components/file-upload/SPEC.md` §9.
///
/// Scope, per the plan rev 9 §5 porting rule ("Flutter is a real port, ~40% the cost of the web
/// component"):
/// - **No drag-and-drop.** Flutter has no drag-and-drop gesture for the OS file/photo picker on
///   either platform — the web dropzone has no touch equivalent, so it is simply not rendered here
///   rather than faked as an inert decoration.
/// - **No bundled file/image picker.** Adding one would mean pulling in a new native dependency
///   (`file_picker`, `image_picker`, …), which this repo's porting rule does not sanction
///   mid-component — no other ported widget reaches for a new vendor package (see [InoButton]'s
///   and `InoDatepicker`'s own doc comments). Instead this widget exposes an `onChoose`
///   [VoidCallback] the HOST wires to whatever picker the app already uses, matching the
///   "host owns the transport" shape `ino-file-upload`'s web `(upload)` intent establishes
///   (SPEC.md §1). Once the host has picked files, call [validateFiles] (mirrors the web
///   component's accept/maxFileSize/maxFiles rules) before pushing the result into `items`.
/// - **List UI (preview, status text, progress bar, cancel/retry/remove) is fully ported** — the
///   expensive part, kept visually/behaviourally identical across all three tracks.
///
/// Web-only states with no touch equivalent are dropped rather than faked — `hover` and the
/// `:focus-visible` ring, same rule [InoButton]'s doc comment states; pressed/disabled/loading
/// carry over. `role="alert"` has no Flutter widget equivalent — the rejections block uses
/// [Semantics.liveRegion] instead, the same substitution [InoButton]'s loading state uses.
enum InoFileUploadItemStatus { idle, uploading, success, error }

class InoFileUploadItem {
  final String id;
  final String name;
  final int size;
  final InoFileUploadItemStatus status;

  /// 0-100, only meaningful while [status] is [InoFileUploadItemStatus.uploading].
  final double? progress;

  /// Shown when [status] is [InoFileUploadItemStatus.error].
  final String? error;

  /// Local preview path/URI (e.g. an image picker result), if any — image previews only, same as
  /// web.
  final String? previewUri;

  /// MIME type, when the host's picker supplies one — drives accept-matching + preview
  /// eligibility.
  final String? type;

  const InoFileUploadItem({
    required this.id,
    required this.name,
    required this.size,
    required this.status,
    this.progress,
    this.error,
    this.previewUri,
    this.type,
  });
}

/// Shape the host's picker result must be reducible to before calling [validateFiles].
class InoFileUploadCandidate {
  final String name;
  final int size;
  final String? type;
  final String? uri;

  const InoFileUploadCandidate({required this.name, required this.size, this.type, this.uri});
}

enum InoFileUploadRejectionReason { accept, size, maxFiles }

class InoFileUploadRejection {
  final InoFileUploadCandidate candidate;
  final InoFileUploadRejectionReason reason;
  final String message;

  const InoFileUploadRejection({required this.candidate, required this.reason, required this.message});
}

String formatBytes(int bytes) {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  var value = bytes.toDouble();
  var i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return i == 0 ? '${value.toInt()} ${units[i]}' : '${value.toStringAsFixed(1)} ${units[i]}';
}

int _itemIdCounter = 0;

/// Mirrors the web component's `matchesAccept`/`addFiles` validation (SPEC.md §4), scoped to what
/// a Flutter picker result can actually tell us: [accept] here is MIME-prefix rules only
/// (`'image/'`, `'application/pdf'`) — extension-based rules (`.pdf`) are not evaluated, since
/// neither platform's picker API reliably surfaces the file extension the way a web `<input
/// accept>` grammar does.
({List<InoFileUploadItem> accepted, List<InoFileUploadRejection> rejections}) validateFiles(
  List<InoFileUploadCandidate> candidates, {
  List<String> accept = const [],
  int maxFileSize = 0,
  int maxFiles = 0,
  int existingCount = 0,
}) {
  final accepted = <InoFileUploadItem>[];
  final rejections = <InoFileUploadRejection>[];
  var count = existingCount;

  for (final candidate in candidates) {
    if (maxFiles > 0 && count >= maxFiles) {
      rejections.add(InoFileUploadRejection(
        candidate: candidate,
        reason: InoFileUploadRejectionReason.maxFiles,
        message: 'Only $maxFiles file${maxFiles == 1 ? '' : 's'} allowed.',
      ));
      continue;
    }
    final type = (candidate.type ?? '').toLowerCase();
    if (accept.isNotEmpty && !accept.any((rule) => type.startsWith(rule.toLowerCase()))) {
      rejections.add(InoFileUploadRejection(
        candidate: candidate,
        reason: InoFileUploadRejectionReason.accept,
        message: '${candidate.name} is not an accepted file type.',
      ));
      continue;
    }
    if (maxFileSize > 0 && candidate.size > maxFileSize) {
      rejections.add(InoFileUploadRejection(
        candidate: candidate,
        reason: InoFileUploadRejectionReason.size,
        message: '${candidate.name} exceeds the ${formatBytes(maxFileSize)} limit.',
      ));
      continue;
    }
    accepted.add(InoFileUploadItem(
      id: 'ino-file-upload-item-${++_itemIdCounter}',
      name: candidate.name,
      size: candidate.size,
      type: candidate.type,
      previewUri: type.startsWith('image/') ? candidate.uri : null,
      status: InoFileUploadItemStatus.idle,
    ));
    count++;
  }

  return (accepted: accepted, rejections: rejections);
}

class InoFileUpload extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? error;
  final InoControlSize size;
  final List<InoFileUploadItem> items;
  final List<InoFileUploadRejection> rejections;
  final VoidCallback? onDismissRejections;

  /// The host wires this to whatever native picker the app uses — see the class doc comment.
  final VoidCallback? onChoose;
  final ValueChanged<InoFileUploadItem>? onCancel;
  final ValueChanged<InoFileUploadItem>? onRetry;
  final ValueChanged<InoFileUploadItem>? onRemove;
  final bool disabled;
  final bool readonly;
  final bool loading;
  final String chooseLabel;

  const InoFileUpload({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.size = InoControlSize.standard,
    required this.items,
    this.rejections = const [],
    this.onDismissRejections,
    required this.onChoose,
    this.onCancel,
    this.onRetry,
    this.onRemove,
    this.disabled = false,
    this.readonly = false,
    this.loading = false,
    this.chooseLabel = 'Choose files',
  });

  bool get _nonInteractive => disabled || loading;

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = size;
    final invalid = error != null && error!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (label != null) ...[
          Text(label!, style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: colors.onSurface)),
          const SizedBox(height: InoSpace.s2),
        ],
        _ChooseButton(
          label: chooseLabel,
          dims: dims,
          colors: colors,
          invalid: invalid,
          loading: loading,
          onPressed: _nonInteractive || readonly ? null : onChoose,
        ),
        if (items.isNotEmpty) ...[
          const SizedBox(height: InoSpace.s2),
          Column(
            children: [
              for (final item in items) ...[
                _FileRow(
                  item: item,
                  colors: colors,
                  disabled: disabled,
                  readonly: readonly,
                  onCancel: onCancel,
                  onRetry: onRetry,
                  onRemove: onRemove,
                ),
                if (item != items.last) const SizedBox(height: InoSpace.s2),
              ],
            ],
          ),
        ],
        if (rejections.isNotEmpty) ...[
          const SizedBox(height: InoSpace.s2),
          Semantics(
            liveRegion: true,
            child: Container(
              padding: const EdgeInsets.all(InoSpace.s4),
              decoration: BoxDecoration(
                border: Border.all(color: colors.danger),
                borderRadius: BorderRadius.circular(InoRadius.md),
                color: colors.surfaceRaised,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Some files were not accepted',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: colors.dangerTextSafe)),
                  const SizedBox(height: InoSpace.s1),
                  for (final r in rejections)
                    Text(r.message, style: TextStyle(fontSize: 12.5, color: colors.onSurface)),
                  if (onDismissRejections != null) ...[
                    const SizedBox(height: InoSpace.s1),
                    GestureDetector(
                      onTap: onDismissRejections,
                      child: Text('Dismiss',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: colors.onSurfaceMuted)),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
        if (error != null) ...[
          const SizedBox(height: InoSpace.s2),
          Semantics(
            liveRegion: true,
            child: Text(error!, style: TextStyle(fontSize: 12.5, color: colors.danger, fontWeight: FontWeight.w600)),
          ),
        ] else if (hint != null) ...[
          const SizedBox(height: InoSpace.s2),
          Text(hint!, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
        ],
      ],
    );
  }
}

class _ChooseButton extends StatefulWidget {
  final String label;
  final InoControlSize dims;
  final InoPalette colors;
  final bool invalid;
  final bool loading;
  final VoidCallback? onPressed;

  const _ChooseButton({
    required this.label,
    required this.dims,
    required this.colors,
    required this.invalid,
    required this.loading,
    required this.onPressed,
  });

  @override
  State<_ChooseButton> createState() => _ChooseButtonState();
}

class _ChooseButtonState extends State<_ChooseButton> {
  bool _pressed = false;

  bool get _disabled => widget.onPressed == null;

  @override
  Widget build(BuildContext context) {
    final colors = widget.colors;
    final borderColor = widget.invalid
        ? colors.danger
        : (_pressed ? colors.accentActive : colors.border);

    return Semantics(
      button: true,
      enabled: !_disabled,
      liveRegion: widget.loading,
      label: widget.label,
      child: GestureDetector(
        onTapDown: _disabled ? null : (_) => setState(() => _pressed = true),
        onTapUp: _disabled ? null : (_) => setState(() => _pressed = false),
        onTapCancel: _disabled ? null : () => setState(() => _pressed = false),
        onTap: widget.onPressed,
        child: Container(
          constraints: BoxConstraints(minHeight: widget.dims.height),
          padding: EdgeInsets.symmetric(horizontal: widget.dims.paddingInlineRoomy),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: _pressed ? colors.surfaceSunken : colors.surfaceRaised,
            border: Border.all(color: borderColor),
            borderRadius: BorderRadius.circular(InoRadius.md),
          ),
          child: Opacity(
            opacity: _disabled ? 0.5 : 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.loading) ...[
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: colors.onSurfaceMuted),
                  ),
                  SizedBox(width: widget.dims.gap),
                ],
                Text(widget.label,
                    style: TextStyle(color: colors.onSurface, fontSize: widget.dims.fontSize, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FileRow extends StatelessWidget {
  final InoFileUploadItem item;
  final InoPalette colors;
  final bool disabled;
  final bool readonly;
  final ValueChanged<InoFileUploadItem>? onCancel;
  final ValueChanged<InoFileUploadItem>? onRetry;
  final ValueChanged<InoFileUploadItem>? onRemove;

  const _FileRow({
    required this.item,
    required this.colors,
    required this.disabled,
    required this.readonly,
    required this.onCancel,
    required this.onRetry,
    required this.onRemove,
  });

  String get _statusText {
    switch (item.status) {
      case InoFileUploadItemStatus.uploading:
        return 'Uploading… ${(item.progress ?? 0).round()}%';
      case InoFileUploadItemStatus.success:
        return 'Uploaded';
      case InoFileUploadItemStatus.error:
        return item.error?.isNotEmpty == true ? item.error! : 'Upload failed';
      case InoFileUploadItemStatus.idle:
        return 'Ready to upload';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isError = item.status == InoFileUploadItemStatus.error;

    return Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: InoSpace.s4, vertical: InoSpace.s2),
      decoration: BoxDecoration(
        border: Border.all(color: isError ? colors.danger : colors.border),
        borderRadius: BorderRadius.circular(InoRadius.md),
        color: colors.surfaceRaised,
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: colors.surfaceSunken, borderRadius: BorderRadius.circular(InoRadius.sm)),
            clipBehavior: Clip.antiAlias,
            child: item.previewUri != null
                ? Image.network(item.previewUri!, fit: BoxFit.cover, width: 36, height: 36)
                : Text('FILE', style: TextStyle(color: colors.onSurfaceMuted, fontSize: 12)),
          ),
          const SizedBox(width: InoSpace.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(item.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: colors.onSurface)),
                Text(formatBytes(item.size), style: TextStyle(fontSize: 11, color: colors.onSurfaceMuted)),
                Semantics(
                  liveRegion: true,
                  child: Text(_statusText,
                      style: TextStyle(fontSize: 11, color: isError ? colors.dangerTextSafe : colors.onSurfaceMuted)),
                ),
                if (item.status == InoFileUploadItemStatus.uploading) ...[
                  const SizedBox(height: InoSpace.s1),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(InoRadius.pill),
                    child: SizedBox(
                      height: 4,
                      child: LinearProgressIndicator(
                        value: ((item.progress ?? 0) / 100).clamp(0, 1),
                        backgroundColor: colors.surfaceSunken,
                        valueColor: AlwaysStoppedAnimation(colors.accent),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: InoSpace.s3),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (item.status == InoFileUploadItemStatus.uploading && onCancel != null)
                _ItemActionButton(label: 'Cancel', colors: colors, disabled: disabled, onPressed: () => onCancel!(item)),
              if (isError && onRetry != null) ...[
                const SizedBox(width: InoSpace.s2),
                _ItemActionButton(label: 'Retry', colors: colors, disabled: disabled, onPressed: () => onRetry!(item)),
              ],
              if (onRemove != null) ...[
                const SizedBox(width: InoSpace.s2),
                _ItemActionButton(
                  label: 'Remove',
                  semanticLabel: 'Remove ${item.name}',
                  colors: colors,
                  disabled: disabled || readonly,
                  danger: true,
                  onPressed: () => onRemove!(item),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _ItemActionButton extends StatelessWidget {
  final String label;
  final String? semanticLabel;
  final InoPalette colors;
  final bool disabled;
  final bool danger;
  final VoidCallback onPressed;

  const _ItemActionButton({
    required this.label,
    this.semanticLabel,
    required this.colors,
    required this.disabled,
    this.danger = false,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: !disabled,
      label: semanticLabel ?? label,
      child: GestureDetector(
        onTap: disabled ? null : onPressed,
        child: Container(
          constraints: const BoxConstraints(minWidth: 44, minHeight: 24),
          padding: const EdgeInsets.symmetric(horizontal: InoSpace.s3),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(color: danger ? colors.danger : colors.border),
            borderRadius: BorderRadius.circular(InoRadius.sm),
          ),
          child: Opacity(
            opacity: disabled ? 0.5 : 1,
            child: Text(label,
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600, color: danger ? colors.dangerTextSafe : colors.onSurfaceMuted)),
          ),
        ),
      ),
    );
  }
}
