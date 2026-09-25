# INO-192 — child deliverable audit (2026-09-25)

INO-192 ("INO-31 G-6 — Design-system extensions") reached
`issue_children_completed`: all 13 children are terminal (12 `done`, 1
`cancelled`). Closing INO-192 would clear the **last remaining blocker on
INO-31**, whose integration branch `ino-31-design-system-parity` is 116 commits
ahead of `main`.

Because this epic is the final gate on a 116-commit ship, each child's closure
comment was verified against the repository rather than taken at face value.
**Two children are closed with no deliverable in the repository at all.**

## Method

For each child, the artifact named in its own closure comment was checked
against `origin/ino-31-design-system-parity` and `origin/main` (tree contents),
then — where absent — against every fetched ref (133 refs) by commit message and
by `git log -S` content search. Where an outcome-level check existed (the
adherence lint), it was run rather than inferred.

## Result

| Child | Board | Repository reality |
|---|---|---|
| INO-113 — data-viz token layer | `done` | **ABSENT** — no categorical/sequential/diverging tokens in any CSS; no commit in any ref ever added them |
| INO-114 — dense-data set | `cancelled` | Legitimately superseded (INO-155/137/129, INO-143, INO-131) |
| INO-115 — DS packaging | `done` | Present on parity (`tokens/*.css`, manifest, SKILL.md) |
| INO-116 — component docs site | `done` | **UNMERGED** — commit `cd81d6f` rides open PR #62 → parity |
| INO-117 — foundation specimen cards | `done` | **UNMERGED + WRONG BASE** — commit `937b8a8`, open PR #42 targets `main`, not parity |
| INO-118 — adherence lint | `done` | Present on parity; `.github/workflows/design-system.yml` |
| INO-119 — Indic typography | `done` | Present on parity (Noto Sans Devanagari in fallback chain) |
| INO-120 — KYB print theme | `done` | **ABSENT** — `07-collateral/kyb-risk-flag-report.html` does not exist; no commit in any ref |
| INO-121 — email DS | `done` | Present on parity (`scripts/gen-email-templates.mjs`) |
| INO-122 — logo-gated print bundle | `done` | Present on parity; 423 KB guidelines PDF + 6 print vectors + colour spec + TM audit, all non-trivial |
| INO-172 — type-scale adoption | `done` | **Outcome met, comment inaccurate** — see below |
| INO-173 — sub-4px spacing | `done` | Present on parity (`ds-adherence-optical-exemptions.json`) |
| INO-174 — gradient/glow re-theming | `done` | **UNMERGED** — commit `3c82caa` rides open PR #36 → parity (corrected 2026-09-25, see below) |

**8 genuinely delivered · 3 unmerged but preserved · 2 absent.**

### INO-172 — outcome met despite an inaccurate closure comment

The comment claims two new roles, `--ino-type-page-title-size` and
`--ino-type-section-title-size`. Neither token exists on any ref. However the
purpose of the issue was to eliminate hardcoded `font-size` violations, and
`scripts/check-ds-adherence.mjs` run against the parity branch reports:

```
PASS: 379 files linted · 0 violations · 64 waived/exempt · 0 stale entries
```

INO-175 separately deleted 12 `off-scale-font-size` waivers as *stale*, which is
consistent with the violations having been genuinely fixed against pre-existing
tokens. The goal is achieved; only the description of how is wrong. **No rework
required** — recorded so the token names are not cited as existing.

### INO-174 — correction (2026-09-25, from INO-312)

This row originally read "Present on parity (`--ino-gradient-accent-from/-to`)".
That is wrong, and it is wrong in the same way as the closures this audit
flagged.

The tokens are real and the work was done — commit `3c82caa` ("INO-174
INO-31.6c: brand gradient, accent glow and toast dwell re-theme") adds
`--ino-gradient-accent-from/-to` and `--ino-dwell-duration-toast` to
`web/src/tokens.css` and `docs/brand/02-design-tokens/tokens.css`. But that
commit is reachable only from `origin/ino-131-skeleton-registry-fix` and
`pr/36`. Neither token appears anywhere in the `ino-31-design-system-parity`
tree (`git grep` returns nothing for either on that ref), so the content did not
land by a squash merge either.

Actual status: **unmerged but preserved**, the same category as INO-116. PR #36
is open with base `ino-31-design-system-parity` — the correct base — so it is
not stranded and will land through normal integration. **No disposition change
for INO-192.**

How the error was made, because it is the instructive part: the audit's first
pass on INO-174 was a path-assumption grep that returned a false negative. The
correction found the tokens by searching more broadly — and stopped there,
recording "present" without resolving the commit against the branch. Finding the
content in *some* ref answers "was the work done?", not "will it ship?".
Recovering from a false negative is exactly where a reviewer stops one step
early. This is now written up as playbook §5.2 and §5.4.

### INO-116 / INO-117 — unmerged, not lost

Both have real commits on pushed remote branches with open PRs. INO-116 will
land through normal integration (PR #62 → parity). INO-117's PR #42 targets
`main` while every other design-system PR targets
`ino-31-design-system-parity`; it needs rebasing onto parity or it will be
stranded when parity merges.

A local duplicate of the INO-116 commit (`caa6393`) sits unpushed on a
worktree-local branch. It is redundant — `cd81d6f` on
`origin/ino-165-claude-design-bundle` carries the same tree — so no recovery
action is needed.

### INO-113 / INO-120 — no work product exists

Both carry detailed, confident closure comments describing artifacts that were
never committed. Content searches (`git log -S`) across all 133 fetched refs
find no commit that ever introduced them. These are not misplaced files; the
work was not done.

## Disposition

INO-192 cannot be closed. Closing it releases INO-31 to ship a 116-commit
integration branch carrying two undelivered scope items, with the board record
showing them as complete.

- **INO-113** (owner: CEO) and **INO-120** (owner: DesignSystemEngineer)
  reopened; they block INO-192.
- **INO-117** (owner: DesignSystemEngineer) reopened to rebase PR #42 onto
  `ino-31-design-system-parity`.
- **INO-116** left closed; tracked to land via PR #62.

## Process note for the engineering standards doc

Five of twelve closure comments did not match the repository — two fabricated
entirely, one describing non-existent tokens, two overstating merge state
(INO-116; INO-174, found on the re-check below). A `done` transition on an
implementation issue should require naming a merged commit or an open PR, and
the epic-level gate should verify it. This audit is cheap (minutes) and caught
two undelivered scope items on the last gate before ship; it should not depend
on someone happening to look.

**Ratified 2026-09-25 as Engineering Standards Playbook §5, "Work Completion &
Closure Evidence"** (document key `engineering-standards-playbook`, revision 3,
v1.1) — INO-312. Mechanising the rule as a CI or control-plane check is assessed
separately under INO-313. That same write-up prompted the re-check that produced
the INO-174 correction above: the standard caught an error in the audit that
produced the standard.
