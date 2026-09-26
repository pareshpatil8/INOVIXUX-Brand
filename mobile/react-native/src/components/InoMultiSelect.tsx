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
 * `<InoMultiSelect>` — RN port of `<ino-multiselect>`
 * (`web/src/app/components/multiselect`, INO-153 / INO-31 T-10).
 *
 * Mirrors `InoSelect`'s (INO-152/INO-258) porting scope and idiom exactly — same trigger +
 * modal-bottom-sheet pattern, same theming/token-reading approach (`useTheme()`, `control[size]`)
 * — with the multi-selection surfaces web's SPEC.md §1 calls out: `value`/`onChange` are
 * `string[]`, rows are checkable and the sheet stays open across taps, the trigger shows a chip
 * row or a comma summary, an optional "select all visible" row, and a hard `selectionLimit`.
 * Deliberately **not** ported — option groups, virtual scrolling, and (not applicable to this
 * component in the first place) the editable free-text trigger. See
 * `web/src/app/components/multiselect/SPEC.md` §9 for each omission's reasoning.
 *
 * **Overlay idiom / ARIA substitution** — identical to `InoSelect`'s: a scrimmed bottom sheet
 * (`overlayScrim`/`borderSoft`), and RN's lack of `listbox`/`option`/`aria-multiselectable`
 * concepts means each row is a `button` carrying `accessibilityState.selected` — the same
 * substitution `InoDatepicker`/`InoSelect` already make.
 */

export type InoMultiSelectSize = ControlSize;

export interface InoMultiSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface InoMultiSelectProps {
  label?: string;
  options: InoMultiSelectOption[];
  /** `[]` = no selection, matching the web component's `@Input() value: string[]` contract. */
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  size?: InoMultiSelectSize;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  /** Adds a search box at the top of the sheet that narrows the visible options without touching
   *  `value` — same contract as the web component's `filter` input. */
  filter?: boolean;
  filterPlaceholder?: string;
  /** `'chip'` (default) renders a wrapping row of dismissible chips on the trigger; `'comma'`
   *  renders one truncated `"A, B, C"` text summary — same contract as web's `display` input. */
  display?: 'chip' | 'comma';
  /** Chip mode only — chips beyond this count collapse into a `"+K more"` indicator. */
  maxSelectedLabels?: number;
  /** Renders a "select all visible" row at the top of the sheet. */
  selectAll?: boolean;
  /** Hard cap on `value.length` — unselected rows become non-interactive once reached. */
  selectionLimit?: number | null;
  /** Sheet heading; defaults to `label`, then `placeholder`. */
  sheetTitle?: string;
  onFilterChange?: (text: string) => void;
  onOpenChange?: (open: boolean) => void;
  onClear?: () => void;
}

export function InoMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select options',
  hint,
  error,
  size = 'default',
  required = false,
  disabled = false,
  loading = false,
  clearable = false,
  filter = false,
  filterPlaceholder = 'Search…',
  display = 'chip',
  maxSelectedLabels = 3,
  selectAll = false,
  selectionLimit = null,
  sheetTitle,
  onFilterChange,
  onOpenChange,
  onClear,
}: InoMultiSelectProps) {
  const { colors } = useTheme();
  const c = control[size];
  const invalid = !!error;
  const nonInteractive = disabled || loading;

  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  // Same predicate as the web component's `recomputeFiltered()` — trimmed, lower-cased substring
  // match on the label. Flat array only: there is no `group` field on this port's option type.
  const filtered = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    return query ? options.filter((option) => option.label.toLowerCase().includes(query)) : options;
  }, [options, filterText]);

  const atLimit = selectionLimit != null && value.length >= selectionLimit;

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) {
      setFilterText('');
    }
  };

  const toggle = () => {
    if (nonInteractive) {
      return;
    }
    setOpenState(!open);
  };

  // Toggles one option's membership — never closes the sheet, matching web's "stays open across
  // selections" contract (SPEC.md §2).
  const toggleOption = (option: InoMultiSelectOption) => {
    if (option.disabled) {
      return;
    }
    const selected = value.includes(option.value);
    if (!selected && atLimit) {
      return;
    }
    onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value]);
  };

  const removeChip = (option: InoMultiSelectOption) => {
    toggleOption(option);
  };

  const visibleEnabledValues = filtered.filter((o) => !o.disabled).map((o) => o.value);
  const selectAllChecked = visibleEnabledValues.length > 0 && visibleEnabledValues.every((v) => value.includes(v));
  const selectAllIndeterminate =
    !selectAllChecked && visibleEnabledValues.some((v) => value.includes(v));

  const toggleSelectAll = () => {
    if (!visibleEnabledValues.length) {
      return;
    }
    if (selectAllChecked) {
      onChange(value.filter((v) => !visibleEnabledValues.includes(v)));
      return;
    }
    const toAdd = visibleEnabledValues.filter((v) => !value.includes(v));
    const remaining = selectionLimit != null ? Math.max(0, selectionLimit - value.length) : toAdd.length;
    onChange([...value, ...toAdd.slice(0, remaining)]);
  };

  const clearAll = () => {
    onChange([]);
    onClear?.();
  };

  const showClear = clearable && value.length > 0 && !disabled && !loading;
  const visibleChips = selectedOptions.slice(0, maxSelectedLabels);
  const overflowCount = Math.max(0, selectedOptions.length - maxSelectedLabels);
  const commaSummary = selectedOptions.map((o) => o.label).join(', ');

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
          accessibilityValue={{
            text: selectedOptions.length ? selectedOptions.map((o) => o.label).join(', ') : placeholder,
          }}
          accessibilityState={{ disabled, expanded: open, busy: loading }}
          accessibilityHint="Opens a list of selectable options"
          style={({ pressed }) => [
            styles.control,
            {
              minHeight: c.height,
              paddingHorizontal: c.paddingInline,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceSunken,
              borderColor: invalid ? colors.danger : open || pressed ? colors.accent : colors.border,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {!selectedOptions.length ? (
            <Text
              numberOfLines={1}
              style={[styles.value, { fontSize: c.fontSize, color: colors.onSurfaceSubtle }]}
            >
              {placeholder}
            </Text>
          ) : display === 'comma' ? (
            <Text
              numberOfLines={1}
              style={[styles.value, { fontSize: c.fontSize, color: colors.onSurface }]}
            >
              {commaSummary}
            </Text>
          ) : (
            <View style={styles.chipRow}>
              {visibleChips.map((chip) => (
                <View
                  key={chip.value}
                  style={[styles.chip, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
                >
                  <Text numberOfLines={1} style={{ fontSize: c.fontSize - 2, color: colors.onSurface }}>
                    {chip.label}
                  </Text>
                  <Pressable
                    onPress={() => removeChip(chip)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${chip.label}`}
                    hitSlop={8}
                  >
                    <Text style={{ color: colors.onSurfaceMuted, fontSize: c.fontSize }}>×</Text>
                  </Pressable>
                </View>
              ))}
              {overflowCount > 0 ? (
                <Text style={{ fontSize: c.fontSize - 2, color: colors.onSurfaceMuted }}>
                  +{overflowCount} more
                </Text>
              ) : null}
            </View>
          )}

          {loading ? <ActivityIndicator size="small" color={colors.onSurfaceMuted} /> : null}

          {showClear ? (
            <Pressable
              onPress={clearAll}
              accessibilityRole="button"
              accessibilityLabel="Clear all selections"
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

          {selectAll && filtered.length ? (
            <Pressable
              onPress={toggleSelectAll}
              accessibilityRole="button"
              accessibilityState={{ checked: selectAllIndeterminate ? 'mixed' : selectAllChecked }}
              style={[styles.option, styles.selectAllRow, { borderBottomColor: colors.border }]}
            >
              <Text style={{ fontSize: c.fontSize, color: colors.onSurfaceMuted }}>
                {selectAllChecked ? '☑' : selectAllIndeterminate ? '◪' : '☐'}
              </Text>
              <Text style={{ flex: 1, fontSize: c.fontSize, fontWeight: '600', color: colors.onSurface }}>
                Select all
              </Text>
            </Pressable>
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
                const selected = value.includes(item.value);
                const rowDisabled = !!item.disabled || (atLimit && !selected);
                return (
                  <Pressable
                    onPress={() => toggleOption(item)}
                    disabled={rowDisabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: rowDisabled }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        minHeight: targetComfortable,
                        paddingHorizontal: c.paddingInline,
                        backgroundColor: pressed && !rowDisabled ? colors.surfaceSunken : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: c.fontSize,
                        color: rowDisabled ? colors.onSurfaceSubtle : colors.onSurfaceMuted,
                      }}
                    >
                      {selected ? '☑' : '☐'}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: c.fontSize,
                        color: rowDisabled ? colors.onSurfaceSubtle : selected ? colors.accentTextSafe : colors.onSurface,
                        fontWeight: selected ? '600' : '400',
                      }}
                    >
                      {item.label}
                    </Text>
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
  control: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: space[2] },
  value: { flex: 1 },
  chipRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
  },
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
  selectAllRow: { borderBottomWidth: 1, paddingHorizontal: 0 },
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  empty: { ...type.bodySm, paddingVertical: space[4] },
});
