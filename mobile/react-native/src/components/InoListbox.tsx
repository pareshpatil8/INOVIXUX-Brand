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
 * `<InoListbox>` — RN port of `<ino-listbox>`
 * (`web/src/app/components/listbox`, INO-414 / INO-31 Phase B1).
 *
 * Doc 26 §5 calls for "mobile = full-screen sheet reuse of multiselect": an always-visible inline
 * list is a web-only layout choice (no phone screen has room to dedicate to a permanently
 * expanded list alongside the rest of a form), so this port is structurally `InoMultiSelect`'s
 * trigger-plus-modal-sheet, not `InoSelect`'s shorter, content-sized sheet. Single-selection mode
 * closes the sheet immediately on row tap (matching `InoSelect`'s close-on-select); multiple mode
 * keeps the sheet open across taps and requires an explicit dismiss (matching `InoMultiSelect`).
 * See `web/src/app/components/listbox/SPEC.md` §8.
 *
 * Deliberately **not** ported — option groups and virtual scrolling, same omissions
 * `InoMultiSelect`'s own port documents, for the same reasons (no shared build graph; mobile
 * option lists in this product are short enough that `FlatList`'s own windowing is sufficient).
 *
 * **Overlay idiom / ARIA substitution** — identical to `InoMultiSelect`'s: a scrimmed bottom
 * sheet, and RN's lack of a `listbox`/`option`/`aria-multiselectable` concept means each row is a
 * `button` carrying `accessibilityState.selected`.
 */

export type InoListboxSize = ControlSize;

export interface InoListboxOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface InoListboxSingleProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

interface InoListboxMultipleProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type InoListboxProps = (InoListboxSingleProps | InoListboxMultipleProps) & {
  label?: string;
  options: InoListboxOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
  size?: InoListboxSize;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Always-visible-on-web filter moves inside the sheet here (there is no inline list to filter
   *  above) — same contract as the web component's `filter` input, default `true`. */
  filter?: boolean;
  filterPlaceholder?: string;
  sheetTitle?: string;
  onFilterChange?: (text: string) => void;
  onOpenChange?: (open: boolean) => void;
};

export function InoListbox(props: InoListboxProps) {
  const {
    label,
    options,
    placeholder = 'Select',
    hint,
    error,
    size = 'default',
    required = false,
    disabled = false,
    loading = false,
    filter = true,
    filterPlaceholder = 'Filter…',
    sheetTitle,
    onFilterChange,
    onOpenChange,
    multiple,
    value,
    onChange,
  } = props;

  const { colors } = useTheme();
  const c = control[size];
  const invalid = !!error;
  const nonInteractive = disabled || loading;

  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const valuesArray = useMemo(() => (multiple ? value : value ? [value] : []), [multiple, value]);

  const selectedOptions = useMemo(
    () => options.filter((option) => valuesArray.includes(option.value)),
    [options, valuesArray],
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
      setFilterText('');
    }
  };

  const toggle = () => {
    if (nonInteractive) {
      return;
    }
    setOpenState(!open);
  };

  const activateOption = (option: InoListboxOption) => {
    if (option.disabled) {
      return;
    }
    if (multiple) {
      const selected = value.includes(option.value);
      onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value]);
      // Stays open — matches `InoMultiSelect`'s "stays open across selections" contract.
      return;
    }
    onChange(option.value);
    setOpenState(false);
  };

  const triggerLabel = selectedOptions.length
    ? selectedOptions.map((o) => o.label).join(', ')
    : placeholder;

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
          accessibilityValue={{ text: triggerLabel }}
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
          <Text
            numberOfLines={1}
            style={[
              styles.value,
              { fontSize: c.fontSize, color: selectedOptions.length ? colors.onSurface : colors.onSurfaceSubtle },
            ]}
          >
            {triggerLabel}
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
                const selected = valuesArray.includes(item.value);
                const rowDisabled = !!item.disabled;
                return (
                  <Pressable
                    onPress={() => activateOption(item)}
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
            <Text style={[styles.empty, { color: colors.onSurfaceMuted }]}>
              {filterText.trim() ? 'No options match your filter.' : 'No options.'}
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
  control: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: space[2] },
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
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetTitle: { ...type.h3 },
  filter: { borderWidth: 1 },
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  empty: { ...type.bodySm, paddingVertical: space[4] },
});
