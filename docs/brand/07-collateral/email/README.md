# INO-121 — Email design system: transactional templates + signature block

**Status:** Done (structure). Final logo asset swaps in at the end, once INO-82's vector artwork
lands — not blocked on it for anything here, matching the issue's stated scope.

Email is the one branded surface `tokens.css` cannot be linked into directly: clients strip
`<link>`/external stylesheets, many strip `<style>` blocks too, and layout has to be `<table>`,
not flex/grid. So instead of hand-picking colors for this surface (which would make email a third
source of truth alongside `tokens.css` and the mobile token ports), this workstream ships a
**generator** that parses `tokens.css` directly and emits the inlined, table-based HTML.

| Piece | Path |
|---|---|
| Generator (reads `tokens.css`, writes the HTML below) | [`../../../../scripts/gen-email-templates.mjs`](../../../../scripts/gen-email-templates.mjs) |
| Drift guard (regenerates in place, diffs vs. committed) | [`../../../../scripts/check-email-tokens.mjs`](../../../../scripts/check-email-tokens.mjs), wired into `npm run check:ds` and the `design-system` CI workflow |
| Verification email | [`templates/verification.html`](templates/verification.html) |
| Approval-requested email | [`templates/approval-requested.html`](templates/approval-requested.html) |
| Report-ready email | [`templates/report-ready.html`](templates/report-ready.html) |
| Password-reset email | [`templates/password-reset.html`](templates/password-reset.html) |
| Team signature block (HTML fragment, not a standalone document) | [`templates/signature.html`](templates/signature.html) |

## Regenerating

```
node scripts/gen-email-templates.mjs
```

Never hand-edit the files under `templates/` — `check-email-tokens.mjs` fails the build if a
fresh run of the generator doesn't reproduce them byte-for-byte. Change a value by changing
`tokens.css` (or the generator's layout/copy) and regenerating.

## What's derived vs. hand-authored

Derived straight from `tokens.css` roles (light theme as the inlined baseline, dark theme behind
`@media (prefers-color-scheme: dark)`): surface/surface-raised, on-surface/on-surface-muted,
border, accent, accent-text-safe, on-accent, plus the display font stack, `--ino-radius-md/lg`,
and the `--ino-space-*` scale used for all padding/margins. Hand-authored: the copy strings, the
`{{mustache}}`-style placeholders (`{{recipientName}}`, `{{verificationUrl}}`, etc. — this repo
has no email-send integration, so placeholders are left for whatever templating layer a backend
wires in later), and the table/shell markup structure itself.

## Dark mode: aware, not required

The generator emits light-theme values inline (the baseline every client honors) plus a
`prefers-color-scheme: dark` block using dark-theme token values, scoped to a handful of
`.ino-*` classes. Clients that support it (Apple/iOS/macOS Mail, Outlook.com web, several
others) render the dark variant; clients that strip `<style>` or don't support the media query
keep the inlined light values — a correct, readable degrade either way, not a broken one.
`<meta name="color-scheme">` / `<meta name="supported-color-schemes">` opt in the clients that
read those hints (notably Apple Mail) without affecting anything else.

## Why table layout, not the component system

`06-angular-components/` and `/web/` are real DOM Angular renders — not usable here. Email
clients (Outlook desktop especially) render with a stripped rendering engine that only reliably
supports `<table>`-based layout and fully inlined `style=""` attributes; flexbox/grid support is
inconsistent enough across the matrix that using it would silently break the highest-traffic
client in a B2B/regulated context. `role="presentation"` on every layout table keeps screen
readers from announcing them as data tables.

## What's intentionally not here

- **No send integration.** These are template files, not wired into a mailer (SES/Postmark/etc.);
  that's a backend integration decision out of scope for this design-system workstream.
- **No final logo SVG.** The header uses the same CSS text wordmark treatment as
  `../letterhead.html` and `../pitch-deck-template.html`, pending INO-82's vector artwork — the
  issue explicitly says structure is not blocked on that swap.
- **No live client testing matrix** (Litmus/Email on Acid run across Outlook/Gmail/Apple
  Mail/etc.). The templates follow known table+inline-style email-safe conventions, but an actual
  render audit across clients is a QA pass, not a design-system-generator task — hand to
  **QALead** with these four files plus the signature block if/when that audit is wanted.
