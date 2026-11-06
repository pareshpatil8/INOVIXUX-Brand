/**
 * RN hook equivalent of `[inoAutofocus]` (web/src/app/components/autofocus, INO-466 / INO-31
 * B4). Not a widget — React Native has no DOM attribute-directive concept, so this is a plain hook
 * wired to a ref, the same "platform-idiomatic non-visual primitive, not a forced widget port"
 * call `InoKeyfilter.ts` made before it (`web/src/app/components/keyfilter/SPEC.md` §5) and that
 * `../../../flutter/lib/widgets/ino_autofocus.dart` makes on the other mobile track. See
 * `web/src/app/components/autofocus/SPEC.md` §5.
 *
 * ## Why this needs to exist at all, next to RN's native `autoFocus` prop
 *
 * `TextInput` (and friends) already have an `autoFocus` prop. It has the identical limitation the
 * web directive's own doc block opens with: it fires once, when the element first mounts, and
 * nothing re-runs it. React Navigation **reuses** a screen instance across a navigation that only
 * changes route params (a detail screen keyed by an id, a tab inside a persistent navigator), the
 * same way Angular's `Router` reuses a component instance — so a screen revisited via a param-only
 * navigation never gets `autoFocus` again, exactly the gap `inoAutofocusTrigger` closes on web.
 * `trigger` below is that same mechanism: pass a value that changes on every navigation worth
 * re-focusing for (a navigation key, a route param) and the ref is re-focused on every change
 * after the first.
 *
 * ## No focus-trap interplay to port
 *
 * The web directive is a no-op inside an ancestor `[inoFocusTrap]`, because both primitives would
 * otherwise race for the same `queueMicrotask` tick. `[inoFocusTrap]` itself was never ported to
 * React Native — there is no DOM tab order to contain, the equivalent concern is the platform's
 * own `accessibilityViewIsModal` / `importantForAccessibility` flags on the overlay (see
 * `web/src/app/components/focus-trap/SPEC.md` §5) — so there is no ancestor trap for this hook to
 * defer to. It is therefore simpler than the web directive by construction, not by omission.
 */
import { MutableRefObject, useEffect, useRef } from 'react';

interface Focusable {
  focus(): void;
}

export interface UseInoAutofocusOptions {
  /** On/off switch, default `true`. Set `false` to suppress a single instance of a shared screen
   *  without restructuring it. */
  enabled?: boolean;
  /** Changing this value after the first activation re-focuses `ref` — the route-change
   *  mechanism described above. Has no effect on the very first mount, which the hook's own mount
   *  effect already owns. */
  trigger?: unknown;
}

export interface InoAutofocusHandlers {
  /** Re-runs focus placement imperatively — for a re-run driven by something that isn't itself a
   *  value change (an async response, a websocket event), the same escape hatch the web
   *  directive's `focusNow()` method provides. */
  focusNow: () => void;
}

export function useInoAutofocus<T extends Focusable>(
  ref: MutableRefObject<T | null>,
  options: UseInoAutofocusOptions = {},
): InoAutofocusHandlers {
  const { enabled = true, trigger } = options;

  // Mirrors the web directive's `initialized` guard: the mount effect owns the first focus move,
  // so the trigger effect below — which runs on this same first render too, since React runs all
  // effects after the initial mount — does not also fire and double-focus.
  const mounted = useRef(false);

  useEffect(() => {
    if (enabled) {
      ref.current?.focus();
    }
    mounted.current = true;
    // Deliberately empty deps: this effect is the one-time "on mount" activation. `enabled`
    // starting `false` and flipping `true` later is handled by the trigger effect below reading
    // the current `enabled` value, not by re-running this one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted.current && enabled) {
      ref.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, enabled]);

  return {
    focusNow: () => ref.current?.focus(),
  };
}
