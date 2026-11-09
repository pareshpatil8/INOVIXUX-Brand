import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import {
  control,
  Palette,
  radius,
  rowMinHeight,
  space,
  type as typeScale,
} from '../theme/tokens';

export interface InoInputTag {
  value: string;
  label: string;
  invalid?: boolean;
}

export interface InoInputTagsSuggestion {
  label: string;
  value: string;
  disabled?: boolean;
}

export type InoInputTagsSize = 'sm' | 'default' | 'lg';

export interface InoInputTagsProps {
  label?: string;
  value?: InoInputTag[];
  suggestions?: InoInputTagsSuggestion[];
  placeholder?: string;
  hint?: string;
  error?: string;
  size?: InoInputTagsSize;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  allowDuplicates?: boolean;
  addOnBlur?: boolean;
  maxTags?: number | null;
  validateTag?: ((tag: string) => boolean) | null;
  separators?: string;
  onValueChange?: (value: InoInputTag[]) => void;
  onTagAdd?: (tag: InoInputTag) => void;
  onTagRemove?: (tag: InoInputTag) => void;
  onSearch?: (query: string) => void;
}

/**
 * `InoInputTags` — free-entry tag/chip input with autocomplete suggestions
 *
 * React Native port of the web component (INO-418, INO-31 Phase B1).
 *
 * **Features:**
 * - Free-entry tags: type and press Return/comma to add
 * - Autocomplete suggestions while typing
 * - Per-tag validation with visual invalid state
 * - Max tags limit with disabled input when reached
 * - Full a11y: proper labels, announcements, keyboard support
 *
 * **States:**
 * - `tag-invalid`: when `validateTag` returns false
 * - `at-max`: when tags length >= `maxTags`
 *
 * **Theming (INO-723).** Every colour below comes from `useTheme().colors`, so this port follows
 * dark / light / high-contrast like its siblings. Until INO-723 it hardcoded hex literals
 * (`#1f2937`, `#ef4444`, `#dbeafe`, …) and never imported the palette at all, which meant it had
 * no theme support whatsoever and could not be given a COMPONENT_REGISTRY entry. The roles match
 * the web component one-for-one — see `ino-inputtags.component.scss`'s header comment for the
 * per-surface mapping, and check-theme-parity.mjs's registry entry for the declared divergences.
 *
 * Contract: doc 26 §2 (Variants/Structure, States, Sizing, Labels, a11y, Mobile port).
 */
export const InoInputTags: React.FC<InoInputTagsProps> = ({
  label,
  value = [],
  suggestions = [],
  placeholder = 'Add tags…',
  hint,
  error,
  size = 'default',
  required = false,
  disabled = false,
  readOnly = false,
  allowDuplicates = false,
  addOnBlur = true,
  maxTags = null,
  validateTag = null,
  separators = ',',
  onValueChange,
  onTagAdd,
  onTagRemove,
  onSearch,
}) => {
  const { colors } = useTheme();
  const themed = useMemo(() => makeThemedStyles(colors), [colors]);

  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Mirrors the web field's `:focus-within` accent border. Tracked in state rather than read off
  // a pseudo-class because RN has none — the same `focused` flag InoInput.tsx keeps.
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isAtMax = maxTags !== null && value.length >= maxTags;

  const filteredSuggestions = suggestions.filter((s) =>
    s.label.toLowerCase().includes(inputValue.toLowerCase().trim())
  );

  const announce = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const addTag = useCallback(
    (text: string) => {
      if (isAtMax) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      if (!allowDuplicates && value.some((t) => t.value === trimmed)) {
        setInputValue('');
        return;
      }

      const isValid = validateTag ? validateTag(trimmed) : true;
      const newTag: InoInputTag = {
        value: trimmed,
        label: trimmed,
        invalid: !isValid,
      };

      const nextValue = [...value, newTag];
      onValueChange?.(nextValue);
      onTagAdd?.(newTag);
      announce(`Added ${trimmed}`);

      setInputValue('');
      setShowSuggestions(false);
    },
    [
      isAtMax,
      allowDuplicates,
      value,
      validateTag,
      onValueChange,
      onTagAdd,
      announce,
    ]
  );

  const removeTag = useCallback(
    (tag: InoInputTag) => {
      const nextValue = value.filter((t) => t !== tag);
      onValueChange?.(nextValue);
      onTagRemove?.(tag);
      announce(`Removed ${tag.label}`);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [value, onValueChange, onTagRemove, announce]
  );

  const selectSuggestion = useCallback(
    (suggestion: InoInputTagsSuggestion) => {
      if (suggestion.disabled) return;
      addTag(suggestion.value);
    },
    [addTag]
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setInputValue(text);
      onSearch?.(text);

      // Check for separator characters
      for (let i = 0; i < separators.length; i++) {
        if (text.endsWith(separators[i])) {
          const tagText = text.slice(0, -1).trim();
          if (tagText) {
            addTag(tagText);
          }
          return;
        }
      }

      setShowSuggestions(text.length > 0 && filteredSuggestions.length > 0);
    },
    [separators, filteredSuggestions.length, onSearch, addTag]
  );

  const handleSubmitEditing = useCallback(() => {
    if (inputValue.trim()) {
      addTag(inputValue.trim());
    }
  }, [inputValue, addTag]);

  const handleFocus = useCallback(() => setFocused(true), []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (addOnBlur && inputValue.trim()) {
      addTag(inputValue.trim());
    }
    setShowSuggestions(false);
  }, [addOnBlur, inputValue, addTag]);

  const sizeStyles = getSizeStyles(size);

  return (
    <View style={themed.container}>
      {label && (
        <View style={themed.labelContainer}>
          <Text style={themed.label}>
            {label}
            {required && <Text style={themed.required}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          themed.field,
          focused && !disabled && !readOnly && themed.fieldFocused,
          error && themed.fieldError,
          disabled && themed.fieldDisabled,
          readOnly && themed.fieldReadOnly,
          isAtMax && themed.fieldAtMax,
        ]}>
        <View style={themed.tagsContainer}>
          {value.map((tag, index) => (
            <View
              key={`${tag.value}-${index}`}
              style={[themed.tag, tag.invalid && themed.tagInvalid]}
              accessible={true}
              accessibilityLabel={`Tag ${tag.label}${
                tag.invalid ? ', invalid' : ''
              }`}
              accessibilityRole="button">
              <Text
                style={[
                  themed.tagLabel,
                  tag.invalid && themed.tagLabelInvalid,
                ]}>
                {tag.label}
              </Text>
              {!disabled && !readOnly && (
                <TouchableOpacity
                  onPress={() => removeTag(tag)}
                  accessibilityLabel={`Remove ${tag.label}`}
                  accessibilityRole="button"
                  style={themed.tagRemove}>
                  <Text
                    style={[
                      themed.tagRemoveIcon,
                      tag.invalid && themed.tagRemoveIconInvalid,
                    ]}>
                    ×
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TextInput
            ref={inputRef}
            style={[themed.input, sizeStyles.input]}
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSubmitEditing}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.onSurfaceSubtle}
            cursorColor={colors.accent}
            selectionColor={colors.accent}
            placeholder={value.length === 0 ? placeholder : ''}
            editable={!disabled && !readOnly && !isAtMax}
            accessible={true}
            accessibilityLabel={label}
            accessibilityHint={hint}
            accessibilityState={{
              disabled: disabled || isAtMax,
            }}
          />
        </View>
      </View>

      {showSuggestions && !isAtMax && filteredSuggestions.length > 0 && (
        <ScrollView
          style={themed.dropdown}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled>
          {filteredSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={`${suggestion.value}-${index}`}
              style={[
                themed.option,
                suggestion.disabled && themed.optionDisabled,
              ]}
              onPress={() => selectSuggestion(suggestion)}
              disabled={suggestion.disabled}
              accessible={true}
              accessibilityLabel={suggestion.label}
              accessibilityRole="button">
              <Text
                style={[
                  themed.optionLabel,
                  suggestion.disabled && themed.optionLabelDisabled,
                ]}>
                {suggestion.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {hint && !error && <Text style={themed.hint}>{hint}</Text>}
      {error && <Text style={themed.error}>{error}</Text>}
    </View>
  );
};

/**
 * Size axis. Only the input's own font size is driven by the control scale (`control[size]`,
 * tokens.css §12) — the chip keeps one fixed `bodySm` size across all three, matching both the
 * web component after INO-723 and `InoMultiSelect`'s chip. `minWidth` is the typing runway the
 * field keeps for the caret, scaled off the control's inline padding rather than hand-picked.
 */
function getSizeStyles(size: InoInputTagsSize) {
  const ctrl = control[size];
  return {
    input: { fontSize: ctrl.fontSize, minWidth: ctrl.paddingInline * 7.5 },
  };
}

/**
 * INO-723 — built per palette rather than once at module scope, because `StyleSheet.create` runs
 * at import time and the active theme is only known inside the tree. Memoised on `colors` at the
 * call site, so it rebuilds on a theme switch and never per render.
 */
function makeThemedStyles(colors: Palette) {
  return StyleSheet.create({
    container: {
      marginBottom: space[4],
    },
    labelContainer: {
      marginBottom: space[2],
    },
    label: {
      ...typeScale.label,
      color: colors.onSurface,
    },
    // dangerTextSafe, not danger: the marker is running text on a surface, and `danger` is the
    // non-text fill red (4.16:1 in dark — fails AA 1.4.3). Same split the web required-marker
    // role makes.
    required: {
      color: colors.dangerTextSafe,
    },
    field: {
      minHeight: rowMinHeight,
      padding: space[1],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceSunken,
    },
    // Listed before fieldError in the style array at the call site, so an invalid-and-focused
    // field still reads danger — same precedence the web component's rule order gives it.
    fieldFocused: {
      borderColor: colors.accent,
    },
    fieldError: {
      borderColor: colors.danger,
    },
    // Readonly re-fills, disabled dims — kept distinct for the reason ino-input documents: a
    // readonly field's value is still meant to be read and copied.
    fieldReadOnly: {
      backgroundColor: colors.surfaceRaised,
    },
    // Disabled dims only — it does not swap the fill, matching the web component's
    // `.ino-inputtags__field--disabled` after INO-723 (readonly is the state that re-fills, and
    // this port has no separate readonly chrome — see the registry divergence).
    fieldDisabled: {
      opacity: 0.5,
    },
    fieldAtMax: {
      opacity: 0.7,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: space[1],
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: space[1],
      paddingHorizontal: space[2],
    },
    tagInvalid: {
      borderColor: colors.danger,
    },
    tagLabel: {
      ...typeScale.bodySm,
      color: colors.onSurface,
    },
    tagLabelInvalid: {
      color: colors.dangerTextSafe,
    },
    tagRemove: {
      alignItems: 'center',
      justifyContent: 'center',
      width: space[6],
      height: space[6],
      borderRadius: space[6] / 2,
    },
    tagRemoveIcon: {
      fontSize: typeScale.bodyLg.fontSize,
      lineHeight: typeScale.bodyLg.lineHeight,
      color: colors.onSurface,
      fontWeight: 'bold',
    },
    tagRemoveIconInvalid: {
      color: colors.dangerTextSafe,
    },
    input: {
      ...typeScale.body,
      minWidth: 120,
      padding: 0,
      color: colors.onSurface,
    },
    dropdown: {
      maxHeight: 280,
      marginTop: space[1],
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      // Android's `elevation` draws a platform-coloured shadow and needs no role. iOS would need
      // an explicit `shadowColor`, and there is no shadow/elevation role in the palette to read
      // one from — tokens.ts flags that gap explicitly ("no shadow/elevation tokens exist in this
      // file"). Rather than hardcode '#000' (which INO-723 is removing from this file, and which
      // is the wrong shadow for light and meaningless in high-contrast), the panel separates on
      // iOS the way the rest of the system does: the surfaceRaised fill against a border role.
      ...Platform.select({ android: { elevation: 4 } }),
    },
    option: {
      minHeight: rowMinHeight,
      justifyContent: 'center',
      paddingVertical: space[2],
      paddingHorizontal: space[4],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
    },
    optionDisabled: {
      opacity: 0.5,
    },
    optionLabel: {
      ...typeScale.body,
      color: colors.onSurface,
    },
    optionLabelDisabled: {
      color: colors.onSurfaceSubtle,
    },
    hint: {
      ...typeScale.bodySm,
      marginTop: space[1],
      color: colors.onSurfaceMuted,
    },
    error: {
      ...typeScale.bodySm,
      marginTop: space[1],
      fontWeight: '600',
      color: colors.dangerTextSafe,
    },
  });
}
