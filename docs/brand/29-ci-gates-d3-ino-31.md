# 29 — CI gates for the Component Publish Contract (INO-31 D-gate 3, INO-375)

> **What this answers.** Doc 26 §7 D-gate 3: *"Add to the existing gate set: (a) interaction
> smoke tests (Playwright against the portal: overlay opens anchored to trigger — a direct D1
> regression test; focus trap; keyboard maps for the APG patterns); (b) per-component ×
> per-theme visual snapshots on the docs pages, diffed in CI; (c) docs-completeness lint — a
> manifest component without the §2 sections fails the build."*
>
> Sibling docs: 26 (the plan; §2 is the Publish Contract these gates enforce), 27 (QA's
> operating process — D-gates 1/2), 28 (the Pages deploy gate — D-gate 4).

---

## 0. The gap these three close

Before this, five checks ran on every PR (`design-system.yml`) plus three compile jobs. Every
one of them passes on a component whose docs page is **visibly broken**:

| The question that was already asked | What it still misses |
|---|---|
| do web/RN/Flutter agree about what the tokens ARE? (`check-theme-parity`) | a component that reads a *surface* token for its *text* colour — the tokens agree; the text is invisible |
| does the source USE tokens? (`check-ds-adherence`) | which token. Adherence is satisfied by any token, including the wrong one |
| do SPEC.md citations resolve? (`check-spec-citations`) | whether the thing cited is documented on the docs page a visitor reads |
| do the emails match tokens.css? (`check-email-tokens`) | nothing about components |
| does it compile? (`compile-*`) | a page that compiles and renders an empty box |

That is the exact list of failures the board rejected on 2026-09-28 — a mispositioned calendar
popup, an unformatted accessibility dump, missing variants — and **every one of them was green
in CI at the time.** Doc 26 §1 traced the causes; these gates are what stops them recurring.

The D1 positioning bug is the clearest case. `ino-datepicker.spec.ts` passed 3/3 throughout,
because jsdom computes no layout at all, so "is the popup under its trigger" was a question no
gate in the repo could ask. `ino-focus-trap.spec.ts` states the same limitation about focus in
its own header: *"jsdom implements no native tab order, so a synthetic `Tab` event moves
nothing."* A real browser is not a nice-to-have for this class of defect; it is the only
instrument that measures it.

---

## 1. What landed

| Gate | Where it runs | Implementation | Blocking |
|---|---|---|---|
| 3(a) interaction smoke | `docs-portal-e2e.yml` → `interaction-smoke` | `web/e2e/*.smoke.spec.ts` | yes |
| 3(b) visual snapshots | `docs-portal-e2e.yml` → `visual-snapshots` | `web/e2e/docs-pages.visual.spec.ts` | yes, **once baselines are committed** (§4) |
| 3(c) docs-completeness lint | `design-system.yml` → `check` | `scripts/check-docs-completeness.mjs` | yes |

3(c) deliberately joined the *existing cheap job* rather than the browser workflow. That job's
header asks that its no-install, ~15s property be preserved, so the lint is dependency-free ESM
over `node:` builtins like its five siblings. A design-system lint that needs three toolchains
installed is a design-system lint that gets switched off.

Run them locally:

```bash
npm run check:docs-completeness    # 3(c) — instant, no install
npm run e2e:build                  # production build (both browser gates need it)
npm run e2e:smoke                  # 3(a)
npm run e2e:visual                 # 3(b) — but see §4 before trusting a local result
```

---

## 2. Gate 3(a) — interaction smoke

Three files, 16 tests, ~10s wall clock after the build. Chromium only: cross-browser coverage
is a separate decision with its own cost, and "does our overlay anchor to its trigger" is not a
browser-specific question.

**`overlay-anchoring.smoke.spec.ts` — the direct D1 regression test.** Opens the datepicker in
each of the four `<app-demo-constrained-container>` ancestor shapes C2 built (INO-368) and
asserts the *geometry*: panel left edge within 3px of the field's left edge, panel top 0–20px
below the field's bottom edge. The assertion is geometric and not "the panel is visible"
because **the broken version was perfectly visible** — just 200px from the control it belonged
to.

The four cases are not redundant. `positioned` is the literal bug shape (a `position: relative`
ancestor on the host page). `narrow` asserts anchoring only and deliberately *not* "stays in
the viewport": with `appendTo="self"` the position is pure CSS with no flip/clamp logic, so a
panel wider than its container legitimately overhangs. `scroll` + `appendTo="self"` asserts the
overlay stays in the ancestor's DOM subtree — the constraint that justifies the body portal
existing. `scroll` + `appendTo="body"` asserts the same geometry enforced by a *different
mechanism* (JS-computed `position: fixed`), plus that it reparents to `document.body` and is
not clipped.

**`focus-trap.smoke.spec.ts`** — 12 forward Tabs and 12 Shift+Tabs inside `<ino-modal>` and
inside the datepicker's `role="dialog"` panel, walking well past the focusable count so the
*wrap* is proven rather than the first few presses. Plus the datepicker's `initialFocus`
selector landing on the tabbable gridcell.

**`keyboard-apg.smoke.spec.ts`** — the APG "Date Picker Dialog" and "Radio Group" maps. Every
assertion is **relative** ("ArrowRight then ArrowLeft returns to the same cell", "Home lands on
column 0 of its row"), never absolute ("focus is on the 17th"): a test that pins today's date
fails on the 1st of a month for a reason that has nothing to do with the component, and a gate
that fails for the wrong reason gets switched off. The relative form still catches a handler
that moves by the wrong unit, in the wrong direction, or is not wired at all.

The radio-group tests are pointed at what is *ours*: `<ino-radio>` wraps a native
`<input type="radio">`, so Chromium supplies the roving tabindex — what needs testing is that
our `(click)`/`(change)` interception does not break it, and that the `readonly` guard holds on
the keyboard path (arrow navigation on a radio fires a click in Chromium, so a guard written
only for the pointer path can be right or wrong by accident).

### 2.1 Evidence, and the two defects the gate found

Verified **red as well as green** before landing, to the standard INO-262 set for the compile
gate — "I ran it and it was fine" is the class of claim these gates exist to retire.

*Green:* 16/16 against a production build of `9e0f3ab`.

*Red:* with the INO-364 fix reverted in a throwaway checkout (dropping `position: relative`
from the trigger's own wrapper — literally what `c02149c` added), **3 of the 4 anchoring tests
fail**, each naming INO-364 and reporting the measured error (20.0px, 16.0px, 16.0px). The
body-portal case correctly stays green under that revert, because it positions from JS rather
than CSS. That is the honest result, not a gap in coverage.

**On its first run the gate found two real defects**, both filed rather than fixed here — a
component fix belongs on its own issue with a QA subtask (doc 26 §7 D-gate 1/2), not inside a
CI-plumbing PR:

- **INO-390** — datepicker grid keyboard navigation is dead in the production build.
  `onGridKeydown` re-focuses via `queueMicrotask(() => focusGrid())`, and `focusGrid()` locates
  its target by querying `[tabindex="0"]` — a *rendered consequence* of `focusedDate`. The app
  is zoneless, so change detection is scheduled on the render loop, not in a microtask: the
  query runs first and re-focuses the old cell. After a month page the old cell is destroyed
  outright, focus falls to `<body>`, and every subsequent grid key is a no-op. The documented
  APG keyboard map in `datepicker.md` does not work for a keyboard-only user.
- **INO-392** — `ino-focus-trap` never restores focus to the trigger on close, on both the
  modal and the datepicker. The `host.contains(activeElement())` guard is read *after* teardown
  has already moved focus to `<body>`, so it skips the restore in the common case. The
  containment half of the contract is fine and lands armed. Note that the `/docs/design-system`
  page copy promises the opposite of the shipped behaviour.

Both are recorded **in executable form** with `test.fail()` and the located cause in the
annotation. That is not a soft exemption: Playwright reports an unexpectedly-*passing*
`test.fail()` test as a **failure**, so the moment either defect is fixed CI tells the fixer to
delete the annotation. A quarantine that cannot rot.

One flake was deliberately **left out**: Escape pressed on the datepicker panel *after* a full
tab cycle closed the panel on one run and not the next. Escape from the initial gridcell closes
reliably and is asserted. A flaky assertion in a blocking gate is how gates get switched off;
the observation is recorded on INO-392 instead.

---

## 3. Gate 3(b) — per-component × per-theme visual snapshots

43 manifest components × 3 themes + 5 portal shell pages × 3 = **144 full-page snapshots**.

The slug list is read from `docs/brand/design-system.manifest.json` at run time, never
transcribed, so a new component is photographed the moment it is registered — there is no
second list to forget to update.

Themes are pinned **before first paint** via `localStorage['ino-theme']` + the `data-theme`
attribute, using the same blocking script in `index.html` that a returning visitor hits. Not by
clicking the on-page theme switcher: that fires after hydration, so a screenshot can catch the
switch mid-transition. Verified that all three produce genuinely different images (distinct
sizes and hashes for the same page).

Flake suppression, because a flaky pixel gate is worse than none — the first three false reds
are what get it disabled: `animations: 'disabled'` + an injected stylesheet zeroing
animation/transition durations and delays (a `animation-delay`ed skeleton shimmer can still be
mid-flight at capture), `caret: 'hide'` plus `caret-color: transparent`, `scroll-behavior: auto`,
and `await document.fonts.ready` (a shot taken before fonts settle photographs the fallback
face and diffs against everything). Tolerance is `maxDiffPixelRatio: 0.002` — sub-pixel glyph
antialiasing is the only thing that legitimately lands in that band; a real regression on a
docs page moves far more than 0.2% of it. Verified stable: a second run against freshly
generated baselines diffed clean.

### A legitimate visual change is *supposed* to fail this gate

A token edit, a demo rewrite, INO-373's page-anatomy migration — all of these will turn it red.
That is the gate working. The diff lands in the PR as an artifact with an
expected/actual/diff triptych per failure, a human looks at it, and the baselines are refreshed
**in the same PR that changed the look**. It is a review prompt, not a prohibition.

---

## 4. Baselines — read this before touching them

**Pixel baselines are valid for exactly one rendering stack.** Font rasterisation, fontconfig,
scrollbar width and form-control metrics all differ between macOS, the `ubuntu-latest` runner
image and the Playwright container. A baseline taken on a laptop can never be diffed in CI.

So the visual job runs in the pinned container `mcr.microsoft.com/playwright:v1.63.0-noble`,
and `snapshotPathTemplate` carries **no `{platform}`/`{arch}` segment on purpose** — one
committed baseline set, owned by that container, so nobody can accidentally commit a second,
un-diffable set from their own machine.

### 4.1 Current status: NOT YET ARMED

`web/e2e/__screenshots__/` is **empty as of this commit.** The baselines could not be produced
here: they must come out of that container, and there is no Docker in the authoring
environment. Until they are committed the `visual-snapshots` job runs in **seed mode** — it
generates the 144 images, uploads them as the `visual-baselines` artifact, and says so loudly
in a `::warning::` and in the step summary (*"this run generated N baselines and compared
nothing"*). It proves nothing about the current diff and does not pretend to.

**Seeding is tracked by its own issue.** Do not mark D-gate 3(b) complete until the baselines
are in the tree; a green seed-mode run is not evidence.

### 4.2 Seeding or refreshing

```bash
gh workflow run docs-portal-e2e.yml --ref <branch> -f update_baselines=true
# wait, then:
gh run download <run-id> -n visual-baselines -D web/e2e/__screenshots__
git add web/e2e/__screenshots__ && git commit
```

Once any `.png` is present the job flips to diff mode automatically and is fully blocking.

### 4.3 Reproducing a diff locally

Same container, so the result is comparable:

```bash
npm run e2e:build
docker run --rm -it -v "$PWD":/w -w /w --network host \
  mcr.microsoft.com/playwright:v1.63.0-noble \
  bash -c "npm ci && npm run e2e:visual"
```

Running `npm run e2e:visual` on macOS will "work" and diff against everything. Use it only to
check that the spec executes, never to judge a diff or to write baselines.

### 4.4 Upgrading Playwright

`@playwright/test` in `package.json`, `container:` in the workflow, and
`env.PLAYWRIGHT_VERSION` must move together, and **the baselines must be reseeded** — a new
browser build re-rasterises text. A guard step fails the job if the installed runner version
and the container tag disagree, rather than letting it publish diffs nobody can regenerate.

---

## 5. Gate 3(c) — docs-completeness lint

`scripts/check-docs-completeness.mjs`, sixth check in `design-system.yml`'s `check` job.

It asks: **is this component's docs page actually publishable?** The page
(`docs-component-detail.component.html`) is assembled from four committed files, so what a
visitor will see is decidable without a browser:

| Check | §2 dim. | Source of truth |
|---|---|---|
| `demo` | 2.1 | slug resolves in `generated/component-registry.ts` **or** `custom-demos.ts` — neither ⇒ the page literally renders *"No live example available"* |
| `variants` | 2.1 | a component the manifest credits with ≥2 variants must document them |
| `states` | 2.2 | a States section (or per-state headings — several docs split them) |
| `sizing` | 2.3 | a component with a `size` `@Input` must document its scale or density |
| `labels` | 2.4 | a component with a `label` `@Input` must document label/required/help/error text |
| `a11y` | 2.5 | `component-docs-extract.json[slug].a11y` non-null — a missing `## Accessibility contract` heading renders as the *"No … section found"* placeholder |
| `notes` | 2.6 | ditto for `## Deliberate omissions` |

Deliberately **not** checked here, because it is not statically decidable and belongs to another
gate: §2.2's "in all 3 themes" (theme parity + gate 3b), §2.5's keyboard walkthrough (gate 3a),
§2.7 mobile ports, and §2.8 QA sign-off (QALead on the issue, per INO-295).

Heading conventions across the 38 component docs are **not** uniform — they were written over
~6 waves, so the same dimension appears as `## States`, `## 5 — Density`, `## Sizes`,
`### Size API`. Normalising them is INO-373's job. Until then the lint matches a documented
*family* of headings per dimension: permissive about heading **text**, strict about
**presence**. A false pass costs one missed section that QA still reviews by hand; a false fail
on a synonym costs every author a waiver and gets the gate switched off.

### 5.1 The waiver ratchet

35 pre-existing gaps are waived in `scripts/docs-completeness-waivers.json`, so the lint blocks
**new** incomplete pages today instead of waiting on a 43-component sweep. Keyed on
`(slug, check)`; every entry needs a `reason` and an `issue`; **an unused waiver fails the
build**, so the file cannot quietly become a parking lot.

| Waived | Count | Owner that deletes them |
|---|---|---|
| `sizing` (12), `states` (8), `notes` (10) | 30 | **INO-371** — A4 full-catalog audit establishes which §2 states/sizes/omissions actually apply, then writes them |
| `doc` (5) | 5 | **INO-374** — C5 docs pages for the 5 marketing-only components |

Nothing waives `demo` (§2.1) or `labels` (§2.4): all 43 components already resolve to a live
demo, and every component with a `label` `@Input` documents it. **Those two checks are fully
armed today.**

Verified four ways beyond the green run: removing a slug from both demo registries fails
(`demo`); nulling an extract's `a11y` fails; a waiver for a gap that no longer exists fails as
stale; a waiver naming an unknown check fails as malformed.

---

## 6. What D-gate 3 does *not* cover

Stated plainly so nobody reads a green tick as more than it is.

- **Only Chromium.** No Firefox/WebKit, and no mobile viewport in the visual set (the RN and
  Flutter tracks have their own gates).
- **No axe/contrast scan.** WCAG 2.2 AA contrast is gated by `check-theme-parity` at the token
  layer, which is not the same as auditing the rendered page. Worth adding; not in this scope.
- **Only 3 components have hand-authored demos** (radio-group, checkbox, datepicker). The other
  40 render the generic per-`@Input` grid, so their snapshots photograph a best-effort shell —
  an honest limitation of the generic renderer, and what INO-373's page-anatomy migration
  changes. Their snapshots will need reseeding when it lands.
- **Interaction coverage is three components deep**, not 43: datepicker (overlay, trap,
  keyboard), modal (trap), radio-group (keyboard). Those are the APG patterns with live demos to
  drive. Each new hand-authored demo should bring its own smoke test.
- **Gate 3(b) is not armed until §4.1 is done.**
- **A gate is not QA.** Doc 26 §2.8 still requires QALead's sign-off, authored by QALead
  (INO-295), before a component publishes. These three checks make that review cheaper; they do
  not replace it.
