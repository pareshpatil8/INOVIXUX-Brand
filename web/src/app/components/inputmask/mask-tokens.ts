/**
 * Mask grammar shared by `<ino-inputmask>` (parse + caret-management engine). Kept in its own file
 * so it can be unit-tested independently of the Angular component — see SPEC.md §1.
 *
 * Token chars:
 * - `9` — required digit
 * - `a` — required letter (kept as typed)
 * - `A` — required letter, auto-uppercased
 * - `*` — required letter-or-digit
 * - `?` — everything after this marks the *following* tokens optional (doesn't consume a slot
 *   itself); optional slots don't count toward `isMaskComplete`.
 * - `\` — escapes the next character as a literal, even if it's one of the token chars above
 *   (e.g. `\9` for a literal digit `9` inside a static prefix like India's `+91`).
 * - anything else — a literal separator, auto-inserted and never typed by the user (unless the
 *   user types that exact character at that position, which is accepted and consumed so pasted
 *   pre-formatted text still works).
 */
export type MaskTokenKind = 'digit' | 'alpha' | 'alnum' | 'literal';

export interface MaskToken {
  kind: MaskTokenKind;
  /** For `literal` tokens, the character to render/require. Ignored for editable kinds. */
  char: string;
  optional: boolean;
  /** Auto-uppercase typed input for this slot (set by the `A` token char). */
  upper?: boolean;
}

export function parseMask(mask: string): MaskToken[] {
  const tokens: MaskToken[] = [];
  let optional = false;

  for (let i = 0; i < mask.length; i++) {
    const ch = mask[i];

    if (ch === '\\') {
      i++;
      if (i < mask.length) {
        tokens.push({ kind: 'literal', char: mask[i], optional });
      }
      continue;
    }

    if (ch === '?') {
      optional = true;
      continue;
    }

    switch (ch) {
      case '9':
        tokens.push({ kind: 'digit', char: ch, optional });
        break;
      case 'a':
        tokens.push({ kind: 'alpha', char: ch, optional });
        break;
      case 'A':
        tokens.push({ kind: 'alpha', char: ch, optional, upper: true });
        break;
      case '*':
        tokens.push({ kind: 'alnum', char: ch, optional });
        break;
      default:
        tokens.push({ kind: 'literal', char: ch, optional });
    }
  }

  return tokens;
}

export function testChar(token: MaskToken, ch: string): boolean {
  switch (token.kind) {
    case 'digit':
      return /^[0-9]$/.test(ch);
    case 'alpha':
      return /^[a-zA-Z]$/.test(ch);
    case 'alnum':
      return /^[a-zA-Z0-9]$/.test(ch);
    default:
      return false;
  }
}

const KIND_WORDS: Record<Exclude<MaskTokenKind, 'literal'>, [string, string]> = {
  digit: ['digit', 'digits'],
  alpha: ['letter', 'letters'],
  alnum: ['letter or digit', 'letters or digits'],
};

/**
 * Groups consecutive same-kind editable tokens into a human sentence, e.g. GSTIN's
 * `99AAAAA9999A9Z*` → `"2 digits, 5 letters, 4 digits, 1 letter, 1 digit, 1 letter or digit"`.
 * Used to build the `aria-describedby` format description (mask announced via description,
 * doc 26 §5 a11y row) — literal separators aren't named individually, only counted editable runs.
 */
export function describeMask(tokens: MaskToken[]): string {
  const runs: { kind: Exclude<MaskTokenKind, 'literal'>; count: number }[] = [];

  for (const t of tokens) {
    if (t.kind === 'literal') continue;
    const last = runs[runs.length - 1];
    if (last && last.kind === t.kind) {
      last.count++;
    } else {
      runs.push({ kind: t.kind, count: 1 });
    }
  }

  return runs
    .map((r) => `${r.count} ${KIND_WORDS[r.kind][r.count === 1 ? 0 : 1]}`)
    .join(', ');
}
