# INO-31 — Design System Standards, Policies & Governance

**Responds to:** *"Skills / policies / standards to be placed."* This is the operating manual for
how anyone (human or agent) touches INOVIXUX brand/design-system surfaces from here on — written
now specifically to prevent the problem that caused this file's sibling (`00-INDEX.md`) to be
needed: five concept revisions and no single source of truth.

---

## 1. Token governance — how a visual change gets made and approved

1. **Primitives change → semantic roles never do.** `tokens.css` §1 (primitives, raw hex values)
   is the only place a color/spacing value is allowed to change for a re-theme. Section 2
   (semantic roles: `--ino-color-accent`, `--ino-color-surface`, etc.) must never be edited to
   point at a new raw value inline — it re-points to a primitive. This is what makes a mark swap
   (e.g. Verified Line → Aperture Mark) a one-line diff instead of a grep-and-replace across every
   component.
2. **No new color, font, or spacing value ships without a WCAG 2.2 contrast check.** Every pair in
   `02-design-tokens/README.md`'s audit table was computed, not eyeballed — new pairs follow the
   same rule before landing in `tokens.css`, not after.
3. **One approval gate per identity change, not per file.** A mark/accent/typography swap is
   approved once, at the token level (`--ino-color-accent`, `--ino-font-display`) — not
   re-approved separately for the style guide, the mockup, and each collateral file that consumes
   it. (This is also why the v1–v5 round produced so much review fatigue: three named concepts
   were being re-approved as whole systems each round instead of as token diffs. Going forward,
   changes are proposed as token diffs against the approved baseline, not as new full concepts,
   unless you explicitly ask for new structural concepts again.)

## 2. File & naming conventions (the fix for the v1–v5 sprawl)

- **Numbered docs (`00-`, `01-`, `02-`...) are the current, canonical set.** If a doc is
  superseded, it is marked "superseded by X" in its own header — it is not deleted (paper trail)
  and not left ambiguous about whether it's current.
- **No more bare version suffixes for the *same* concept** (`-v2`, `-v3`, `-v4` as seen in
  `mockups/`). Historical mockups already on disk are frozen as archive (linked once from
  `00-INDEX.md` §6, not re-linked from anywhere else). Any new visual revision from here forward
  is a diff described in a changelog section of the relevant doc, not a new numbered file.
- **`00-INDEX.md` is the only required entry point.** Every other doc may assume the reader
  arrived via the index; no doc needs to re-explain project context from scratch.

## 3. INO-14 non-commercial hold — enforcement rule, not a suggestion

- Any collateral or copy that could be read as a commercial claim, live pricing, or "available
  now" must carry the INO-14 disclaimer, not just avoid the banned words. `07-collateral/
  pitch-deck-template.html`'s disclaimer slide is hard-coded (not a removable placeholder) as the
  reference implementation of this rule — copy that pattern, don't soften it, for any new deck or
  public-facing page.
- "Illustrative" callouts (rails list, geography grid, deployment tiers) stay marked as
  illustrative in the markup/HTML comments until you explicitly confirm them as fact — per your
  answer, these are currently left as placeholders, not corrected yet.

## 4. Accessibility standard

- **WCAG 2.2 AA is the floor**, not an aspiration — every shipped color pair is contrast-audited
  (see `02-design-tokens/README.md`); pointer targets meet the 24×24px §2.5.8 minimum, and dense
  KYB tables deliberately exceed it (32px rows) because mis-clicks there have real consequences.
- **`prefers-reduced-motion` must be respected** by any animation (count-up, scroll-reveal, tier
  toggle) — already true of the Angular Animations approach chosen in `angular-theme-contract.md`.
- **Font fallback chain is mandatory**, not optional: every `--ino-font-*` token must keep
  `system-ui, Arial, Helvetica` as a fallback so a KYB report never silently breaks layout for a
  reviewer on a locked-down machine that can't reach a font CDN.

## 5. Component contribution rule

- New Angular components bind only to semantic role tokens (`var(--ino-color-*)`,
  `var(--ino-space-*)`, etc.) — never a hardcoded hex, px, or raw value. `06-angular-components/`
  is the reference implementation; any new component is reviewed against that pattern before
  merge.
- Status/semantic props (like `<ino-metric-panel status="high|medium|low">`) are closed unions,
  never a raw color prop — this is what keeps the WCAG-audited RAG pairs from being bypassed by a
  future caller passing an arbitrary color.
- **Dark + light parity is a ship gate, not a follow-up.** (Per 2026-09-08 feedback on the surface
  card round.) Because every component is required to bind only to semantic tokens (previous
  bullet), and every semantic token already has a `[data-theme="light"]` override in `tokens.css`
  §2b, correct token usage gets a component both themes for free — but that's now a checked gate,
  not an assumption:
  1. Before a component/page is called done, render it with the nav's theme toggle in both
     states and confirm no hardcoded color, no `prefers-color-scheme`-only logic, and no
     dark-only shadow/gradient value slipped in.
  2. The toggle itself (`ino-nav.component.ts` → `ThemeService`) must be present and functional
     on any page a new surface ships on — not just on the original homepage — since that's the
     only way a reviewer can check bullet 1 without opening devtools.
  3. This applies retroactively as a check, not just to new work: `<ino-card>` and the
     surface-depth tokens from the 2026-09-08 round were built token-correct and re-verified
     against this gate (`web/` toggle confirmed working, `ng build` clean) rather than assumed.

## 6. Asset request process (logo, Figma, print files)

1. Final vector artwork (logo `.svg` lockups, favicon crop, monochrome variant) requires either a
   human designer pass or an authorized Figma connector session — an agent does not hand-draw
   production vector art.
2. Before any push to a real Figma file: confirm the connector is authorized to *your* account
   (session-visible Figma tools ≠ your account being connected) and confirm which file/workspace
   it should land in.
3. Print-ready files (business card, letterhead press export) require the final vector mark from
   step 1 first — the specs in `07-collateral/` are complete and do not need to be redone once
   that mark exists.

## 7. Scope boundary — what this design system explicitly does not decide

- It does not decide, approve, or auto-flag anything in the KYB risk-review flow — RAG status
  values are supplied by the product logic and only *rendered* per the audited token contract.
  This mirrors the INO-14 mandate at the design-system layer, not just in copy.
