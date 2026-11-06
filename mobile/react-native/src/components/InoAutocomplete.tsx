import React, { useEffect, useMemo, useRef, useState } from 'react';
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
 * `<InoAutocomplete>` — RN port of `<ino-autocomplete>`
 * (`web/src/app/components/autocomplete`, INO-400 / INO-31 Phase B1).
 *
 * Shipped in this issue, not deferred (unlike `InoSelect`'s INO-258 split) — see
 * `web/src/app/components/autocomplete/SPEC.md` §10. Mirrors `InoSelect`'s/`InoMultiSelect`'s
 * trigger + modal-bottom-sheet idiom exactly (`useTheme()`, `control[size]`), extended with:
 * a debounced `onSearch` callback (the async-datasource hook, same 250ms window web's `search`
 * output uses), `forceSelection` (single mode only — matches web's SPEC.md §5 scoping), and
 * `maxSelected` (multiple mode, same dim-not-lock rule as `InoMultiSelect`'s `selectionLimit`).
 * Deliberately **not** ported — option groups, virtual scrolling (both `InoSelect`'s/
 * `InoMultiSelect`'s own reasons, unchanged), and web's `mode="inline"` (the sheet idiom already
 * is this port's answer to the keyboard/safe-area problem `inline` doesn't solve on a phone — see
 * SPEC.md §10b). Every option list here behaves as web's `mode="dropdown"` rendered as a sheet.
 *
 * **Overlay idiom / ARIA substitution** — identical to `InoSelect`'s: a scrimmed bottom sheet
 * (`overlayScrim`/`borderSoft`), and RN's lack of `combobox`/`listbox`/`option`/
 * `aria-activedescendant` concepts means the trigger is a `button`/`TextInput` carrying
 * `accessibilityState`, and each row is a `button` carrying `accessibilityState.selected` — the
 * same substitution `InoDatepicker`/`InoSelect`/`InoMultiSelect` already make.
 */

export type InoAutocompleteSize = ControlSize;

export interface InoAutocompleteOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface InoAutocompleteProps {
  label?: string;
  options: InoAutocompleteOption[];
  /** `string` when `multiple` is `false` (default), `string[]` when `true` — same union web's
   *  `@Input() value` uses (SPEC.md §2). */
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  size?: InoAutocompleteSize;
  required?: boolean;
  disabled?: boolean;
  /** Suppresses row selection only — typing/searching stays live. Same contract as web's
   *  `loading` input (SPEC.md §7). */
  loading?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  /** Single mode only. `true` clears the query/value on sheet dismiss when the typed text matches
   *  no option; `false` (default) accepts it verbatim. See SPEC.md §5. */
  forceSelection?: boolean;
  /** Multiple mode only. Hard cap on `value.length` — unselected rows dim once reached, existing
   *  chips stay removable. `null` (default) = no limit. */
  maxSelected?: number | null;
  /** Sheet heading; defaults to `label`, then `placeholder`. */
  sheetTitle?: string;
  /** Debounced (250ms, matching web's `SEARCH_DEBOUNCE_MS`) — the async-datasource hook. Fires on
   *  every query change, not on selection. */
  onSearch?: (query: string) => void;
  onOpenChange?: (open: boolean) => void;
  onClear?: () => void;
}

const SEARCH_DEBOUNCE_MS = 250;

export function InoAutocomplete({
  label,
  options,
  value,
  onChange,
  placeholder = 'Type to search…',
  hint,
  error,
  size = 'default',
  required = false,
  disabled = false,
  loading = false,
  clearable = false,
  multiple = false,
  forceSelection = false,
  maxSelected = null,
  sheetTitle,
  onSearch,
  onOpenChange,
  onClear,
}: InoAutocompleteProps) {
  const { colors } = useTheme();
  const c = control[size];
  const invalid = !!error;
  const nonInteractive = disabled;

  const [open, setOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const valuesArray = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);

  const selectedOption = useMemo(
    () => (multiple ? null : options.find((option) => option.value === value) ?? null),
    [multiple, options, value],
  );
  const selectedOptions = useMemo(
    () => options.filter((option) => valuesArray.includes(option.value)),
    [options, valuesArray],
  );

  // Same predicate as the web component's `recomputeFiltered()` — trimmed, lower-cased substring
  // match on the label. Flat array only: there is no `group` field on this port's option type.
  const filtered = useMemo(() => {
    const query = queryText.trim().toLowerCase();
    return query ? options.filter((option) => option.label.toLowerCase().includes(query)) : options;
  }, [options, queryText]);

  const atMax = multiple && maxSelected != null && valuesArray.length >= maxSelected;

  useEffect(() => () => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
  }, []);

  const onQueryChange = (text: string) => {
    setQueryText(text);
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    searchTimer.current = setTimeout(() => onSearch?.(text), SEARCH_DEBOUNCE_MS);
  };

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) {
      setQueryText(multiple ? '' : selectedOption?.label ?? (typeof value === 'string' ? value : ''));
    } else if (!multiple && forceSelection) {
      // Match-or-clear on dismiss (SPEC.md §5) — the same enforcement point web's
      // `onDocumentClick`/`Tab` handlers use.
      const match = options.find((o) => o.label.toLowerCase() === queryText.trim().toLowerCase());
      if (match) {
        onChange(match.value);
      } else if (queryText.trim() && queryText.trim() !== (selectedOption?.label ?? '')) {
        onChange('');
      }
    }
  };

  const openSheet = () => {
    if (nonInteractive) {
      return;
    }
    setOpenState(true);
  };

  const selectSingle = (option: InoAutocompleteOption) => {
    if (option.disabled || loading) {
      return;
    }
    onChange(option.value);
    setOpen(false);
    onOpenChange?.(false);
  };

  // Toggles one option's membership — never closes the sheet, matching InoMultiSelect's "stays
  // open across selections" contract.
  const toggleMulti = (option: InoAutocompleteOption) => {
    if (option.disabled || loading) {
      return;
    }
    const selected = valuesArray.includes(option.value);
    if (!selected && atMax) {
      return;
    }
    onChange(selected ? valuesArray.filter((v) => v !== option.value) : [...valuesArray, option.value]);
    setQueryText('');
  };

  const selectOption = (option: InoAutocompleteOption) => {
    multiple ? toggleMulti(option) : selectSingle(option);
  };

  const removeChip = (option: InoAutocompleteOption) => {
    toggleMulti(option);
  };

  const clear = () => {
    onChange(multiple ? [] : '');
    setQueryText('');
    onClear?.();
  };

  const showClear = clearable && (multiple ? selectedOptions.length > 0 : !!value) && !disabled && !loading;

  return (
    <View style={styles.field}>
      {label ? (
        <InoLabel size={size} required={required} disabled={disabled} invalid={invalid}>
          {label}
        </InoLabel>
      ) : null}

      <View style={styles.controlWrap}>
        <Pressable
          onPress={openSheet}
          disabled={nonInteractive}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{
            text: multiple
              ? selectedOptions.length
                ? selectedOptions.map((o) => o.label).join(', ')
                : placeholder
              : selectedOption?.label ?? placeholder,
          }}
          accessibilityState={{ disabled, expanded: open, busy: loading }}
          accessibilityHint="Opens a searchable list of suggestions"
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
          {multiple && selectedOptions.length ? (
            <View style={styles.chipRow}>
              {selectedOptions.map((chip) => (
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
            </View>
          ) : (
            <Text
              numberOfLines={1}
              style={[
                styles.value,
                { fontSize: c.fontSize, color: selectedOption ? colors.onSurface : colors.onSurfaceSubtle },
              ]}
            >
              {selectedOption?.label ?? placeholder}
            </Text>
          )}

          {loading ? <ActivityIndicator size="small" color={colors.onSurfaceMuted} /> : null}

          {showClear ? (
            <Pressable
              onPress={clear}
              accessibilityRole="button"
              accessibilityLabel="Clear"
              hitSlop={8}
              style={styles.clear}
            >
              <Text style={{ color: colors.onSurfaceMuted, fontSize: c.iconSize }}>×</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.message, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : multiple && atMax ? (
        <Text style={[styles.message, { color: colors.onSurfaceMuted }]} accessibilityRole="text">
          Maximum {maxSelected} selected.
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.onSurfaceMuted }]}>{hint}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpenState(false)}>
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.overlayScrim }]}
          onPress={() => setOpenState(false)}
          accessibilityLabel="Close suggestions"
        />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <View style={[styles.grabber, { backgroundColor: colors.borderSoft }]} />
          <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>
            {sheetTitle ?? label ?? placeholder}
          </Text>

          <TextInput
            autoFocus
            value={queryText}
            onChangeText={onQueryChange}
            placeholder={placeholder}
            placeholderTextColor={colors.onSurfaceSubtle}
            accessibilityLabel={placeholder}
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

          {filtered.length ? (
            // FlatList, not the web component's `<ino-virtual-scroller>` — same rationale
            // virtual-scroller's own SPEC.md §1 gives for staying web-only.
            <FlatList
              data={filtered}
              keyExtractor={(option) => option.value}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const selected = valuesArray.includes(item.value);
                const rowDisabled = !!item.disabled || (atMax && !selected);
                return (
                  <Pressable
                    onPress={() => selectOption(item)}
                    disabled={rowDisabled || loading}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: rowDisabled || loading }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        minHeight: targetComfortable,
                        paddingHorizontal: c.paddingInline,
                        backgroundColor: pressed && !rowDisabled ? colors.surfaceSunken : 'transparent',
                      },
                    ]}
                  >
                    {multiple ? (
                      <Text
                        style={{
                          fontSize: c.fontSize,
                          color: rowDisabled ? colors.onSurfaceSubtle : colors.onSurfaceMuted,
                        }}
                      >
                        {selected ? '☑' : '☐'}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        flex: 1,
                        fontSize: c.fontSize,
                        color: rowDisabled
                          ? colors.onSurfaceSubtle
                          : selected
                            ? colors.accentTextSafe
                            : colors.onSurface,
                        fontWeight: selected ? '600' : '400',
                      }}
                    >
                      {item.label}
                    </Text>
                    {!multiple && selected ? (
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
            <Text style={[styles.empty, { color: colors.onSurfaceMuted }]}>
              {loading ? 'Searching…' : queryText.trim() ? 'No results found.' : 'No options.'}
            </Text>
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
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  empty: { ...type.bodySm, paddingVertical: space[4] },
});
