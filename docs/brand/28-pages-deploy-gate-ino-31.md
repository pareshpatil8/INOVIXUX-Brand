# 28 — Pages deploy gate: publish only QA-approved tags (INO-31 D-gate 4, INO-376)

Authored by CTO. Implements doc 26 §7 **D-gate 4**: Pages deploys from tagged QA-approved states
of `main` rather than from every merge, so a half-remediated catalog never publishes again.

Blocked on and unblocked by D-gates 1-2 — [doc 27](27-qa-validation-gate-and-publish-contract-process-ino-31.md)
defines what "QA-approved" means (QALead's `QA-APPROVED` disposition against the doc 26 §2
Component Publish Contract). This document defines only the *mechanism* that consumes that
decision. It does not add, relax, or reinterpret any QA criterion.

---

## 1. What changed

`.github/workflows/deploy-pages.yml`:

| | Before | After |
|---|---|---|
| Trigger | `push` to `main` (path-filtered) + `workflow_dispatch` on any ref | `push` of a `qa-approved-*` tag + `workflow_dispatch` **at a tag ref** |
| Gate | none — every qualifying merge published | `gate` job runs first; `build` and `deploy` both `needs:` it |
| Environment | `github-pages` allowed deploys from branch `main` | allows deploys from tag pattern `qa-approved-*` only |

**A merge to `main` no longer publishes anything.** `main` is still the integration branch and
still enforces its own required checks (compile gate, `check-theme-parity` — INO-262/303);
publishing is now a separate, deliberate act.

## 2. The tag contract

Tag name: **`qa-approved-YYYYMMDD[-N]`** (`-N` disambiguates multiple publishes in one day).

The tag must be **annotated** (`git tag -a`) and its message must carry two trailers:

```
components: <comma-separated component list, or "all" for a full-catalog republish>
qa-issues:  INO-<n>[, INO-<n> ...]
```

`qa-issues:` names the issues whose QA subtasks carry QALead's `QA-APPROVED` disposition comment.

**The tag is a pointer to a QA decision, not a QA decision.** Per INO-295, only QALead authors a
QA sign-off, on the component's own QA issue, from a run woken for it. Whoever cuts the tag is
asserting *"these sign-offs exist at these issues"* — they are not recording an approval on
QALead's behalf. CI enforces that the pointer is present and well-formed; it cannot read Paperclip
comments (no API credentials in Actions), so **the truth of the pointer is a review
responsibility, not an automated one.** See §5.

## 3. What the gate job enforces

Ordered; first failure stops the run before anything is built or deployed.

1. **Ref is a tag.** A `workflow_dispatch` on a branch fails with a message pointing here.
2. **Name matches** `^qa-approved-[0-9]{8}(-[0-9]+)?$`.
3. **Tag is annotated.** A lightweight tag is rejected — it carries no message, so it cannot
   reference the sign-offs it claims. (A lightweight `qa-approved-*` tag *does* trigger the
   workflow, so this check is load-bearing, not cosmetic.)
4. **`qa-issues:` trailer present** and names at least one `INO-<n>`.
5. **`components:` trailer present** and non-empty.
6. **Tag commit is an ancestor of `origin/main`.** Because `main` is protected with strict
   required checks, containment in `main` is *also* the proof that this exact commit passed the
   compile and theme-parity gates — so the gate does not re-query check runs (reuses the existing
   mechanism rather than duplicating it).

On success the job writes the tag, commit SHA, and full annotation to the run's step summary, so
every deployment has its claimed QA basis recorded in the Actions log.

All six paths were exercised against real git tag objects before merge (lightweight-with-valid-name,
missing trailers, off-`main` commit, malformed name, and the accepted case).

## 4. How to publish

```bash
# From a clean checkout of main, at the commit you intend to publish:
git fetch origin && git checkout main && git pull --ff-only

git tag -a qa-approved-$(date +%Y%m%d)-1 -F - <<'EOF'
Publish QA-approved catalog state

components: ino-tabs, ino-stepper
qa-issues: INO-361, INO-369
EOF

git push origin qa-approved-$(date +%Y%m%d)-1
```

To re-run a publish for an existing tag (e.g. a transient build failure), dispatch **at the tag**:

```bash
gh workflow run deploy-pages.yml --ref qa-approved-20260928-1
```

## 5. Limits — stated plainly

- **CI cannot verify the QA sign-off itself.** It verifies the tag's *shape* and its containment
  in `main`. A tag citing an issue whose QA subtask is actually `QA-REJECTED` would pass CI. The
  mitigation is that the claim is recorded in the annotation and the step summary, making a false
  claim auditable after the fact — not prevented. Closing this would require a Paperclip API
  token in Actions; not proposed here (secret-in-CI decision belongs to Governance).
- **Admins can bypass** the environment policy (`can_admins_bypass: true` on `github-pages`).
- **Tag-name dates are not validated** against the commit date, and `components:` contents are not
  cross-checked against the component manifest. Both are deliberate: the gate's job is to stop
  *unreviewed* publishing, not to lint bookkeeping.
- **Nothing publishes until the first tag is cut.** This is intended — the currently-live catalog
  is the half-remediated state doc 26 exists to fix. The live site keeps serving the last
  deployment; it just stops moving on every merge.

## 6. Reversal

The workflow change is a normal revert. The environment policy change is two API calls:

```bash
# restore branch-main deploys
gh api -X POST repos/:owner/:repo/environments/github-pages/deployment-branch-policies \
  -f name='main' -f type='branch'
# drop the tag policy (id from: gh api .../deployment-branch-policies)
gh api -X DELETE repos/:owner/:repo/environments/github-pages/deployment-branch-policies/61314663
```

## 7. Status of doc 26 §7 D-gates after this change

| D-gate | Owner | Status |
|---|---|---|
| D-gate 1 (role) | QALead | Stood up — doc 27 |
| D-gate 2 (process) | QALead + issue authors | Stood up — doc 27 §4 |
| D-gate 3 (CI: interaction smoke tests, per-theme visual snapshots, docs-completeness lint) | CTO | **Open** — tracked separately (doc 26 §7/§8, P1). Until it lands, the §2 checklist is verified by QALead by hand, and D-gate 4 gates only *when* a publish happens, not *what* is in it. |
| D-gate 4 (deploy: tag-gated Pages) | CTO | **Landed** — this document |
