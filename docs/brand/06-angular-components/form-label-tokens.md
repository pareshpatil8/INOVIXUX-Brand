# Form-label token set — `label-lg` / `label` / `label-sm` / `hint` / `caption`

> Wave 0, INO-125. Blocks the Label / FloatLabel / IftaLabel components and every form control's
> uplift (each of those is its own future issue) — this issue is the token layer they will all bind
> to, the same shape W0-1/W0-2 gave `:active`/focus-ring and the control-size scale. The source of
> truth is always `tokens.css` §4b, never this file.
> Preview: [`previews/form-label-tokens.html`](previews/form-label-tokens.html).
> Register item: N-4.

## 1 — The problem this replaces

Before this issue there was exactly one `--ino-type-label-*` token, and it was mono, uppercase, and
0.14em-tracked — a display accent for section kickers and metric captions, not something safe for a
form field's label. Doc 16 §9.2 filed it as **N-4: a one-token system where a five-token system is
required**. This issue is a rename plus a real build-out, not an addition alongside the old token:

- `--ino-type-label-*` (the uppercase kicker) is renamed to **`--ino-type-eyebrow-*`**. Every
  consumer (`ino-footer`, `ino-hero`, `ino-metric-panel`, the docs shell) moved in the same commit.
  No alias was left behind — an alias would have let the exact misuse doc 16 filed survive silently.
- `label` now means what it says: a real five-role form-label set sits at §4b, sentence case,
  display font, not tracked out.

## 2 — The five roles

| Token family | Role | Pairs with (§12 control) |
|---|---|---|
| `--ino-type-label-lg-*` | Label for a `size="lg"` field | `lg` |
| `--ino-type-label-*` | Label for a `size="default"` field | `default` |
| `--ino-type-label-sm-*` | Label for a `size="sm"` field, and dense-table column heads | `sm` |
| `--ino-type-hint-*` | Help text under a field (non-error) — the `aria-describedby` target | — |
| `--ino-type-caption-*` | Character counts, timestamps, sub-table footnotes | — |

The three sized tiers map 1:1 onto `InoControlSize` (`web/src/app/components/control-size.ts`), so a
control's `size` input selects its label tier for free — a component never invents a label size of
its own. `hint` and `caption` are not sized tiers; they are fixed, slightly smaller than `label`,
because they support a field rather than name it.

Each tier sits one step under the control font size it pairs with (§12 `-lg` is 17px, `label-lg` is
16px) — a label naming a field should not compete visually with the value typed into it — while
staying above the 11px `--ino-type-eyebrow-size`, which is a display size, not safe for sustained
reading at label length.

## 3 — Fields

Every role carries all four: size, line-height, weight, tracking.

| Role | size | line | weight | tracking |
|---|---|---|---|---|
| `label-lg` | 16px | 1.35 | 500 | -0.01em |
| `label` | 13.5px | 1.4 | 500 | 0em |
| `label-sm` | 12px | 1.4 | 500 | 0.005em |
| `hint` | 12.5px | 1.5 | 400 | 0em |
| `caption` | 11.5px | 1.45 | 400 | 0.01em |

`hint` and `caption` are `weight: 400` (body weight) — they support the field, they don't name it,
so they don't carry the label's 500 weight.

## 4 — Colour roles

Every colour role is an **alias of an already-themed role**, not a fresh per-theme pick — that's why
light and high-contrast need zero overrides for the aliases below; the primitive → semantic-role
architecture (doc 16 §4.3, Layer 1) does that work for free.

| Token | Aliases | Use |
|---|---|---|
| `--ino-color-label` | `--ino-color-on-surface` | resting form label |
| `--ino-color-label-muted` | `--ino-color-on-surface-muted` | the "(optional)" suffix; labels on a readonly field |
| `--ino-color-label-disabled` | `--ino-color-on-surface-subtle` | label on a disabled control — WCAG 1.4.3 exempts disabled content, same carve-out the role it aliases already carries |
| `--ino-color-label-invalid` | `--ino-color-danger-text-safe` | label text once the field is invalid |
| `--ino-color-required-marker` | `--ino-color-danger-text-safe` | the asterisk — never the only signal, see §Accessibility below |
| `--ino-color-hint` | `--ino-color-on-surface-muted` | resting hint text |
| `--ino-color-caption` | `--ino-color-on-surface-muted` | resting caption text |

Components bind to these names and never to `on-surface`/`danger` directly, so a future "labels are
muted by default" decision stays a one-line change in `tokens.css`, not a per-component sweep.

### The `--ino-color-danger-text-safe` fix

Building this set surfaced a live accessibility defect and fixed it: pointing an invalid-label role
straight at `--ino-color-danger` renders at 4.16:1 on the dark surface and **fails WCAG 1.4.3 AA**
(4.5:1 required). `--ino-color-danger-text-safe` is new, all three themes, on a new
`--ino-primitive-red-400` — exactly parallel to the existing `--ino-color-accent-text-safe` split
between a fill colour and a legible-as-text colour. `label-invalid` and `required-marker` both alias
it rather than `danger` directly, and `scripts/check-theme-parity.mjs` asserts that alias so the two
roles can never quietly re-point at the unsafe token.

## 5 — Density

Density (`[data-density="dense" | "fluid"]`) re-resolves the **default** tier only — `label-lg` and
`label-sm` are explicit tier requests coming from a control's `size` input and stay fixed, exactly
the same rule §12 uses for the control-size scale itself.

| | label size / line | hint size / line | caption size / line |
|---|---|---|---|
| **dense** | 12.5px / 1.35 | 11.5px / 1.4 | 11px / 1.35 |
| **base** | 13.5px / 1.4 | 12.5px / 1.5 | 11.5px / 1.45 |
| **fluid** | 14.5px / 1.45 | 13px / 1.55 | 12px / 1.5 |

`fluid` is re-declared rather than left to inherit `:root`, for the same reason §12 re-declares its
own fluid geometry: a fluid island nested inside a dense shell must re-resolve, not silently inherit
the dense tier.

## 6 — Accessibility

- **Contrast.** Every colour role (`label`, `label-muted`, `hint`, `caption`, `label-invalid`,
  `required-marker`) is audited against `surface` / `surface-raised` / `surface-sunken` in all three
  themes: AA 4.5:1 in dark/light, AAA 7:1 in high-contrast. `label-disabled` is exempt (WCAG 1.4.3
  disabled-content carve-out) and is checked for presence only.
- **The asterisk is never the only signal.** `--ino-color-required-marker` renders `label-invalid`
  colour, which meets contrast, but colour alone never carries meaning (WCAG 1.4.1) — every consumer
  must also expose `aria-required="true"` and/or the word "required" in an accessible name, not just
  a red `*`.
- **`hint` is the `aria-describedby` target.** A field's help text binds via `aria-describedby`, not
  by visual proximity alone, so it reaches assistive tech regardless of DOM order.
- **RTL.** No role declares a physical margin or side; consumers position label/hint/caption with
  logical properties (`margin-block`, not `margin-top`), so no role itself needs an RTL variant.
- **Zero hardcoded values.** No component may declare a raw px size/weight/leading/tracking for a
  form label, hint, or caption outside this set; `scripts/check-theme-parity.mjs` asserts the token
  shape (role presence, alias pinning, contrast, density re-declaration) so a violation fails CI.

## 7 — Mobile parity

This issue is web-token scope; `label`/`hint`/`caption` are UI-chrome type roles, and the mobile ports
carry colour and control-geometry parity (§12) but do not mirror the web type scale token-for-token —
each platform's native type system (Dynamic Type / SP-based scaling) owns type sizing on-device. What
does carry: the **colour role aliases**, since `--ino-color-label*`/`-hint`/`-caption` are pure
aliases of roles the mobile ports already mirror (`onSurface`, `onSurfaceMuted`, `onSurfaceSubtle`,
`dangerTextSafe`) — no new mobile token is needed, and `check-theme-parity.mjs`'s existing per-theme
role-completeness check already covers `dangerTextSafe` (the one role this issue added) for both
ports.

## 8 — Verification

```sh
node scripts/check-theme-parity.mjs   # structural + contrast assertions on tokens.css §4b + both mobile ports
```

The script fails the build if: a colour role is missing or fails its theme's contrast budget;
`label-invalid` / `required-marker` stop aliasing `--ino-color-danger-text-safe`; a size-tier token
is missing at `:root`; or a density block fails to re-declare the default tier's size/line-height.
