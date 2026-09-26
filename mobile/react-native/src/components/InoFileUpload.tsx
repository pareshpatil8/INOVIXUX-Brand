import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space } from '../theme/tokens';

/**
 * `<InoFileUpload>` — RN port of `<ino-file-upload>`
 * (`web/src/app/components/file-upload`, INO-145 / INO-31 T-5). Full reasoning:
 * `web/src/app/components/file-upload/SPEC.md` §9.
 *
 * Scope, per the plan rev 9 §5 porting rule ("React Native is a real port, ~40% the cost of the
 * web component"):
 * - **No drag-and-drop.** RN has no drag-and-drop gesture for the OS file/photo picker on either
 *   platform — the web dropzone has no touch equivalent, so it is simply not rendered here rather
 *   than faked as an inert decoration.
 * - **No bundled document/image picker.** Adding one would mean pulling in a new native dependency
 *   (`react-native-document-picker`, `expo-image-picker`, …), which this repo's porting rule does
 *   not sanction mid-component — no other ported component reaches for a new vendor package (see
 *   `InoDatepicker`/`InoButton`'s own doc comments, which drop native-only affordances rather than
 *   add a dependency to fake them). Instead this component exposes an `onChoose: () => void` the
 *   HOST wires to whatever picker the app already uses, matching the "host owns the transport"
 *   shape `ino-file-upload`'s web `(upload)` intent already establishes (SPEC.md §1). Once the host
 *   has picked files, it should call the exported `validateFiles()` helper below (the same
 *   accept/maxFileSize/maxFiles rules the web component runs) before pushing the result into
 *   `items`/`onItemsChange`.
 * - **List UI (preview, status text, progress bar, cancel/retry/remove) is fully ported** — this is
 *   the expensive part, and is what actually needs to look and behave identically across all three
 *   tracks.
 *
 * There is no native RN "focus-visible"/hover distinction (see `InoButton`'s doc comment); the
 * pressed/disabled/loading state set below is the full carryover from web. `role="alert"` has no
 * RN equivalent — rejection/error text is wrapped in `accessibilityLiveRegion="assertive"`
 * (Android) as the closest analogue; iOS has no live-region primitive for arbitrary views, so
 * VoiceOver users there discover the same text by swiping onto it same as any other content.
 */

export type InoFileUploadItemStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface InoFileUploadItem {
  id: string;
  name: string;
  size: number;
  status: InoFileUploadItemStatus;
  /** 0-100, only meaningful while `status === 'uploading'`. */
  progress?: number;
  /** Shown when `status === 'error'`. */
  error?: string;
  /** Local preview URI (e.g. an image picker result's `uri`) — image previews only, same as web. */
  previewUri?: string;
  /** MIME type, when the host's picker supplies one — drives accept-matching + preview eligibility. */
  type?: string;
}

/** Shape the host's picker result must be reducible to before calling `validateFiles`. */
export interface InoFileUploadCandidate {
  name: string;
  size: number;
  type?: string;
  uri?: string;
}

export interface InoFileUploadRejection {
  candidate: InoFileUploadCandidate;
  reason: 'accept' | 'size' | 'maxFiles';
  message: string;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

let itemIdCounter = 0;

/**
 * Mirrors the web component's `matchesAccept`/`addFiles` validation (SPEC.md §4), scoped to what
 * an RN picker result can actually tell us: `accept` here is MIME-prefix rules only (`'image/'`,
 * `'application/pdf'`) — extension-based rules (`.pdf`) are not evaluated, since neither iOS nor
 * Android picker APIs reliably surface the file extension the way a web `<input accept>` grammar
 * does.
 */
export function validateFiles(
  candidates: InoFileUploadCandidate[],
  opts: { accept?: string[]; maxFileSize?: number; maxFiles?: number; existingCount?: number } = {},
): { accepted: InoFileUploadItem[]; rejections: InoFileUploadRejection[] } {
  const { accept = [], maxFileSize = 0, maxFiles = 0, existingCount = 0 } = opts;
  const accepted: InoFileUploadItem[] = [];
  const rejections: InoFileUploadRejection[] = [];
  let count = existingCount;

  for (const candidate of candidates) {
    if (maxFiles > 0 && count >= maxFiles) {
      rejections.push({
        candidate,
        reason: 'maxFiles',
        message: `Only ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed.`,
      });
      continue;
    }
    const type = (candidate.type ?? '').toLowerCase();
    if (accept.length && !accept.some((rule) => type.startsWith(rule.toLowerCase()))) {
      rejections.push({ candidate, reason: 'accept', message: `${candidate.name} is not an accepted file type.` });
      continue;
    }
    if (maxFileSize > 0 && candidate.size > maxFileSize) {
      rejections.push({
        candidate,
        reason: 'size',
        message: `${candidate.name} exceeds the ${formatBytes(maxFileSize)} limit.`,
      });
      continue;
    }
    accepted.push({
      id: `ino-file-upload-item-${++itemIdCounter}`,
      name: candidate.name,
      size: candidate.size,
      type: candidate.type,
      previewUri: type.startsWith('image/') ? candidate.uri : undefined,
      status: 'idle',
    });
    count++;
  }

  return { accepted, rejections };
}

export interface InoFileUploadProps {
  label?: string;
  hint?: string;
  error?: string;
  size?: ControlSize;
  items: InoFileUploadItem[];
  rejections?: InoFileUploadRejection[];
  onDismissRejections?: () => void;
  /** The host wires this to whatever native picker the app uses — see the class doc comment. */
  onChoose: () => void;
  onCancel?: (item: InoFileUploadItem) => void;
  onRetry?: (item: InoFileUploadItem) => void;
  onRemove?: (item: InoFileUploadItem) => void;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  chooseLabel?: string;
}

export function InoFileUpload({
  label,
  hint,
  error,
  size = 'default',
  items,
  rejections = [],
  onDismissRejections,
  onChoose,
  onCancel,
  onRetry,
  onRemove,
  disabled = false,
  readonly = false,
  loading = false,
  chooseLabel = 'Choose files',
}: InoFileUploadProps) {
  const { colors } = useTheme();
  const c = control[size];
  const invalid = !!error;
  const nonInteractive = disabled || loading;

  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text> : null}

      <Pressable
        onPress={nonInteractive || readonly ? undefined : onChoose}
        disabled={nonInteractive}
        accessibilityRole="button"
        accessibilityLabel={chooseLabel}
        accessibilityState={{ disabled: nonInteractive, busy: loading }}
        style={({ pressed }) => [
          styles.choose,
          {
            minHeight: c.height,
            paddingHorizontal: c.paddingInlineRoomy,
            borderRadius: radius.md,
            borderColor: invalid ? colors.danger : pressed ? colors.accentActive : colors.border,
            backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceRaised,
            opacity: nonInteractive ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.row}>
          {loading && <ActivityIndicator size="small" color={colors.onSurfaceMuted} />}
          <Text style={{ color: colors.onSurface, fontSize: c.fontSize, fontWeight: '600' }}>{chooseLabel}</Text>
        </View>
      </Pressable>

      {items.length > 0 && (
        <View style={styles.list}>
          {items.map((item) => (
            <FileRow
              key={item.id}
              item={item}
              colors={colors}
              disabled={disabled}
              readonly={readonly}
              onCancel={onCancel}
              onRetry={onRetry}
              onRemove={onRemove}
            />
          ))}
        </View>
      )}

      {rejections.length > 0 && (
        <View
          style={[styles.rejections, { borderColor: colors.danger, backgroundColor: colors.surfaceRaised }]}
          accessibilityLiveRegion="assertive"
        >
          <Text style={[styles.rejectionsTitle, { color: colors.dangerTextSafe }]}>
            Some files were not accepted
          </Text>
          {rejections.map((r, i) => (
            <Text key={i} style={[styles.rejectionsItem, { color: colors.onSurface }]}>
              {r.message}
            </Text>
          ))}
          {onDismissRejections && (
            <Pressable onPress={onDismissRejections} accessibilityRole="button" accessibilityLabel="Dismiss">
              <Text style={[styles.dismiss, { color: colors.onSurfaceMuted }]}>Dismiss</Text>
            </Pressable>
          )}
        </View>
      )}

      {error ? (
        <Text style={[styles.message, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.onSurfaceMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

function FileRow({
  item,
  colors,
  disabled,
  readonly,
  onCancel,
  onRetry,
  onRemove,
}: {
  item: InoFileUploadItem;
  colors: ReturnType<typeof useTheme>['colors'];
  disabled: boolean;
  readonly: boolean;
  onCancel?: (item: InoFileUploadItem) => void;
  onRetry?: (item: InoFileUploadItem) => void;
  onRemove?: (item: InoFileUploadItem) => void;
}) {
  const statusText =
    item.status === 'uploading'
      ? `Uploading… ${item.progress ?? 0}%`
      : item.status === 'success'
        ? 'Uploaded'
        : item.status === 'error'
          ? item.error || 'Upload failed'
          : 'Ready to upload';

  return (
    <View
      style={[
        styles.row_item,
        { minHeight: 44, borderColor: item.status === 'error' ? colors.danger : colors.border, backgroundColor: colors.surfaceRaised },
      ]}
    >
      <View style={[styles.preview, { backgroundColor: colors.surfaceSunken }]}>
        {item.previewUri ? (
          <Image source={{ uri: item.previewUri }} style={styles.thumb} accessibilityIgnoresInvertColors />
        ) : (
          <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>FILE</Text>
        )}
      </View>

      <View style={styles.meta}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.onSurface }]}>
          {item.name}
        </Text>
        <Text style={[styles.size, { color: colors.onSurfaceMuted }]}>{formatBytes(item.size)}</Text>
        <Text
          style={[styles.status, { color: item.status === 'error' ? colors.dangerTextSafe : colors.onSurfaceMuted }]}
          accessibilityLiveRegion="polite"
        >
          {statusText}
        </Text>
        {item.status === 'uploading' && (
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSunken }]}>
            <View style={[styles.progressFill, { width: `${item.progress ?? 0}%`, backgroundColor: colors.accent }]} />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {item.status === 'uploading' && onCancel && (
          <ActionButton label="Cancel" colors={colors} disabled={disabled} onPress={() => onCancel(item)} />
        )}
        {item.status === 'error' && onRetry && (
          <ActionButton label="Retry" colors={colors} disabled={disabled} onPress={() => onRetry(item)} />
        )}
        {onRemove && (
          <ActionButton
            label="Remove"
            accessibilityLabel={`Remove ${item.name}`}
            colors={colors}
            disabled={disabled || readonly}
            danger
            onPress={() => onRemove(item)}
          />
        )}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  accessibilityLabel,
  colors,
  disabled,
  danger,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  colors: ReturnType<typeof useTheme>['colors'];
  disabled: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          borderColor: danger ? colors.danger : pressed ? colors.accentActive : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text style={{ color: danger ? colors.dangerTextSafe : colors.onSurfaceMuted, fontSize: 12, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  label: { fontSize: 14.5, fontWeight: '600' },
  choose: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  list: { gap: space[2] },
  row_item: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[2] },
  preview: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  meta: { flex: 1, gap: space[1] },
  name: { fontSize: 12.5, fontWeight: '600' },
  size: { fontSize: 11 },
  status: { fontSize: 11 },
  progressTrack: { height: 4, borderRadius: radius.pill, overflow: 'hidden', marginTop: space[1] },
  progressFill: { height: '100%' },
  actions: { flexDirection: 'row', gap: space[2] },
  actionBtn: { minWidth: 44, minHeight: 24, paddingHorizontal: space[3], borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rejections: { borderWidth: 1, borderRadius: radius.md, padding: space[4], gap: space[2] },
  rejectionsTitle: { fontSize: 12.5, fontWeight: '600' },
  rejectionsItem: { fontSize: 12.5 },
  dismiss: { fontSize: 12, fontWeight: '600' },
  message: { fontSize: 12.5 },
});
