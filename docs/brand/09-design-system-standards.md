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

## 5a. Branch & workspace isolation — one worktree per issue

The component rule is already *"one component = one directory = one branch = one issue."* That rule
is about the repo. It is silent about the **checkout**, and that gap caused a real incident on
2026-09-15 (INO-162): three concurrent agent runs shared a single working directory, each ran
`git checkout <its-own-branch>` in it, and one run's commit landed on another run's branch. The work
was recovered, but only because the author noticed and rebuilt it from the commit hash.

Whenever two contributions can be in flight at the same time — which is the normal case for the
INO-31 waves — the following is a ship gate, not a preference:

1. **A run that will commit must own its checkout.** As of INO-184, this is enforced by the
   platform: the project's execution-workspace policy defaults every issue to
   `isolated_workspace` / `git_worktree`, so Paperclip provisions a dedicated worktree per issue
   run instead of reusing the shared primary checkout. Treat the manual procedure below as the
   fallback for environments where that policy isn't active: `git worktree add <path> -b <branch>
   origin/ino-31-design-system-parity`, work there, and never `git checkout` a different branch in
   a directory you did not create. A shared primary checkout is read-only for concurrent work.
2. **Verify the branch immediately before every commit**, not once at the start of the run.
   `git rev-parse --abbrev-ref HEAD` must match your issue's branch. A branch can change under you
   between two commands if the directory is shared.
3. **Never push a branch that is not yours,** even to "fix" it. If you find you have committed onto
   someone else's branch, recover your commit by hash into your own worktree and restore the other
   branch's local ref to `origin` — do not rewrite its remote history, and say so in the issue
   thread.
4. **Remove the worktree when the branch is merged or abandoned** (`git worktree remove <path>`), so
   stale checkouts do not accumulate and get reused by a later run.

This is a workflow rule, not a design-system rule, and it applies to any concurrent work in this
repo. It lives here because the component waves are where the concurrency actually happens.

## 5b. SPEC.md citations must resolve on the merge base

§5a is about where you commit. This one is the other half of the same concurrency problem: what you
are allowed to *claim* while the siblings you are citing are still unmerged.

Every component `SPEC.md` justifies its decisions by citing siblings — "the glyph overlay matches
`checkbox/SPEC.md` §4", "same registry finding as `tag/SPEC.md` §8". Those siblings are built on
parallel branches. The CTO review of INO-160 (PR #8, finding 5) found a SPEC citing
`checkbox/SPEC.md`, `InoCheckbox.tsx` and `ino_checkbox.dart` — none of which existed on
`ino-31-design-system-parity` — and justifying `readonly`, `loading` and a spinner as "matching
`ino-checkbox`", when the `ino-checkbox` that *did* exist on the base had none of the three. The
citation was not wrong about the future; it was wrong about the present, which is the only thing a
reader can check.

**A decision record whose precedent is unverifiable is worse than no record,** because the next
implementer copies a pattern that was never actually agreed. So, as a ship gate:

1. **A citation must resolve against the merge base at review time.** Not "will resolve once U-3
   lands" — resolve, in the tree the reviewer is looking at.
2. **A precedent that has not landed yet is written as an explicit forward reference naming the
   issue it waits on** — `(pending INO-158)` — and never as settled precedent. Keep the reasoning;
   it is often the most useful paragraph in the file. Just stop it from reading as a decision that
   has already been made and reviewed.
3. **Cite the thing that is actually on the base, not the thing you meant.** In the INO-160 case the
   only spinner precedent on the base was `ino-button`; that is what the SPEC should have named.
4. **Section numbers are not checkable, so always give the path too.** `checkbox/SPEC.md` §4, not
   "§4 of the checkbox spec". The path is what makes the claim greppable and the gate mechanical.

**Enforced by** `node scripts/check-spec-citations.mjs`, third sibling to the parity and adherence
scripts and wired into the same `npm run check:ds` and the same `design-system.yml` PR job. It walks
every `SPEC.md`, extracts repo-relative paths from inline code spans and link targets, and fails on
any that does not exist. Details worth knowing before you fight it:

- Paths resolve repo-relative, relative to the SPEC's own directory, relative to its parent (so
  `checkbox/SPEC.md` from `toggle/SPEC.md` works the way the prose intends), or — for a bare
  filename like `tokens.css` — anywhere in the tree.
- An elided path (`docs/brand/16-…-parity-vs-echeque-reference.md`) is resolved as a glob and must
  match exactly one real file, so the established shorthand stays legal and still verifies.
- The `(pending INO-nnn)` marker exempts unresolved paths in **its own block** — one paragraph, one
  list item, or one table row. Not the whole file: one marker must not launder every dangling
  citation in the document.
- Fenced code blocks are skipped (they hold example commands, not claims), and there is no waiver
  file by design — the forward-reference marker is the escape hatch, and unlike a waiver it stays
  readable next to the prose it qualifies.
- On a pull request the job needs no arguments: `actions/checkout` hands CI the merge commit, so the
  working tree already *is* the merge base plus your branch. Locally, use
  `--ref origin/ino-31-design-system-parity` to get the same answer without merging.

Running it for the first time found two already-merged dangling citations in
`toast-container/SPEC.md` §7 (`radio-group/SPEC.md`, `checkbox/SPEC.md`), which INO-185 converted to
forward references. Retro-fitting older SPEC files is otherwise not required beyond what the script
flags.

## 5c. Ship sequencing — QA test → CTO review → board approval

§5a is where you commit, §5b is what you may claim. This one is who has to look at it before the
board is asked to approve a merge.

The board raised it on INO-141: PR #48 (FloatLabel) went to a board `request_confirmation` with no
QA test and no CTO review. Checked before writing this rule — **INO-141 carried no execution policy
at all.** It was one of the ~40 component issues outside the nine that INO-202 gated, so nothing
was skipped; there was nothing there to skip. The gap was structural, which is why the fix is a
rule and not a reminder.

As a ship gate, for any PR that changes shipped code under `web/`, `mobile/` or `scripts/`:

1. **Engineer** opens the PR, moves the issue to `in_review`, and comments the twelve-row DoD
   (doc 17 §2) **row by row with the evidence for each**, plus the output of `npm run check:ds`,
   `ng build` and `ng test`. A row asserted without evidence is an unverified row, not a pass.
2. **QA tests it functionally** against that same DoD — running the component, not reading the
   diff — and records pass/fail with findings.
3. **CTO reviews the diff**: architecture, merge hygiene (§2 row 11), token purity, and any
   deviation from doc 16 or the pinned PrimeNG route. PR #48's non-PrimeNG FloatLabel is the case
   that prompted this rule: deviations are legal, but they get named and argued in the SPEC, not
   discovered at merge.
4. **Only then** does the engineer open the board `request_confirmation`, **citing both verdicts by
   issue identifier.** A confirmation that cites neither is withdrawn, not answered.

Five clarifications, each of which has already cost a cycle:

- **The order is enforced by the platform, not by memory.** Steps 2 and 3 are the two stages of one
  native Paperclip `executionPolicy` on the issue (Gate 1 + Gate 4 of the review-gates policy,
  INO-186 v4). The stage is armed by the *transition into* `in_review`, so the policy is attached
  when the issue is created or picked up — attaching it to an issue that is already in review
  persists happily and gates nothing.
- **QA and the CTO catch different defects; neither substitutes for the other.** On PR #38 QA ran
  every gate script, `tsc --noEmit` and a true-merge-base diff and passed all eleven rows then
  existing — correctly; CTO review would have passed the same diff. Two defects were invisible to
  both until the component was actually run (doc 17 §2 row 12). Conversely the CTO review of PR #8
  (INO-160) found four SPEC citations resolving against nothing on the merge base — a class QA has
  no reason to go looking for. Dropping either step drops a defect class.
- **CI is the floor, not the gate.** `design-system.yml` runs three node scripts — parity,
  adherence, spec citations. `ng build`, `ng test`, React Native `tsc` and `dart analyze` are
  **not** in CI. Everything outside those three is a local run, so QA re-runs it independently
  rather than trusting a pasted transcript.
- **The verdict is recorded where the gate lives — the issue, not the PR.** `gh pr review
  --approve` is unavailable to this fleet. QA approves with `{"status":"done","comment":…}` and the
  CTO does the same at the next stage; changes-requested is `{"status":"in_progress"}` naming the
  specific defects, and Paperclip returns the issue to the engineer automatically.
- **Nobody clears their own work, and nobody records someone else's verdict.** A CTO-authored
  component PR takes its second stage from GovernanceComplianceLead or a second engineer, never
  from its author. The engineer never writes "QA passed" on the engineer's behalf: a verdict counts
  only in the reviewer's own words, from the reviewer's own run.

Two carve-outs, so the gate does not become ceremony: a **prose-only docs PR** skips step 2 (there
is nothing to run) and goes CTO review → board; a **revert that unblocks the fleet** may go on CTO
review alone, said out loud on the issue rather than done quietly.

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

## 8. Adding a new theme (INO-92)

The dark/light pair was never a hard limit — it was the first two proof points of a
primitive → semantic-role architecture designed for N themes. `[data-theme="high-contrast"]`
(`tokens.css` §2c, WCAG 2.2 AAA target) is the third, added 2026-09-10 specifically to prove
that out before anyone needed a fourth under time pressure. It cost one CSS block, a one-line
union-type addition per platform, and zero component changes — because component rule §5 (bind
only to semantic roles) was already enforced.

**The 3-layer rule that makes this cheap:**

1. **Primitives** (`tokens.css` §1) — raw hex values, theme-specific, added freely. A new theme
   gets its own primitive block (see `--ino-primitive-hc-*`) so no existing theme's raw values
   are touched.
2. **Semantic roles** (`tokens.css` §2) — the fixed vocabulary (`--ino-color-surface`,
   `--ino-color-accent`, `--ino-color-on-danger`, …). A new theme re-points every existing role
   name at a new primitive; it never invents a new role name. This is the rule that keeps the
   cost at "one CSS block," not "grep every component."
3. **Components** (`06-angular-components/`, RN/Flutter equivalents) — consume role tokens only
   (§5). A component that already passes the dark/light parity gate repaints correctly in any
   Nth theme for free, with no component-level changes, *because it never branched on
   `data-theme` or a theme name in the first place.*

**Concrete steps, in order:**

1. Add a `--ino-primitive-*` block in `tokens.css` §1 for the new theme's raw values, if it needs
   colors distinct from existing primitives (it usually will — see the high-contrast block's
   comment for why reusing dark mode's muted RAG hues failed the AAA target).
2. Add a `[data-theme="<name>"]` block in `tokens.css` (after §2b) that re-points every semantic
   role the new theme needs to override at a primitive from step 1 — copy the full role list from
   an existing theme block as your checklist so nothing is silently missed.
3. Compute contrast for every text/fill pair the new theme touches and record it in
   `02-design-tokens/README.md` (own subsection, same relative-luminance method as the existing
   tables) — same rule as governance item 1.2, no new pair ships unaudited.
4. Add the theme name to `InoTheme`/`ThemeMode`/`InoThemeMode` (whichever union type each
   platform uses) — see the diffs in `web/src/app/services/theme.service.ts`,
   `mobile/react-native/src/theme/ThemeProvider.tsx`, and
   `mobile/flutter/lib/theme/theme_controller.dart` for the exact one-line-per-platform shape.
   This is deliberately a union-type change, not a new boolean or a new prop, so an unhandled
   theme is a compile error, not a silent fallback.
5. Port the new theme's resolved role values into `mobile/react-native/src/theme/tokens.ts`
   (`colors<Name>`) and `mobile/flutter/lib/theme/tokens.dart` (`InoPalette.<name>`).
   Capacitor needs no separate step — it imports `web/src/tokens.css` directly (zero drift by
   construction).
6. Run `node scripts/check-theme-parity.mjs` from the repo root. It is a dependency-free source
   audit (no build step, no test framework) that fails loudly if: the canonical/`web/` CSS files
   diverge, a theme is missing its RN or Flutter palette, a color role differs between CSS and
   either mobile port by more than a rounding tolerance, or a shared numeric token (space, radius,
   touch target, motion duration) drifts between CSS and either mobile port. Treat a failing run
   as a blocking defect, not a warning — this is what replaces "hand-checked, spot-checked once"
   with "checked every time."
7. Wire a UI entry point on every surface (web `ThemeService.toggle()`/style guide, RN/Flutter
   settings screens) so the theme is actually reachable, not just present in the token file.
8. Update `00-INDEX.md` §2 and `12-branding-completeness-checklist.md` to reflect the new theme
   count — those documents are the audit trail; an unreflected addition is (for governance
   purposes) the same as an undocumented one.

**What this recipe does not cover:** a theme that needs a *new* semantic role (not just a new
value for an existing one) is a bigger change — it means every existing theme also needs a value
for that role, and every component that should react to it needs a deliberate design decision,
not just a repaint. That's still a token-governance-gated change (§1), just a larger one than
"add a theme."
