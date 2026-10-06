import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space, targetComfortable, type } from '../theme/tokens';
import { InoLabel } from './InoLabel';

/**
 * `<InoCascadeSelect>` — RN port of `<ino-cascade-select>`
 * (`web/src/app/components/cascade-select`, INO-422 / INO-31 Phase B1).
 *
 * **Overlay idiom — stacked sheet pages, not an anchored popover.** Doc 26 §5's mobile
 * disposition for this row is literally "stacked sheet pages": each drill-in swaps the sheet's
 * visible content for the next level and renders a back chevron + breadcrumb header, the same
 * `path` + "what level is showing" state machine the web popup uses (see the web component's
 * SPEC.md §1) — rendered as one sheet whose content swaps, not a web anchored panel. There is no
 * real navigation stack; "stacked" describes the UX (back steps up exactly one level), not the
 * implementation, matching `InoSelect`'s own bottom-sheet idiom for the same pointer-vs-touch
 * reasoning (`docs/brand/13-mobile-app-patterns.md` §2).
 *
 * **ARIA.** Same substitution `InoSelect`'s own port documents: no `combobox`/`listbox`/`option`
 * role in RN, so the trigger is a `button` carrying `accessibilityState.expanded` and each row a
 * `button` carrying `accessibilityState.selected`.
 *
 * **Not ported**: custom option templates and virtual scrolling — same omissions `InoSelect`'s
 * port documents, for the same reason (cascading option trees in this product are shallow enough
 * per level that `FlatList` is sufficient).
 */

export type InoCascadeSelectSize = ControlSize;

export interface InoCascadeSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Non-empty makes this a drill target, never a selectable value — see the web component's
   *  SPEC.md §2. */
  children?: InoCascadeSelectOption[];
}

export interface InoCascadeSelectProps {
  label?: string;
  options: InoCascadeSelectOption[];
  /** Selected leaf's value. `''` = no selection. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  size?: InoCascadeSelectSize;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Sheet heading at the root level; defaults to `label`, then `placeholder`. */
  sheetTitle?: string;
  onOpenChange?: (open: boolean) => void;
}

/** DFS for the root-to-leaf path of options ending in `value`. `null` when nothing matches,
 *  including when `value` only matches a non-leaf option — parents are never valid values. */
function findPath(level: InoCascadeSelectOption[], value: string): InoCascadeSelectOption[] | null {
  for (const option of level) {
    if (!option.children?.length) {
      if (option.value === value) {
        return [option];
      }
      continue;
    }
    const childPath = findPath(option.children, value);
    if (childPath) {
      return [option, ...childPath];
    }
  }
  return null;
}

export function InoCascadeSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  hint,
  error,
  size = 'default',
  required = false,
  disabled = false,
  loading = false,
  sheetTitle,
  onOpenChange,
}: InoCascadeSelectProps) {
  const { colors } = useTheme();
  const c = control[size];
  const invalid = !!error;
  const nonInteractive = disabled || loading;

  const [open, setOpen] = useState(false);
  // Breadcrumb trail of ancestors chosen while the sheet is open — resets every time the sheet
  // opens/closes, same "reopen at root" rule the web component's `openPanel()` documents.
  const [path, setPath] = useState<InoCascadeSelectOption[]>([]);

  const selectedPath = useMemo(() => (value ? findPath(options, value) : null), [options, value]);
  const selectedLabel = selectedPath?.map((o) => o.label).join(' / ') ?? '';

  const currentOptions = path.length ? path[path.length - 1].children ?? [] : options;
  const pageTitle = path.length ? path.map((o) => o.label).join(' / ') : sheetTitle ?? label ?? placeholder;

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) {
      setPath([]);
    }
  };

  const toggle = () => {
    if (nonInteractive) {
      return;
    }
    setOpenState(!open);
  };

  const activateOption = (option: InoCascadeSelectOption) => {
    if (option.disabled) {
      return;
    }
    if (option.children?.length) {
      setPath((prev) => [...prev, option]);
    } else {
      onChange(option.value);
      setOpenState(false);
    }
  };

  const goBack = () => {
    setPath((prev) => prev.slice(0, -1));
  };

  return (
    <View style={styles.field}>
      {label ? (
        <InoLabel size={size} required={required} disabled={disabled} invalid={invalid}>
          {label}
        </InoLabel>
      ) : null}

      <View style={styles.controlWrap}>
        <Pressable
          onPress={toggle}
          disabled={nonInteractive}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: selectedLabel || placeholder }}
          accessibilityState={{ disabled, expanded: open, busy: loading }}
          accessibilityHint="Opens a nested list of options"
          style={({ pressed }) => [
            styles.control,
            {
              minHeight: c.height,
              paddingHorizontal: c.paddingInline,
              gap: c.gap,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceSunken,
              borderColor: invalid ? colors.danger : open || pressed ? colors.accent : colors.border,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.value,
              {
                fontSize: c.fontSize,
                color: selectedLabel ? colors.onSurface : colors.onSurfaceSubtle,
              },
            ]}
          >
            {selectedLabel || placeholder}
          </Text>

          {loading ? <ActivityIndicator size="small" color={colors.onSurfaceMuted} /> : null}

          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ color: colors.onSurfaceMuted, fontSize: c.iconSize - 6 }}
          >
            ▾
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.message, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.onSurfaceMuted }]}>{hint}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpenState(false)}>
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.overlayScrim }]}
          onPress={() => setOpenState(false)}
          accessibilityLabel="Close options"
        />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <View style={[styles.grabber, { backgroundColor: colors.borderSoft }]} />

          <View style={styles.sheetHeader}>
            {path.length ? (
              <Pressable
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={8}
                style={styles.back}
              >
                <Text style={{ fontSize: 16, color: colors.onSurfaceMuted }}>‹</Text>
              </Pressable>
            ) : null}
            <Text
              numberOfLines={1}
              style={[styles.sheetTitle, { flex: 1, color: colors.onSurface }]}
            >
              {pageTitle}
            </Text>
          </View>

          {currentOptions.length ? (
            // FlatList, not the web component's `<ino-virtual-scroller>` — same rationale
            // virtual-scroller's own SPEC.md §1 gives for staying web-only.
            <FlatList
              data={currentOptions}
              keyExtractor={(option) => option.value}
              style={styles.list}
              renderItem={({ item }) => {
                const hasChildren = !!item.children?.length;
                const selected = !hasChildren && item.value === value;
                return (
                  <Pressable
                    onPress={() => activateOption(item)}
                    disabled={item.disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !!item.disabled }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        minHeight: targetComfortable,
                        paddingHorizontal: c.paddingInline,
                        backgroundColor: pressed && !item.disabled ? colors.surfaceSunken : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: c.fontSize,
                        color: item.disabled
                          ? colors.onSurfaceSubtle
                          : selected
                            ? colors.accentTextSafe
                            : colors.onSurface,
                        fontWeight: selected ? '600' : '400',
                      }}
                    >
                      {item.label}
                    </Text>
                    {/* Colour is not the only selection cue (WCAG SC 1.4.1). */}
                    {selected ? (
                      <Text
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        style={{ color: colors.accentTextSafe, fontSize: c.fontSize }}
                      >
                        ✓
                      </Text>
                    ) : null}
                    {hasChildren ? (
                      <Text
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        style={{ color: colors.onSurfaceMuted, fontSize: c.fontSize }}
                      >
                        ›
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          ) : (
            <Text style={[styles.empty, { color: colors.onSurfaceMuted }]}>No options found.</Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  controlWrap: { position: 'relative', justifyContent: 'center' },
  control: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  value: { flex: 1 },
  message: { fontSize: 12.5 },
  scrim: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[7],
    gap: space[3],
  },
  grabber: { width: 36, height: 4, borderRadius: radius.sm, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  back: { minWidth: 24, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { ...type.h3 },
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  empty: { ...type.bodySm, paddingVertical: space[4] },
});
