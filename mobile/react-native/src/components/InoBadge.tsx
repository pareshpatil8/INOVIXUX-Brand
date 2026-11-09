import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';

/**
 * `InoBadge` — React Native port of `web/src/app/components/badge/ino-badge.component.ts`
 * (INO-460). Re-authored, not shared: RN has no CSS custom properties, so every value below reads
 * the same theme-role names the web component reads, rather than a literal.
 *
 * Three usage modes per doc 26 §5:
 * 1. **Dot** — simple presence indicator (e.g. unread marker, online status)
 * 2. **Count** — numeric badge with 99+ overflow for counts ≥ 100
 * 3. **Status** — labeled status indicator with severity colors
 *
 * Can be used standalone or positioned on a child element. For positioned mode, pass
 * `positioned={true}` — the badge will use absolute positioning (unlike web's :host-context()
 * detection, RN requires explicit prop).
 */

export type InoBadgeVariant = 'dot' | 'count' | 'status';
export type InoBadgeSize = 'sm' | 'md';
export type InoBadgeSeverity = 'info' | 'success' | 'warning' | 'danger';

export function InoBadge({
  variant = 'count',
  size = 'md',
  severity = 'info',
  value,
  label = '',
  accessibilityLabel,
  positioned = false,
}: {
  variant?: InoBadgeVariant;
  size?: InoBadgeSize;
  severity?: InoBadgeSeverity;
  /** Numeric value for `count` variant. Displays "99+" when value ≥ 100. Ignored for dot/status. */
  value?: number;
  /** Status label text for `status` variant. Ignored for dot/count. */
  label?: string;
  /** Required for `count` variant; optional for `dot` (makes it informative vs decorative);
   * ignored for `status` (visible label is already accessible). */
  accessibilityLabel?: string;
  /** When true, uses absolute positioning to anchor to top-end corner of parent. Parent must have
   * relative/absolute positioning. */
  positioned?: boolean;
}) {
  const { colors } = useTheme();

  // Display count with 99+ overflow logic
  const displayValue =
    variant === 'count' && value !== undefined ? (value >= 100 ? '99+' : String(value)) : '';

  // Color logic for each variant
  const backgroundColor = () => {
    if (variant === 'dot' || variant === 'count') {
      return colors.accent;
    }
    // Status variant uses severity colors directly. Web uses color-mix for a tinted surface
    // (12% severity + 88% surface), but RN doesn't have an equivalent built-in color-blend
    // function, so we use the full severity color for now.
    switch (severity) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      case 'info':
      default:
        return colors.info;
    }
  };

  const textColor = () => {
    if (variant === 'dot') {
      return colors.accent; // Dot has no text, but this keeps the type simple
    }
    if (variant === 'count') {
      return colors.onAccent;
    }
    // Status variant uses on-{severity} colors for text on severity-colored backgrounds.
    // Web uses a tinted background + severity text; mobile uses full severity background + on-severity text.
    switch (severity) {
      case 'success':
        return colors.onSuccess;
      case 'warning':
        return colors.onWarning;
      case 'danger':
        return colors.onDanger;
      case 'info':
      default:
        return colors.onInfo;
    }
  };

  // Size-specific styles
  const sizeStyles = {
    dot: {
      sm: { width: 8, height: 8 },
      md: { width: 10, height: 10 },
    },
    count: {
      sm: { height: 16, minWidth: 16, paddingHorizontal: 4, fontSize: 11 },
      md: { height: 20, minWidth: 20, paddingHorizontal: 6, fontSize: 13 },
    },
    status: {
      sm: { height: 20, paddingHorizontal: 6, fontSize: 11 },
      md: { height: 24, paddingHorizontal: 8, fontSize: 13 },
    },
  };

  const variantSizes = sizeStyles[variant][size];

  // Accessibility props
  const a11yProps = {
    accessibilityRole: variant === 'status' ? undefined : ('text' as const),
    accessibilityLabel:
      variant === 'status'
        ? undefined
        : variant === 'count'
          ? accessibilityLabel || (value !== undefined ? String(value) : undefined)
          : accessibilityLabel,
    accessibilityElementsHidden: variant === 'dot' && !accessibilityLabel ? true : undefined,
  };

  // Container style
  const containerStyle: ViewStyle = {
    ...styles.base,
    ...(positioned && styles.positioned),
  };

  if (variant === 'dot') {
    return (
      <View style={containerStyle} {...a11yProps}>
        <View
          style={[
            styles.dot,
            variantSizes,
            {
              backgroundColor: backgroundColor(),
            },
          ]}
        />
      </View>
    );
  }

  if (variant === 'count') {
    return (
      <View
        style={[
          containerStyle,
          styles.count,
          variantSizes,
          {
            backgroundColor: backgroundColor(),
          },
        ]}
        {...a11yProps}
      >
        <Text
          style={[styles.countText, { color: textColor(), fontSize: sizeStyles.count[size].fontSize }]}
          accessibilityElementsHidden
        >
          {displayValue}
        </Text>
      </View>
    );
  }

  // Status variant
  return (
    <View
      style={[
        containerStyle,
        styles.status,
        variantSizes,
        {
          backgroundColor: backgroundColor(),
        },
      ]}
    >
      <Text style={[styles.statusText, { color: textColor(), fontSize: sizeStyles.status[size].fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positioned: {
    position: 'absolute',
    top: 0,
    right: 0,
    transform: [{ translateX: 8 }, { translateY: -8 }],
  },
  dot: {
    borderRadius: 999,
  },
  count: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontWeight: '600',
    lineHeight: 16,
  },
  status: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontWeight: '600',
    lineHeight: 16,
  },
});
