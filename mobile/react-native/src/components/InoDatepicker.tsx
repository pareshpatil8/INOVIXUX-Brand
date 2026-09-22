import React, { useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space } from '../theme/tokens';

/**
 * `<InoDatepicker>` — RN port of `<ino-datepicker>`
 * (`web/src/app/components/datepicker`, INO-154 / INO-31 T-8).
 *
 * Scope, per the plan rev 9 §5 porting rule ("React Native is a real port, ~40% the cost of the
 * web component"): a **single-mode** calendar grid with touch + (where an external keyboard is
 * attached) arrow-key selection, `size`, `disabled`/`invalid`/`loading`, and `minDate`/`maxDate`.
 * Range, multiple-selection and the time picker are NOT ported here — see
 * `web/src/app/components/datepicker/SPEC.md`, "Mobile parity" section, for the reasoning. Month/
 * year view are also out of scope: RN has no equivalent of the web component's drill-up header,
 * and `onNavigate` (prev/next month only) covers the touch interaction a phone calendar needs.
 *
 * There is no native RN "focus-visible"/hover distinction (see `InoButton`'s doc comment for the
 * same note); the pressed/selected/disabled state set below is the full carryover from web.
 */

export type InoDatepickerSize = ControlSize;

export interface InoDatepickerProps {
  label?: string;
  hint?: string;
  error?: string;
  /** `null` = no selection. */
  value: Date | null;
  onChange: (date: Date) => void;
  size?: InoDatepickerSize;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  loading?: boolean;
  /** First day of the visible week: 0 = Sunday, 1 = Monday (default — see web component's locale
   *  contract, `en-IN`/APAC default). */
  firstDayOfWeek?: 0 | 1;
  /** Month currently displayed; defaults to `value` or today. Uncontrolled if omitted. */
  initialMonth?: Date;
}

function sameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addMonths(d: Date, n: number): Date {
  const day = d.getDate();
  const c = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const daysInTarget = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate();
  c.setDate(Math.min(day, daysInTarget));
  return c;
}

function buildWeeks(viewDate: Date, firstDayOfWeek: 0 | 1): Date[][] {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const offset = (monthStart.getDay() - firstDayOfWeek + 7) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - offset);

  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cursor));
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export function InoDatepicker({
  label,
  hint,
  error,
  value,
  onChange,
  size = 'default',
  minDate,
  maxDate,
  disabled = false,
  loading = false,
  firstDayOfWeek = 1,
  initialMonth,
}: InoDatepickerProps) {
  const { colors } = useTheme();
  const c = control[size];
  const invalid = !!error;
  const nonInteractive = disabled || loading;

  const [viewDate, setViewDate] = useState(startOfDay(initialMonth ?? value ?? new Date()));

  const weeks = useMemo(() => buildWeeks(viewDate, firstDayOfWeek), [viewDate, firstDayOfWeek]);
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(1970, 0, 4 + ((firstDayOfWeek + i) % 7))));
  }, [firstDayOfWeek]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(viewDate),
    [viewDate],
  );

  const isDisabled = (d: Date) => {
    const day = startOfDay(d);
    if (minDate && day < startOfDay(minDate)) return true;
    if (maxDate && day > startOfDay(maxDate)) return true;
    return false;
  };

  const select = (d: Date) => {
    if (nonInteractive || isDisabled(d)) {
      return;
    }
    onChange(d);
    if (d.getMonth() !== viewDate.getMonth()) {
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const navigate = (delta: number) => {
    const next = addMonths(viewDate, delta);
    setViewDate(next);
    // Announce the month change for screen-reader users — there is no visible focus move on a
    // touch device the way web's roving tabindex gives one for free.
    AccessibilityInfo.announceForAccessibility?.(
      new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(next),
    );
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text> : null}

      <View
        style={[
          styles.panel,
          { backgroundColor: colors.surfaceRaised, borderColor: invalid ? colors.danger : colors.border },
        ]}
        accessibilityRole={Platform.OS === 'ios' ? 'none' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigate(-1)}
            disabled={nonInteractive}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            hitSlop={8}
            style={[styles.navButton, { minWidth: 44, minHeight: 44 }]}
          >
            <Text style={{ color: colors.onSurfaceMuted, fontSize: 17 }}>‹</Text>
          </Pressable>
          <Text style={[styles.heading, { color: colors.onSurface }]}>{monthLabel}</Text>
          <Pressable
            onPress={() => navigate(1)}
            disabled={nonInteractive}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            hitSlop={8}
            style={[styles.navButton, { minWidth: 44, minHeight: 44 }]}
          >
            <Text style={{ color: colors.onSurfaceMuted, fontSize: 17 }}>›</Text>
          </Pressable>
        </View>

        <View style={styles.week}>
          {weekdayLabels.map((wd) => (
            <Text key={wd} style={[styles.weekday, { color: colors.onSurfaceMuted }]}>
              {wd}
            </Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((d) => {
              const inMonth = d.getMonth() === viewDate.getMonth();
              const selected = sameDay(d, value);
              const today = sameDay(d, new Date());
              const cellDisabled = nonInteractive || isDisabled(d);
              return (
                <Pressable
                  key={d.toISOString()}
                  onPress={() => select(d)}
                  disabled={cellDisabled}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: cellDisabled, selected }}
                  accessibilityLabel={new Intl.DateTimeFormat('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(d)}
                  hitSlop={2}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      minWidth: 44,
                      minHeight: 44,
                      borderRadius: radius.sm,
                      backgroundColor: selected
                        ? colors.accent
                        : pressed
                          ? colors.surfaceSunken
                          : 'transparent',
                      borderWidth: today && !selected ? 1 : 0,
                      borderColor: colors.border,
                      opacity: cellDisabled ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected ? colors.onAccent : inMonth ? colors.onSurface : colors.onSurfaceSubtle,
                      fontSize: c.fontSize - 2,
                      fontWeight: selected || today ? '600' : '400',
                    }}
                  >
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {error ? (
        <Text style={[styles.message, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.onSurfaceMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  label: { fontSize: 14.5, fontWeight: '600' },
  panel: { borderWidth: 1, borderRadius: radius.lg, padding: space[4], gap: space[1] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 15, fontWeight: '600' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekday: { width: 44, textAlign: 'center', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 12.5 },
});
