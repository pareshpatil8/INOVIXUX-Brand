# `<ino-alert>` / `<ino-toast-container>` — Message & Toast

> Parity benchmark: PrimeNG 22.1.1 `Message` + `Toast` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes **N-8** in `docs/brand/16-design-system-parity-vs-echeque-reference.md`.
> Preview: [`previews/alert.html`](previews/alert.html).

One component backs all three shapes PrimeNG splits across `Message` and `Toast`. `variant` changes
layout only (radius / max-width / shadow); it never changes colour logic, so the three shapes cannot
drift into three differently-audited contrast stories.

---

## Severity tiers

| `status` | Fill / text roles | Live-region role | Use it for |
|---|---|---|---|
| `info` | `--ino-color-info` / `--ino-color-on-info` | `status` (polite) | A fact the reviewer should know that implies **no action** — "screening re-runs nightly", "3 documents pending upload" |
| `success` | `--ino-color-success` / `--ino-color-on-success` | `status` (polite) | A completed action — "Changes saved", "Entity verified" |
| `warning` | `--ino-color-warning` / `--ino-color-on-warning` | `status` (polite) | Something needs a human decision — "GSTIN mismatch", "needs a second reviewer" |
| `danger` | `--ino-color-danger` / `--ino-color-on-danger` | `alert` (assertive) | A failure or escalation — "could not reach the verification service" |

The union is ordered low → high severity in source, and it is **closed**: an unlisted string is a
compile error, not a silently-unstyled alert.

### Why `info` exists (INO-128)

Before this, the union was `success | warning | danger` and every neutral statement had to be
dressed as a `warning`. In a KYB console that is not a cosmetic problem — it is the mechanism by
which reviewers learn to skim past amber. `info` gives neutral statements a register of their own so
`warning` keeps meaning *"you need to decide something."*

`info` is deliberately **not** the accent violet/indigo. An informational notice that looks like the
primary call-to-action reads as something to click, which is precisely wrong.

---

## API

### `<ino-alert>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `status` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'success'` | Drives fill, icon, SR status word, and live-region politeness |
| `variant` | `'inline' \| 'banner' \| 'toast'` | `'inline'` | Layout only — see below |
| `heading` | `string` | `''` | Optional bold first line; omitted from the DOM when empty |
| `dismissible` | `boolean` | `false` | Renders the close button |

| Output | Type | Fires when |
|---|---|---|
| `dismissed` | `void` | The close button is activated (click or keyboard) |

Message body is projected via `<ng-content>`.

### Variants

| `variant` | Difference from `inline` |
|---|---|
| `inline` | Baseline: `--ino-radius-lg`, no shadow, flows in content |
| `banner` | `border-radius: 0`, wider inline padding (`--ino-space-7`) — full-bleed page-top strip |
| `toast` | `max-width: 360px` + `--ino-elevation-2`, stacked by `<ino-toast-container>` |

### `ToastService`

```ts
toastService.show({ status: 'info', message: 'Screening re-runs nightly at 02:00 IST.' });
toastService.show({ status: 'danger', heading: 'Failed', message: '…', durationMs: 0 }); // sticky
```

| Field | Type | Default |
|---|---|---|
| `status` | `InoAlertStatus` | `'success'` |
| `heading` | `string?` | — |
| `message` | `string` | *(required)* |
| `durationMs` | `number` | `5000`; `0` disables auto-dismiss |

`show()` returns the toast id; `dismiss(id)` removes it early. Mount exactly one
`<ino-toast-container>` near the app root — the service is `providedIn: 'root'`, so the queue is
shared regardless of how many places call `show()`.

---

## Accessibility contract

**Role / ARIA**

- `role="alert"` (assertive) for `danger` only; `role="status"` (polite) for `info`, `success`, and
  `warning`. Interrupting a screen-reader user mid-sentence is justified by a failure, not by an
  informational notice.
- The status word (`Information:` / `Success:` / `Warning:` / `Error:`) is rendered
  screen-reader-only **ahead of** the message, so severity never depends on colour or on the icon.
- The icon glyph is `aria-hidden="true"` — it is decorative reinforcement, never the sole carrier of
  meaning (WCAG 2.2 SC 1.4.1).
- `<ino-toast-container>` carries `aria-live="polite" aria-atomic="false"` on the stack rather than
  per toast, so newly-queued toasts are announced without moving focus.

**Keyboard**

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Moves to/from the dismiss button (the only focusable element) |
| `Enter` / `Space` | Activates dismiss — native `<button>` behaviour, not re-implemented |

A non-dismissible alert has no focusable content by design: it is a live region, not a widget, and
adding a tab stop to a static notice is a navigation cost with no benefit.

**Contrast (WCAG 2.2 AA text + SC 1.4.11 non-text)** — all measured, not assumed; full tables in
`docs/brand/02-design-tokens/README.md` §Contrast:

| Theme | `on-info` on `info` fill | `info` on `surface` |
|---|---|---|
| dark (`:root`) | 6.04:1 | 5.70:1 |
| light | 6.40:1 | 6.14:1 |
| high-contrast | 9.76:1 (AAA) | 9.76:1 (AAA) |

`node scripts/check-theme-parity.mjs` asserts the high-contrast pairs (≥7:1) on every run.

**Targets** — the dismiss button is `--ino-target-comfortable` (44px), above both the 24px SC 2.5.8
minimum and the 44px comfortable guidance.

**RTL** — the alert body is flex-ordered and uses logical spacing throughout. The toast stack uses
`inset-inline-end` / `inset-inline` (never `left`/`right`), so it mirrors to the bottom-left under
`dir="rtl"` without a second stylesheet.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6):

- **Toast `position` input.** PrimeNG offers six positions; we ship bottom-end only. Tracked as a
  separate gap in doc 16 (Messages group) — it is a container-layout change, not a severity change,
  and folding it into this issue would have coupled two unrelated diffs.
- **Tinted / outlined severity styles.** PrimeNG's `Message` has `variant="outlined" | "simple"`.
  Ours fills solidly so the audited `--ino-color-*` / `--ino-color-on-*` pairs apply unmodified; a
  tinted background would need a new token per severity per theme, and `web/src/tokens.css` is
  frozen after Wave 0.
- **Size API (`sm` / `default` / `lg`).** Not applicable to this component in the Wave 0 pass: an
  alert is a content block sized by its message, not a control on the control-height scale. Revisit
  only if a compact in-table variant is actually specified.

## Mobile parity

Both mobile tracks carry the `info` / `onInfo` roles in their palettes —
`mobile/react-native/src/theme/tokens.ts` and `mobile/flutter/lib/theme/tokens.dart`, all three
themes, byte-verified against `tokens.css` by `scripts/check-theme-parity.mjs`. The Capacitor track
imports `web/src/tokens.css` directly and therefore picks up the roles with no port step.
