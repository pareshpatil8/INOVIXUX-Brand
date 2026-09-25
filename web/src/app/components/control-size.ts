/**
 * `InoControlSize` — the closed union behind every component's `size` @Input (INO-124, Wave 0).
 *
 * This is the TypeScript half of the control-size scale; the values themselves live in
 * `web/src/tokens.css` §12 and the adoption recipe is in
 * `docs/brand/06-angular-components/control-size-scale.md` §3.
 *
 * It lives in `components/` root rather than in any one component directory because ~35 components
 * across Waves 1 and 2 need it and there is no barrel file in this project — components are
 * imported by path. A per-component copy of the union would let `'medium'` appear in one component
 * and `'md'` in another, which is precisely the drift this issue exists to prevent.
 *
 * `'default'` (not `'md'`) is the middle rung on purpose: it is the value a caller gets by writing
 * nothing at all, so naming it `default` keeps the written form and the omitted form reading the
 * same. The Flutter port has to call it `standard` because `default` is a reserved word in Dart —
 * that rename is the one place this scale's names diverge across platforms, and
 * `check-theme-parity.mjs` asserts the values line up regardless of the name.
 */
export type InoControlSize = 'sm' | 'default' | 'lg';

/** Every member of {@link InoControlSize}, in ascending order. Useful for docs and preview pages. */
export const INO_CONTROL_SIZES: readonly InoControlSize[] = ['sm', 'default', 'lg'] as const;
