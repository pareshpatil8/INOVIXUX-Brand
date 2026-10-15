/**
 * RN formatter equivalent of `[inoKeyfilter]` (web/src/app/components/keyfilter, INO-420 /
 * INO-31 B1). Not a widget — React Native has no DOM attribute-directive concept, so this is a
 * plain hook a `<TextInput>` wires its own `onChangeText` into, the same
 * "platform-idiomatic non-visual primitive, not a forced widget port" call
 * `../../../flutter/lib/widgets/ino_keyfilter.dart`'s `TextInputFormatter` makes on the other
 * mobile track. See `web/src/app/components/keyfilter/SPEC.md` §5.
 *
 * No `onKeyPress` path: unlike web's `keydown`, RN's `TextInputKeyPressEventData` carries only
 * `key`, with no field value or selection to test position-sensitive rules (leading `-`, single
 * `.`) against, and Android does not reliably fire it for every key. `InoInputMask.tsx` (RN's
 * `<ino-inputmask>` port) made the identical call for the identical reason — "re-derive from
 * `onChangeText`'s raw string every change" is the only approach that works uniformly across
 * RN's software keyboards, IME composition included (a composed run commits as a single
 * `onChangeText` call, after composition has already resolved — there is no intermediate state
 * this hook could see or interrupt, so IME is never blocked by construction).
 *
 * Preset rules are re-implemented here rather than imported — neither mobile runtime can import
 * a web TypeScript module, the same boundary every other port in this codebase crosses — but are
 * kept byte-for-byte equivalent to `../../../../web/src/app/components/keyfilter/keyfilter-presets.ts`.
 */
import { useCallback, useMemo, useRef } from 'react';

export type InoKeyfilterPreset = 'int' | 'num' | 'alpha' | 'alphanum' | 'regex';

interface InoKeyfilterContext {
  value: string;
  selectionStart: number;
}

const DIGIT = /^[0-9]$/;
const ALPHA = /^[a-zA-Z]$/;
const ALPHANUM = /^[a-zA-Z0-9]$/;

function isLeadingMinus(ch: string, { value, selectionStart }: InoKeyfilterContext): boolean {
  return ch === '-' && selectionStart === 0 && !value.includes('-');
}

const PRESET_TESTS: Record<Exclude<InoKeyfilterPreset, 'regex'>, (ch: string, ctx: InoKeyfilterContext) => boolean> = {
  int: (ch, ctx) => DIGIT.test(ch) || isLeadingMinus(ch, ctx),
  num: (ch, ctx) => DIGIT.test(ch) || isLeadingMinus(ch, ctx) || (ch === '.' && !ctx.value.includes('.')),
  alpha: (ch) => ALPHA.test(ch),
  alphanum: (ch) => ALPHANUM.test(ch),
};

function createTest(preset: InoKeyfilterPreset, pattern: string | RegExp): (ch: string, ctx: InoKeyfilterContext) => boolean {
  if (preset === 'regex') {
    // A caller-supplied RegExp with a `g`/`y` flag carries `lastIndex` state across `.test()`
    // calls, which would make consecutive characters alternate accept/reject. Rebuilding without
    // those flags keeps every call stateless, matching the per-character contract every preset
    // test has to satisfy. Same fix as `keyfilter-presets.ts`'s `createKeyfilterTest`.
    const re = typeof pattern === 'string' ? new RegExp(pattern) : new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
    return (ch) => re.test(ch);
  }
  return PRESET_TESTS[preset];
}

/** `selectionStart` isn't observable from `onChangeText` alone, so this diffs `next` against
 *  `previous` as a single contiguous edit — common prefix, common suffix, whatever's left in the
 *  middle is the removed run (from `previous`) and the inserted run (from `next`). That covers
 *  the one real-world shape this guard exists for (a typed key, an IME commit, a paste,
 *  predictive text replacing a selection), not an arbitrary multi-point edit. Insert, delete, and
 *  replace (a selection replaced by typed/pasted text) all fall out of the same walk regardless
 *  of whether `next` grew, shrank, or stayed the same length — unlike a plain length comparison,
 *  which can't tell a replacement from a delete. */
function diffEdit(next: string, previous: string): { removed: string; inserted: string; at: number } {
  const maxPrefix = Math.min(previous.length, next.length);
  let start = 0;
  while (start < maxPrefix && previous[start] === next[start]) start++;
  const maxSuffix = maxPrefix - start;
  let end = 0;
  while (end < maxSuffix && previous[previous.length - 1 - end] === next[next.length - 1 - end]) end++;
  return {
    removed: previous.slice(start, previous.length - end),
    inserted: next.slice(start, next.length - end),
    at: start,
  };
}

export interface UseInoKeyfilterOptions {
  pattern?: string | RegExp;
  /** Fires with the rejected substring whenever at least one inserted character was filtered out. */
  onReject?: (value: string) => void;
}

export interface InoKeyfilterHandlers {
  /** Wire ahead of the caller's own `onChangeText`: `onChangeText={(t) => setValue(filterChangeText(t, value))}`. */
  filterChangeText: (next: string, previous: string) => string;
}

export function useInoKeyfilter(preset: InoKeyfilterPreset, options: UseInoKeyfilterOptions = {}): InoKeyfilterHandlers {
  const { pattern = '', onReject } = options;
  const test = useMemo(() => createTest(preset, pattern), [preset, pattern]);
  // Ref the latest callback so filterChangeText's identity stays stable across reject-callback
  // identity changes — the caller can pass an inline arrow without re-triggering memoization.
  const onRejectRef = useRef(onReject);
  onRejectRef.current = onReject;

  const filterChangeText = useCallback(
    (next: string, previous: string): string => {
      const { removed, inserted, at } = diffEdit(next, previous);
      if (!inserted) return next; // pure deletion — nothing to filter, this hook only rejects insertions

      // The value the inserted run actually lands into: `previous` with the replaced selection
      // (if any) already cut out, same base-value construction web's `onKeydown`/`onPaste` use.
      let value = previous.slice(0, at) + previous.slice(at + removed.length);
      let pos = at;
      let filtered = '';
      for (const ch of inserted) {
        if (test(ch, { value, selectionStart: pos })) {
          value = value.slice(0, pos) + ch + value.slice(pos);
          filtered += ch;
          pos++;
        }
      }

      if (filtered === inserted) return next;
      onRejectRef.current?.(inserted);
      return previous.slice(0, at) + filtered + previous.slice(at + removed.length);
    },
    [test],
  );

  return { filterChangeText };
}
