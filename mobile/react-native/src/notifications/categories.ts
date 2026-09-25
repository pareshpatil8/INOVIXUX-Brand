import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import type { Palette } from '../theme/tokens';

/**
 * Category → visual mapping — docs/brand/13-mobile-app-patterns.md §6.4, INO-112.
 *
 * Four categories, mapped to glyphs and tokens that already exist. The payload *field* that
 * carries the category is product work (§6.7 item 3); what each value means visually is fixed
 * here, identically on all three tracks — see `mobile/flutter/lib/notifications/
 * notification_category.dart` and the Capacitor track's `notification-category.ts`.
 */
export const NOTIFICATION_CATEGORIES = ['info', 'success', 'warning', 'critical'] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * §6.4's glyph column. The doc names these in Lucide's legacy spelling (`check-circle`,
 * `alert-triangle`, `alert-octagon`); lucide-react-native renamed them to `CircleCheck`,
 * `TriangleAlert` and `OctagonAlert` and keeps the old names only as ambiguous aliases (two
 * different glyphs both alias to `CheckCircle`). Same glyphs, current names.
 */
export const categoryGlyph: Record<NotificationCategory, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  critical: OctagonAlert,
};

/**
 * Tints the **glyph only**, never the banner's surface (§6.4). A full-bleed status-coloured card
 * was already ruled out for the web alert component, and a coloured surface would force every
 * foreground token in the banner to be re-audited per category for no communicative gain.
 *
 * NOTE — `info` maps to `accent`, not to the `info` palette role, because §6.4's table says
 * `--ino-color-accent`. That table was written (INO-97) before `--ino-color-info` existed (added
 * by INO-128 on the parallel INO-31 wave). Implemented as specified rather than silently
 * re-pointed; raised on INO-112 as a spec question for whoever owns doc 13.
 */
export function categoryTint(category: NotificationCategory, colors: Palette): string {
  switch (category) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'critical':
      return colors.danger;
    case 'info':
    default:
      return colors.accent;
  }
}

/**
 * §6.4: "the glyph also never carries the meaning alone: the banner title must state the category
 * in words." These are the words.
 */
export const categoryWord: Record<NotificationCategory, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
};

/**
 * §6.3 last row, and §6.4's own "(→ sheet, per §6.3)" note: a blocking message must not
 * auto-dismiss, and banners auto-dismiss, so a banner is the wrong vessel regardless of app state.
 * This is only the category's default — "blocks the user" is a property of the message, so an
 * individual notification can override it.
 */
export function categoryDefaultsToBlocking(category: NotificationCategory): boolean {
  return category === 'critical';
}

/**
 * Parse the wire value. Unknown values degrade to `info` rather than throwing — a category added
 * server-side before a client ships must not break notification rendering, and `info` is the
 * non-alarming register to be wrong in. Same posture as §6.5's "unknown path → Home, silently".
 */
export function parseCategory(raw: unknown): NotificationCategory {
  const value = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value)
    ? (value as NotificationCategory)
    : 'info';
}

/**
 * Prefix the category word onto a title that doesn't already say it, so a well-written payload
 * doesn't read "Warning — Warning: card expiring". Enforced in code rather than left to payload
 * copy: the glyph is drawn by the component, so the words that legitimise it are the component's
 * responsibility.
 */
export function titleWithCategoryWord(category: NotificationCategory, title: string): string {
  const word = categoryWord[category];
  const trimmed = title.trim();
  if (!trimmed) return word;
  if (trimmed.toLowerCase().startsWith(word.toLowerCase())) return trimmed;
  return `${word} — ${trimmed}`;
}
