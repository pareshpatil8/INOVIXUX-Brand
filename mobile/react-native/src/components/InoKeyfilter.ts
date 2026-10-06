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
    const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return (ch) => re.test(ch);
  }
  return PRESET_TESTS[preset];
}

/** `selectionStart` isn't observable from `onChangeText` alone, so this locates the single
 *  contiguous insert by diffing `next` against `previous` from both ends — the one real-world
 *  shape this guard exists for (a typed key, an IME commit, a paste, predictive text), not an
 *  arbitrary multi-point edit. Returns `null` for a delete (`next` no longer than `previous`),
 *  which always passes through untouched — this hook only ever rejects insertions. */
function locateInsert(next: string, previous: string): { inserted: string; at: number } | null {
  if (next.length <= previous.length) return null;
  let start = 0;
  while (start < previous.length && previous[start] === next[start]) start++;
  let end = 0;
  while (end < previous.length - start && previous[previous.length - 1 - end] === next[next.length - 1 - end]) end++;
  return { inserted: next.slice(start, next.length - end), at: start };
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
      const insert = locateInsert(next, previous);
      if (!insert || !insert.inserted) return next;

      let value = previous;
      let pos = insert.at;
      let filtered = '';
      for (const ch of insert.inserted) {
        if (test(ch, { value, selectionStart: pos })) {
          value = value.slice(0, pos) + ch + value.slice(pos);
          filtered += ch;
          pos++;
        }
      }

      if (filtered === insert.inserted) return next;
      onRejectRef.current?.(insert.inserted);
      return previous.slice(0, insert.at) + filtered + previous.slice(insert.at);
    },
    [test],
  );

  return { filterChangeText };
}
