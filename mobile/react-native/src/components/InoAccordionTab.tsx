import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';

export interface InoAccordionTabProps {
  header: string;
  children: React.ReactNode;
  expanded?: boolean;
  disabled?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  style?: ViewStyle;
  // Internal props cascaded by parent InoAccordion
  _index?: number;
  _expanded?: boolean;
  _onToggle?: (index: number, expanded: boolean) => void;
  _size?: 'compact' | 'comfortable';
  _iconPosition?: 'start' | 'end';
  _accordionDisabled?: boolean;
}

/**
 * `<InoAccordionTab>` — React Native port of `<ino-accordion-tab>`. Individual collapsible panel
 * within an `<InoAccordion>`. Not intended for standalone use outside an accordion container.
 *
 * `header` is the tab label (required). `disabled` locks this specific tab's toggle (independent
 * of the parent accordion's global `disabled`). `expanded` is the open/closed state; emits
 * `onExpandedChange` on toggle.
 *
 * **Mobile scope:** No heading wrapper (RN has no heading semantics); uses `Pressable` +
 * `accessibilityRole="button"` + `accessibilityState={{ expanded, disabled }}`. No roving
 * tabindex or keyboard navigation (see SPEC.md §10).
 */
export function InoAccordionTab({
  header,
  children,
  expanded: controlledExpanded,
  disabled = false,
  onExpandedChange,
  style,
  _index = 0,
  _expanded = false,
  _onToggle,
  _size = 'comfortable',
  _iconPosition = 'start',
  _accordionDisabled = false,
}: InoAccordionTabProps) {
  const isExpanded = _onToggle !== undefined ? _expanded : controlledExpanded ?? false;
  const isDisabled = disabled || _accordionDisabled;

  const handleToggle = () => {
    if (isDisabled) {
      return;
    }
    const nextExpanded = !isExpanded;
    _onToggle?.(_index, nextExpanded);
    onExpandedChange?.(nextExpanded);
  };

  const paddingValue = _size === 'compact' ? 12 : 16;
  const chevron = isExpanded ? '▾' : '▸';
  const chevronStyle: TextStyle = _iconPosition === 'end' ? styles.chevronEnd : styles.chevronStart;

  return (
    <View style={[styles.tab, style]}>
      <Pressable
        onPress={handleToggle}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, disabled: isDisabled }}
        style={({ pressed }) => [
          styles.header,
          { paddingVertical: paddingValue, paddingHorizontal: paddingValue },
          pressed && !isDisabled && styles.headerPressed,
          isDisabled && styles.headerDisabled,
        ]}
      >
        {_iconPosition === 'start' && <Text style={[chevronStyle, isDisabled && styles.chevronDisabled]}>{chevron}</Text>}
        <Text style={[styles.headerText, isDisabled && styles.headerTextDisabled]}>{header}</Text>
        {_iconPosition === 'end' && <Text style={[chevronStyle, isDisabled && styles.chevronDisabled]}>{chevron}</Text>}
      </Pressable>
      {isExpanded && (
        // No accessibilityRole: RN's AccessibilityRole has no `region` — that is web-only
        // ARIA (SPEC.md §96). Passing it was a runtime no-op, so dropping it is behaviour
        // preserving; the panel stays reachable via its individually-accessible children.
        <View
          style={[styles.body, { paddingVertical: paddingValue, paddingHorizontal: paddingValue }]}
          accessibilityLabel={header}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    borderBottomWidth: 1,
    borderBottomColor: '#222222', // var(--ino-color-border-soft) approximation
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // var(--ino-color-surface-raised) approximation
  },
  headerPressed: {
    backgroundColor: '#242424', // var(--ino-color-surface-hover) approximation
  },
  headerDisabled: {
    opacity: 0.5,
  },
  headerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff', // var(--ino-color-on-surface) approximation
  },
  headerTextDisabled: {
    color: '#888888', // var(--ino-color-on-surface-muted) approximation
  },
  chevronStart: {
    fontSize: 11,
    color: '#888888',
    marginRight: 8,
  },
  chevronEnd: {
    fontSize: 11,
    color: '#888888',
    marginLeft: 8,
  },
  chevronDisabled: {
    color: '#666666',
  },
  body: {
    backgroundColor: '#0f0f0f', // var(--ino-color-surface) approximation
  },
});
