import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { categoryDefaultsToBlocking, parseCategory, type NotificationCategory } from './categories';

/**
 * Notification state + the §6.2 badge sources + the §6.3 surface decision —
 * docs/brand/13-mobile-app-patterns.md, INO-112.
 *
 * Nothing feeds this yet. There is no APNs/FCM transport in this repo (§6.7 item 1) and no
 * notification data model to count unread rows from (§6.7 item 4), so `serverUnreadCount` stays
 * null and `receive()` is only reachable from the Settings → Preview simulator. That is the honest
 * state: the surfaces are built and correct, the supply is not wired.
 */

export interface InoNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  /** Deep link from the payload, in either §6.5 form. Null means "no destination". */
  link?: string;
  /** Optional SINGLE inline action (§6.3.1). Never two — a second action means it's a sheet. */
  actionLabel?: string;
  /** Does this message block the user (§6.3 last row)? Defaults to the category's answer. */
  blocking: boolean;
}

/**
 * Build from a decoded push payload. Field names are provisional — §6.7 item 3 owns them — but
 * the mapping from whatever they end up being to the visual contract is settled here, so only
 * this function moves when the schema lands.
 */
export function notificationFromPayload(payload: Record<string, unknown>): InoNotification {
  const category = parseCategory(payload.category);
  return {
    id: String(payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    category,
    title: String(payload.title ?? ''),
    body: payload.body == null ? undefined : String(payload.body),
    link: typeof payload.link === 'string' && payload.link ? payload.link : undefined,
    actionLabel: payload.action == null ? undefined : String(payload.action),
    blocking: typeof payload.blocking === 'boolean' ? payload.blocking : categoryDefaultsToBlocking(category),
  };
}

/** The §6.3 decision table, as a type. */
export type NotificationSurface = 'banner' | 'silent' | 'systemTray' | 'sheet';

/** §6.2 row 2: hidden, a dot (count unknown), or a numeral. */
export interface BadgeState {
  visible: boolean;
  /** null while visible means "unknown count" → draw a dot. */
  count: number | null;
  /** `99+` above 99 (§6.2). */
  label: string;
}

/** §6.3.1 dwell — matches web ToastService's 5000ms default, so the two transient surfaces
 * don't feel like different systems. */
export const BANNER_DWELL_MS = 5000;

interface NotificationContextValue {
  items: InoNotification[];
  isRead: (id: string) => boolean;
  banner: InoNotification | null;
  sheet: InoNotification | null;
  tabBadge: BadgeState;
  receive: (notification: InoNotification) => NotificationSurface;
  surfaceFor: (notification: InoNotification) => NotificationSurface;
  dismissBanner: (id?: string) => void;
  dismissSheet: () => void;
  pauseDwell: () => void;
  resumeDwell: () => void;
  markNotificationsViewed: () => void;
  /** Set by RootNavigator so §6.3 row 2 ("already on Notifications → silent") can be evaluated. */
  setOnNotificationsScreen: (value: boolean) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InoNotification[]>([]);
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [banner, setBanner] = useState<InoNotification | null>(null);
  const [sheet, setSheet] = useState<InoNotification | null>(null);

  /**
   * Unread count from the server. `null` means **unknown**, which is a real state with its own
   * treatment (dot, not numeral), not a stand-in for zero. It is null because §6.2 requires the
   * value come from the server — "never increment it client-side per received push; that drifts
   * the moment one push is dropped or read on another device" — and there is no server
   * (§6.7 item 4).
   */
  const [serverUnreadCount] = useState<number | null>(null);

  // Refs, not state: these are read inside `receive` and must not make it a new function on every
  // change (which would re-fire the effects that depend on it).
  const backgroundedRef = useRef(false);
  const onNotificationsScreenRef = useRef(false);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerRef = useRef<InoNotification | null>(null);
  bannerRef.current = banner;

  /**
   * §6.3's decision is made by app state, not by notification content — so app state has to be
   * observed. Foreground → in-app banner; background/killed → system tray.
   */
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      backgroundedRef.current = state !== 'active';
    };
    backgroundedRef.current = AppState.currentState !== 'active';
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  useEffect(() => () => {
    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
  }, []);

  const dismissBanner = useCallback((id?: string) => {
    setBanner((current) => {
      // Guards against a stale dwell timer dismissing a *newer* banner that replaced the one the
      // timer was started for.
      if (id != null && current?.id !== id) return current;
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      return null;
    });
  }, []);

  const startDwell = useCallback(
    (notification: InoNotification) => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = setTimeout(() => dismissBanner(notification.id), BANNER_DWELL_MS);
    },
    [dismissBanner],
  );

  /** §6.3's table, extracted so it reads as a table rather than being inferred from control flow. */
  const surfaceFor = useCallback((notification: InoNotification): NotificationSurface => {
    if (notification.blocking) return 'sheet';
    if (backgroundedRef.current) return 'systemTray';
    if (onNotificationsScreenRef.current) return 'silent';
    return 'banner';
  }, []);

  const receive = useCallback(
    (notification: InoNotification): NotificationSurface => {
      const surface = surfaceFor(notification);
      setItems((current) => [notification, ...current]);

      if (surface === 'banner') {
        // §6.3.1 stacking: one banner at a time. A second arrival REPLACES the first
        // (dismiss-then-present, not a stack) — stacked transient cards over a phone-width screen
        // contradict the fluid density's whitespace-first rule.
        setBanner(notification);
        startDwell(notification);
      } else if (surface === 'sheet') {
        setSheet(notification);
      }
      // 'silent' — the new row appearing in the list *is* the notification.
      // 'systemTray' — nothing to draw in-process; that surface is the OS's. §6.3 row 1's
      // "suppress the system tray presentation entirely" is a call the transport adapter makes
      // when it hands the push over, not something this provider can enforce.
      return surface;
    },
    [startDwell, surfaceFor],
  );

  /** §6.2 row 1: "Clear on Notifications-screen view, not on app open." */
  const markNotificationsViewed = useCallback(() => {
    setItems((current) => {
      setReadIds(new Set(current.map((n) => n.id)));
      return current;
    });
  }, []);

  const setOnNotificationsScreen = useCallback(
    (value: boolean) => {
      onNotificationsScreenRef.current = value;
      if (value) markNotificationsViewed();
    },
    [markNotificationsViewed],
  );

  const tabBadge = useMemo<BadgeState>(() => {
    if (serverUnreadCount != null) {
      return {
        visible: serverUnreadCount > 0,
        count: serverUnreadCount,
        label: serverUnreadCount > 99 ? '99+' : String(serverUnreadCount),
      };
    }
    /**
     * The dot-vs-numeral split is not cosmetic — it is the difference between "you have unread
     * things" and "you have exactly 3 unread things", and only the server can say the second.
     * With no unread-count source the locally-observed count is deliberately downgraded to a dot
     * rather than shown as a numeral it hasn't earned.
     */
    const localUnread = items.filter((n) => !readIds.has(n.id)).length;
    return { visible: localUnread > 0, count: null, label: '' };
  }, [items, readIds, serverUnreadCount]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      isRead: (id: string) => readIds.has(id),
      banner,
      sheet,
      tabBadge,
      receive,
      surfaceFor,
      dismissBanner,
      dismissSheet: () => setSheet(null),
      // §6.3.1: "dwell pauses while the banner is focused by an assistive technology."
      pauseDwell: () => {
        if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      },
      resumeDwell: () => {
        if (bannerRef.current) startDwell(bannerRef.current);
      },
      markNotificationsViewed,
      setOnNotificationsScreen,
    }),
    [
      items,
      readIds,
      banner,
      sheet,
      tabBadge,
      receive,
      surfaceFor,
      dismissBanner,
      startDwell,
      markNotificationsViewed,
      setOnNotificationsScreen,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications() must be used within <NotificationProvider>');
  return ctx;
}
