import React, { useState, Children, cloneElement, isValidElement, ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface InoAccordionProps {
  children: React.ReactNode;
  multiple?: boolean;
  size?: 'compact' | 'comfortable';
  iconPosition?: 'start' | 'end';
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * `<InoAccordion>` — React Native port of `<ino-accordion>`. Container for collapsible accordion
 * tabs with mutual-exclusion support (single-expand mode). Spec: doc 26 §5 Phase B2 row
 * `ino-accordion`. See `web/src/app/components/accordion/SPEC.md` §10 for mobile parity scope.
 *
 * `multiple` controls expand mode: when `false` (default), opening one tab closes all others;
 * when `true`, any number of tabs can be open simultaneously.
 *
 * `size` ('compact' | 'comfortable', default 'comfortable') scales tab header/body padding.
 * `iconPosition` ('start' | 'end', default 'start') controls chevron placement (cascaded to tabs).
 * `disabled` dims the whole accordion and locks all tab toggles.
 *
 * **Mobile scope:** Roving tabindex and Arrow-key navigation are omitted (RN has no tabindex;
 * mobile is touch-first). Each tab is tappable; focus management is left to the platform.
 */
export function InoAccordion({
  children,
  multiple = false,
  size = 'comfortable',
  iconPosition = 'start',
  disabled = false,
  style,
}: InoAccordionProps) {
  const { colors } = useTheme();
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

  const handleTabToggle = (index: number, expanded: boolean) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (expanded) {
        if (!multiple) {
          next.clear();
        }
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const childArray = Children.toArray(children);

  const accordionStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden' as const,
  };

  return (
    <View style={[accordionStyle, disabled && styles.disabled, style]}>
      {childArray.map((child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child as ReactElement<any>, {
            key: index,
            _index: index,
            _expanded: expandedIndices.has(index),
            _onToggle: handleTabToggle,
            _size: size,
            _iconPosition: iconPosition,
            _accordionDisabled: disabled,
          });
        }
        return child;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
