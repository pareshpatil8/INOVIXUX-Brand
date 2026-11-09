# `<ino-divider>` — component spec

**Issue:** [INO-441](/INO/issues/INO-441) (INO-31 Phase B2, doc 26 §5 row `ino-divider`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be
written down rather than silently made.

---

## 1. Label only renders in the horizontal orientation

Doc 26 §5's row lists "with centered label" under Variants/Structure with no vertical-specific
mention, and every reference benchmark (PrimeNG `Divider`, Material divider-with-text) only
supports a centered label on the horizontal form — a label mid-way down a vertical rule has no
established layout or reading order. The template gates the label/second-line pair on
`orientation === 'horizontal'`; a `label` passed while `orientation="vertical"` is silently
ignored rather than erroring, the same "unsupported combination degrades quietly" contract
`ino-toggle-button` documents for mobile-only input omissions (SPEC.md §7 there).

---

## 2. `role="separator"` stays on the host even when labelled, not `role="group"`

A labelled divider is still fundamentally a separator with a caption, not a labelled group of
content — the label describes the boundary ("Section 1 ends here"), it does not own child
content the way a `fieldset`/`group` owns its members. `role="separator"` permits element
content (the ARIA spec does not restrict it to being empty), so the label text stays in the
accessible tree without a role change. This matches the PrimeNG `Divider` benchmark, which keeps
a single `role="separator"` for both the plain and content-bearing forms.

`aria-orientation` is only written for `orientation="vertical"` — `separator`'s APG default is
horizontal, so writing `aria-orientation="horizontal"` would be a redundant attribute, the same
"only write the non-default" convention `ino-toggle-button`'s `ariaLabel` input follows.

---

## 3. Thickness is not density-dependent

Doc 26 §5 lists "thickness tokens" as this component's only sizing axis (no sm/md/lg scale).
`thickness` reads the new shared `--ino-border-width-{hairline,thick}` tokens (tokens.css §6b,
added with this issue) rather than `[data-density]`-repointed aliases: a divider's line weight is
a deliberate visual choice (hairline rule vs. an emphasized section break), not a control
comfort/density trade-off the way `ino-toggle-button`'s height is. The `[data-density='dense']`
ancestor attribute (tokens.css §12) is left untouched by this component on purpose — a divider
inside a dense table row should draw the same hairline it draws anywhere else.

---

## 4. Vertical orientation requires a sized ancestor

`orientation="vertical"` sets `block-size: 100%` and expects the host to be a flex/grid child
with a definite cross-size (e.g. a flex row with `align-items: stretch`, or an ancestor with an
explicit height) — the same contract a native `<hr>` rotated 90deg or a bare `border-inline-start`
rule would carry. This is not a component defect; it is documented here so a consumer who drops
`<ino-divider orientation="vertical">` into an unsized container and sees a zero-height line knows
why, rather than filing it as a bug.

---

## 5. Mobile ports

Both ports render the same "flex row/column with a hairline border on one line, optional centered
label text" shape, reusing each platform's existing border/token-reading conventions.

**Flutter** (`mobile/flutter/lib/widgets/ino_divider.dart`): a `Row`/`Column` (by orientation)
with a `Container` line (`BoxDecoration` border on one logical side) and, when labelled, a
`Text` in `colors.onSurfaceMuted` between two flex-expanded line segments — the same
flex-line/label/flex-line split the web template uses. `Semantics(label: ...)` is omitted when
there is no visible label (an unlabelled rule has nothing useful to announce beyond the divider
itself, matching `ino_toggle_button.dart`'s "no `semanticLabel` fallback needed" posture when a
visible label already exists).

**React Native** (`mobile/react-native/src/components/InoDivider.tsx`): a `View` with
`accessibilityRole="none"` plus `accessible={false}` for the bare line (RN has no `separator`
accessibility role; a purely decorative rule is correctly hidden from the accessibility tree,
mirroring how `aria-hidden` is used for decorative icons elsewhere in the catalog) and, when
labelled, the label `Text` stays in the tree (it is real content, not decoration) while the two
line `View`s keep `accessible={false}`.
