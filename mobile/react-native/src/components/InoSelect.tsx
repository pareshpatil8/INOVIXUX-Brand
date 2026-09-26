import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space, targetComfortable, type } from '../theme/tokens';
import { InoLabel } from './InoLabel';

/**
 * `<InoSelect>` — RN port of `<ino-select>`
 * (`web/src/app/components/select`, INO-152 / INO-31 T-9; this port INO-258).
 *
 * Scope, per the plan rev 9 §5 porting rule ("React Native is a real port, ~40% the cost of the
 * web component") and mirroring `InoDatepicker`'s single-mode precedent: a trigger plus a modal
 * bottom-sheet option list, `size`, `disabled`/`loading`, `clearable`, and the in-panel filter
 * with the same case-insensitive substring semantics web uses. Deliberately **not** ported —
 * option groups, custom option/selected-value templates, virtual scrolling, and the editable
 * free-text trigger. See `web/src/app/components/select/SPEC.md` §9 for each omission's
 * reasoning (same file the datepicker's own mobile-scope decisions live in); they are documented
 * decisions, not gaps.
 *
 * **Overlay idiom.** Web anchors an absolutely-positioned panel under the trigger. This port
 * presents the same list in a scrimmed bottom sheet (`ConfirmActionSheet`'s idiom,
 * `docs/brand/13-mobile-app-patterns.md` §2) because an anchored popover under a field is a
 * pointer idiom: on a phone it collides with the keyboard and with the bottom safe area. This is
 * the one intentional *visual* divergence from web, and it is why this port reads `overlayScrim`
 * and `borderSoft` (roles web's select never touches) — both declared in
 * `scripts/check-theme-parity.mjs`.
 *
 * **ARIA.** Web uses the APG `aria-activedescendant` combobox contract. RN has no `combobox`,
 * `listbox` or `option` accessibility role and no activedescendant concept, so the trigger is a
 * `button` carrying `accessibilityState.expanded` and each row is a `button` carrying
 * `accessibilityState.selected` — the same substitution `InoDatepicker` makes for its day cells.
 * There is no RN hover or `:focus-visible` distinction (see `InoButton`'s doc comment); the
 * pressed/selected/disabled state set below is the full carryover from web.
 */

export type InoSelectSize = ControlSize;

export interface InoSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface InoSelectProps {
  label?: string;
  options: InoSelectOption[];
  /** `''` = no selection, matching the web component's `@Input() value` contract. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  size?: InoSelectSize;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  /** Adds a search box at the top of the sheet that narrows the visible options without
   *  touching `value` — same contract as the web component's `filter` input. */
  filter?: boolean;
  filterPlaceholder?: string;
  /** Sheet heading; defaults to `label`, then `placeholder`. Web has no equivalent — its panel is
   *  anchored to a labelled trigger that stays on screen, this sheet covers it. */
  sheetTitle?: string;
  onFilterChange?: (text: string) => void;
  onOpenChange?: (open: boolean) => void;
  onClear?: () => void;
}

export function InoSelect({
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
  clearable = false,
  filter = false,
  filterPlaceholder = 'Search…',
  sheetTitle,
  onFilterChange,
  onOpenChange,
  onClear,
}: InoSelectProps) {
  const { colors } = useTheme();
  const c = control[size];
  const invalid = !!error;
  const nonInteractive = disabled || loading;

  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  // Same predicate as the web component's `recomputeFiltered()` — trimmed, lower-cased substring
  // match on the label. Flat array only: there is no `group` field on this port's option type.
  const filtered = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    return query ? options.filter((option) => option.label.toLowerCase().includes(query)) : options;
  }, [options, filterText]);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) {
      // Web clears `filterText` in `close()` so the next open starts from the full list.
      setFilterText('');
    }
  };

  const toggle = () => {
    if (nonInteractive) {
      return;
    }
    setOpenState(!open);
  };

  const selectOption = (option: InoSelectOption) => {
    if (option.disabled) {
      return;
    }
    onChange(option.value);
    setOpenState(false);
  };

  const clear = () => {
    onChange('');
    onClear?.();
  };

  const showClear = clearable && !!value && !disabled && !loading;

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
          accessibilityValue={{ text: selectedOption?.label ?? placeholder }}
          accessibilityState={{ disabled, expanded: open, busy: loading }}
          accessibilityHint="Opens a list of options"
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
                color: selectedOption ? colors.onSurface : colors.onSurfaceSubtle,
              },
            ]}
          >
            {selectedOption?.label ?? placeholder}
          </Text>

          {loading ? <ActivityIndicator size="small" color={colors.onSurfaceMuted} /> : null}

          {showClear ? (
            <Pressable
              onPress={clear}
              accessibilityRole="button"
              accessibilityLabel="Clear selection"
              hitSlop={8}
              style={styles.clear}
            >
              <Text style={{ color: colors.onSurfaceMuted, fontSize: c.iconSize }}>×</Text>
            </Pressable>
          ) : null}

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
          <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>
            {sheetTitle ?? label ?? placeholder}
          </Text>

          {filter ? (
            <TextInput
              autoFocus
              value={filterText}
              onChangeText={(text) => {
                setFilterText(text);
                onFilterChange?.(text);
              }}
              placeholder={filterPlaceholder}
              placeholderTextColor={colors.onSurfaceSubtle}
              accessibilityLabel={filterPlaceholder}
              style={[
                styles.filter,
                {
                  minHeight: c.height,
                  paddingHorizontal: c.paddingInline,
                  fontSize: c.fontSize,
                  borderRadius: radius.md,
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceSunken,
                  borderColor: colors.border,
                },
              ]}
            />
          ) : null}

          {filtered.length ? (
            // FlatList, not the web component's `<ino-virtual-scroller>` — same rationale
            // virtual-scroller's own SPEC.md §1 gives for staying web-only: the platform list
            // primitive already windows rows and is strictly better than a port.
            <FlatList
              data={filtered}
              keyExtractor={(option) => option.value}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    onPress={() => selectOption(item)}
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
                        // Web tints the selected row's text with accent-text-safe rather than
                        // filling it with accent (ino-select.component.scss
                        // `.ino-field__option--selected`); the port keeps that exact treatment.
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
                    {/* Colour is not the only selection cue (WCAG SC 1.4.1) — web gets a second
                        cue from the bold weight plus the anchored panel's own selected styling;
                        a sheet row needs a glyph. */}
                    {selected ? (
                      <Text
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        style={{ color: colors.accentTextSafe, fontSize: c.fontSize }}
                      >
                        ✓
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
  clear: { minWidth: 24, alignItems: 'center', justifyContent: 'center' },
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
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetTitle: { ...type.h3 },
  filter: { borderWidth: 1 },
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  empty: { ...type.bodySm, paddingVertical: space[4] },
});
