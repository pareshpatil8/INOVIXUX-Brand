/**
 * Preset character tests for `[inoKeyfilter]`. Kept in its own file so the predicates are
 * unit-testable without Angular's TestBed — same split `../inputmask/mask-tokens.ts` uses for its
 * grammar. Contract: INO-420 (INO-31 Phase B1, doc 26 §2/§5).
 *
 * `alpha`/`alphanum` reuse the exact ASCII character classes `mask-tokens.ts` already uses for its
 * `a`/`A`/`*` tokens (`/^[a-zA-Z]$/`, `/^[a-zA-Z0-9]$/`) rather than a Unicode-aware `\p{L}` class —
 * one definition of "a letter" across the design system, not two. This is deliberately narrow: see
 * SPEC.md §2 for why a non-Latin script typed through an IME is never run against these at all.
 */
export type InoKeyfilterPreset = 'int' | 'num' | 'alpha' | 'alphanum' | 'regex';

/** The host element's current value and the caret position the candidate character would land
 *  at — enough context for the two position-sensitive rules (leading `-`, single `.`) without the
 *  test function needing to know anything else about the directive. */
export interface InoKeyfilterContext {
  value: string;
  selectionStart: number;
}

const DIGIT = /^[0-9]$/;
const ALPHA = /^[a-zA-Z]$/;
const ALPHANUM = /^[a-zA-Z0-9]$/;

/** `-` only as the very first character, and only once. Shared by `int` and `num`. */
function isLeadingMinus(ch: string, { value, selectionStart }: InoKeyfilterContext): boolean {
  return ch === '-' && selectionStart === 0 && !value.includes('-');
}

const PRESET_TESTS: Record<Exclude<InoKeyfilterPreset, 'regex'>, (ch: string, ctx: InoKeyfilterContext) => boolean> = {
  int: (ch, ctx) => DIGIT.test(ch) || isLeadingMinus(ch, ctx),
  num: (ch, ctx) =>
    DIGIT.test(ch) || isLeadingMinus(ch, ctx) || (ch === '.' && !ctx.value.includes('.')),
  alpha: (ch) => ALPHA.test(ch),
  alphanum: (ch) => ALPHANUM.test(ch),
};

/** Builds a single-character predicate for `preset`. For `'regex'`, `pattern` is required and is
 *  tested against each candidate character individually (never the whole string) — the same
 *  per-character contract every other preset has, so paste-filtering and keydown-filtering share
 *  one code path regardless of preset. A `pattern` without its own anchors still behaves correctly
 *  per-character since `RegExp.test` on a one-character string doesn't need `^`/`$`. */
export function createKeyfilterTest(
  preset: InoKeyfilterPreset,
  pattern: string | RegExp,
): (ch: string, ctx: InoKeyfilterContext) => boolean {
  if (preset === 'regex') {
    // A caller-supplied RegExp with a `g`/`y` flag carries `lastIndex` state across `.test()`
    // calls, which would make consecutive characters alternate accept/reject. Rebuilding without
    // those flags keeps every call stateless, matching the per-character contract every preset
    // test has to satisfy.
    const re =
      typeof pattern === 'string' ? new RegExp(pattern) : new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
    return (ch) => re.test(ch);
  }
  return PRESET_TESTS[preset];
}
