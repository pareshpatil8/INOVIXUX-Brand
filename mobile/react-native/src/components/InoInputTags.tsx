import React, { useState, useRef, useCallback } from 'react';
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
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  const handleBlur = useCallback(() => {
    if (addOnBlur && inputValue.trim()) {
      addTag(inputValue.trim());
    }
    setShowSuggestions(false);
  }, [addOnBlur, inputValue, addTag]);

  const sizeStyles = getSizeStyles(size);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.field,
          error && styles.fieldError,
          disabled && styles.fieldDisabled,
          isAtMax && styles.fieldAtMax,
        ]}>
        <View style={styles.tagsContainer}>
          {value.map((tag, index) => (
            <View
              key={`${tag.value}-${index}`}
              style={[
                styles.tag,
                sizeStyles.tag,
                tag.invalid && styles.tagInvalid,
              ]}
              accessible={true}
              accessibilityLabel={`Tag ${tag.label}${
                tag.invalid ? ', invalid' : ''
              }`}
              accessibilityRole="button">
              <Text
                style={[
                  styles.tagLabel,
                  sizeStyles.tagLabel,
                  tag.invalid && styles.tagLabelInvalid,
                ]}>
                {tag.label}
              </Text>
              {!disabled && !readOnly && (
                <TouchableOpacity
                  onPress={() => removeTag(tag)}
                  accessibilityLabel={`Remove ${tag.label}`}
                  accessibilityRole="button"
                  style={styles.tagRemove}>
                  <Text
                    style={[
                      styles.tagRemoveIcon,
                      tag.invalid && styles.tagRemoveIconInvalid,
                    ]}>
                    ×
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TextInput
            ref={inputRef}
            style={[styles.input, sizeStyles.input]}
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSubmitEditing}
            onBlur={handleBlur}
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
          style={styles.dropdown}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled>
          {filteredSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={`${suggestion.value}-${index}`}
              style={[
                styles.option,
                suggestion.disabled && styles.optionDisabled,
              ]}
              onPress={() => selectSuggestion(suggestion)}
              disabled={suggestion.disabled}
              accessible={true}
              accessibilityLabel={suggestion.label}
              accessibilityRole="button">
              <Text
                style={[
                  styles.optionLabel,
                  suggestion.disabled && styles.optionLabelDisabled,
                ]}>
                {suggestion.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

function getSizeStyles(size: InoInputTagsSize) {
  switch (size) {
    case 'sm':
      return {
        tag: { paddingVertical: 2, paddingHorizontal: 6 },
        tagLabel: { fontSize: 12 },
        input: { fontSize: 12, minWidth: 100 },
      };
    case 'lg':
      return {
        tag: { paddingVertical: 8, paddingHorizontal: 12 },
        tagLabel: { fontSize: 16 },
        input: { fontSize: 16, minWidth: 140 },
      };
    default:
      return {
        tag: { paddingVertical: 4, paddingHorizontal: 8 },
        tagLabel: { fontSize: 14 },
        input: { fontSize: 14, minWidth: 120 },
      };
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  required: {
    color: '#ef4444',
  },
  field: {
    minHeight: 44,
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  fieldError: {
    borderColor: '#ef4444',
  },
  fieldDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  fieldAtMax: {
    opacity: 0.7,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagInvalid: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  tagLabel: {
    fontSize: 14,
    color: '#1e40af',
  },
  tagLabelInvalid: {
    color: '#ef4444',
  },
  tagRemove: {
    marginLeft: 4,
    padding: 2,
  },
  tagRemoveIcon: {
    fontSize: 18,
    color: '#1e40af',
    fontWeight: 'bold',
  },
  tagRemoveIconInvalid: {
    color: '#ef4444',
  },
  input: {
    fontSize: 14,
    minWidth: 120,
    height: 28,
    padding: 0,
    color: '#1f2937',
  },
  dropdown: {
    maxHeight: 200,
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  option: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLabel: {
    fontSize: 14,
    color: '#1f2937',
  },
  optionLabelDisabled: {
    color: '#9ca3af',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: '#ef4444',
  },
});
