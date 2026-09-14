# INO-31 — Plan revision 9 — Phase 2: the component implementation program

**Revision 9 (2026-09-14) replaces revision 8 wholesale.** *(Amended same day with §12, the issue map, once the 49 issues were actually created.)* Revision 8 was a 2026-09-08 status
snapshot. It predated the PrimeNG rebaseline (doc 16 rev 3, commit `e5df677`) and it contained no
implementation program at all — no per-component work, no theme×variant×state matrix, no mobile
scope, no task breakdown, and no reference to the ten child issues that already exist. Your comment
is correct on every count. This revision is the missing plan.

## 0. Your four points and where each lands

| # | Your point | Where it lands in this revision |
|---|---|---|
| 1 | The plan doesn't say how 101 components get implemented across three web themes with all variants, motion, accessibility, and three mobile styles | **§2** (Definition of Done — the per-component contract) and **§5** (mobile porting rule). §2 is the section that was entirely absent. |
| 2 | Why are the todos not created per component, so agents work in parallel and merge? | **§4** (per-component manifest) and **§12** (the 49 issues, now created) and **§6** (parallelism + merge model). Correction: 10 child issues exist (INO-113…INO-122) but they are *register-item*-shaped, not *component*-shaped, and two of them are superseded. §7 reconciles them. |
| 3 | The High / Medium / Low missing items aren't visible in the plan | **§7** — the full 31-item register, each row carrying a wave and an issue number. Previously it lived only in doc 16 §14, which is why you couldn't see it here. |
| 4 | Missing: importable to Claude Design | **§8** — with a concrete finding: the tooling exists and I tested it this run. It needs one interactive action from you that cannot be done from a heartbeat. |

Nothing in doc 16 revisions 1–3 is discarded. This revision is the execution layer on top of it.

---

## 1. What "101 components" actually costs — the arithmetic, stated honestly

The naive reading of your point 1 is 101 components × 3 web themes × 3 sizes × 8 states × 3 mobile
tracks. That is 21,816 cells and it is the wrong model. It is worth being precise about what is
*authored* versus what is *inherited*, because the difference is the entire feasibility argument:

| Dimension | Multiplier on authored work | Why |
|---|---|---|
| 3 web themes — dark (`:root`), light (`[data-theme="light"]`), high-contrast (`[data-theme="high-contrast"]`) | **×1** | INO-92 established the rule: components consume semantic roles and **never branch on `data-theme`**. A component that uses `var(--ino-color-surface-raised)` is correct in all three themes the moment it is written. `scripts/check-theme-parity.mjs` already enforces this across 57 roles × 3 themes × 2 mobile ports. **Themes are free, and staying free is a lint rule, not a discipline.** |
| 3 sizes (`sm` / `default` / `lg`) | **×1** *(after Wave 0)* | Free only once control-height / inline-padding / font-size tokens exist as a size scale. Today they don't, which is why 0 of 16 components have a size API. This is the single highest-leverage thing in Wave 0. |
| 2 density modes (dense / fluid) | **×1** | Already orthogonal to theme via the density attribute; components read density-scoped tokens. |
| 8 interaction states | **×≈1.4** | Real authored CSS per component, but mechanical and reviewable. |
| Variants | **×1.2–3** | Genuinely per-component. A `Tag` has 6 severities and no structure; a `Table` has selection, expansion, grouping, frozen columns, filters. This is where the real spread lives. |
| Motion | **×1.1** | Token-driven, plus a `prefers-reduced-motion` branch. |
| Accessibility | **×1.3** | Role/ARIA contract, keyboard map, focus order. Not free, not optional. |
| 3 mobile tracks | **×0.4 per track, on ~50% of components** | See §5. Most components do port; many port as a different component (web Tabs ≠ mobile bottom tab bar). |

The output of that model is **§9: ≈104 agent-days for Tier 1, not 21,816 cells.** The rest of this
document is the machinery that makes that number real.

---

## 2. The unit of work: per-component Definition of Done

**This is the section revision 8 was missing.** Every component child issue in §4 carries this
contract verbatim in its description. An issue is not `done` until all eleven rows pass.

| # | Requirement | How it is verified |
|---|---|---|
| 1 | **Zero hardcoded values.** Every colour, space, radius, duration, shadow, and font-size resolves through a semantic token. No `data-theme` branch anywhere in the component. | INO-118 adherence lint (Wave 0 exit criterion; until it lands, reviewer grep) |
| 2 | **Three web themes render correctly** — dark, light, high-contrast. High-contrast active text pairs ≥ 7:1, essential boundaries ≥ 3:1. | `node scripts/check-theme-parity.mjs` + preview page screenshot in all three |
| 3 | **Size API** — `size="sm" \| "default" \| "lg"` as a typed `@Input`, driven by the Wave 0 control-height scale. | typed input present; preview renders all three |
| 4 | **Density** — correct under both dense and fluid, including `--ino-row-min-height` where the component is row-based. | preview renders both |
| 5 | **Eight states** — default, hover, **active/pressed**, focus-visible, disabled, readonly, invalid, loading/busy. `:active` and the focus ring both come from Wave 0 tokens, never hand-rolled. | preview renders the full state grid |
| 6 | **Variants** — the per-component list named in the issue, derived from the PrimeNG route pinned in `specs/primeng/llms-22.1.1.txt`. Deliberate omissions are written down in the component spec, not silently dropped. | spec file lists every variant with build / decline |
| 7 | **Motion** — enter/exit use named duration + easing tokens; a `prefers-reduced-motion: reduce` branch exists and is tested. | preview + reduced-motion screenshot |
| 8 | **Accessibility** — documented role/ARIA contract; full keyboard map; visible focus; WCAG 2.2 AA text **and** non-text contrast (1.4.11); 24px minimum target (2.5.8), 44px comfortable; RTL-safe (logical properties, no `left`/`right`). | axe/pa11y clean once INO-118's gate lands; until then, the issue's keyboard-map checklist |
| 9 | **Mobile parity** — the tracks named in the issue (§5) ship the same semantic roles; or the issue records an explicit "web-only" decision with a reason. | `check-theme-parity.mjs`, extended to component level |
| 10 | **Docs artifact** — `docs/brand/06-angular-components/<name>.md` (API + variants + a11y contract) **and** a standalone preview HTML whose first line is `<!-- @dsCard group="…" -->`. | file exists; §8 depends on this marker |
| 11 | **Merge hygiene** — touches only its own directory plus the append-only registry line (§6). No edits to `tokens.css` after Wave 0. | diff review |

Two notes on this contract:

- **Row 10 is not documentation busywork.** The `@dsCard` preview file is the exact artifact Claude
  Design ingests (§8) and the exact artifact the hosted docs site (INO-116/H-6) renders. Writing it
  per component costs minutes; retrofitting 101 of them later is its own project.
- **Row 1 + row 2 are why themes are free.** If a single agent hardcodes one hex value, the ×1
  multiplier on themes becomes ×3 for that component forever. This is the discipline the whole
  estimate rests on, which is why INO-118 (the lint) is promoted into Wave 0 rather than left in
  backlog.

---

## 3. Wave 0 — the token foundation, and why it must land first

Every item here is a **cross-cutting contract change**. Adding a size API or a focus-ring token
after 40 more components exist costs 40× what it costs at 16. Wave 0 is therefore a hard gate: no
component issue in §4 starts before its listed Wave 0 dependency merges.

| Issue | Scope | Register | Est. |
|---|---|---|---|
| **W0-1** | Focus-ring token (`--ino-focus-ring`, `--ino-focus-ring-offset`) + `--ino-color-accent-active` + `:active` state applied to all 16 existing components across 3 themes | N-2, N-3 | 1.5 d |
| **W0-2** | Control-size scale — height / inline-padding / font-size / icon-size tokens for `sm` / `default` / `lg` × dense/fluid. Unblocks the size API on ~35 components | N-1 | 1.5 d |
| **W0-3** | Form-label token set — `label-lg` / `label` / `label-sm` / `hint` / `caption`, replacing the single mono uppercase token currently misused as a form label | N-4 | 1 d |
| **INO-113** *(exists, backlog → Wave 0)* | Data-visualization palette — categorical series, sequential + diverging ramps, colourblind-safe validation, all 3 themes | H-1 | 2 d |
| **INO-119** *(exists, backlog → Wave 0)* | Devanagari / Indic typography — Noto Sans Devanagari pairing with matched vertical rhythm so a Hindi string does not break the line-height contract | H-3 | 2 d |
| **W0-4** | Elevation scale (6 steps + 3 brand + 2 inset) + composite type aliases + `--leading-*` / `--tracking-*` | N-5, N-6 | 1 d |
| **W0-5** | Motion contract completion + `prefers-reduced-motion` across all 16 existing components (5 of 16 today) | N-7 | 1.5 d |
| **W0-6** | `info` severity tier — `InoAlertStatus` gains `info` on both Toast and Message; semantic status roles completed in all 3 themes | N-8 | 0.5 d |
| **INO-118** *(exists, backlog → Wave 0 exit)* | Design-system adherence lint + axe/pa11y a11y gate in CI | H-5 | 3 d |

**Wave 0 total ≈ 14 agent-days.** Six of the nine can run concurrently (they touch disjoint token
sections); INO-118 lands last and closes the wave. Realistic wall clock with 3 agents: **4–5 working
days.**

INO-113 and INO-119 already exist in `backlog` — they are promoted, not recreated.

---

## 4. Wave 1 and Wave 2 — the per-component manifest

**This is your point 2.** One component = one issue = one directory = one branch. 42 new issues.

### Wave 1 — uplift the 12 components we already have (9 issues, ≈7 d)

These close the ⚠️ rows in doc 16 §3.2. They start the moment their Wave 0 dependency merges and
they are the cheapest way to get the whole existing surface onto the §2 contract.

| Issue | Component | Adds | Depends on |
|---|---|---|---|
| U-1 | `ino-button` | `danger` variant, size API, `:active`, loading state | W0-1, W0-2 |
| U-2 | `ino-input` | size API, filled variant, invalid/readonly states, IconField + InputGroup integration | W0-2, T-16, T-17 |
| U-3 | `ino-checkbox` | indeterminate, checkbox group, size API | W0-2 |
| U-4 | `ino-radio-group` | standalone radio, size API | W0-2 |
| U-5 | `ino-toggle` | icon overlay, error state, size API | W0-2 |
| U-6 | `ino-card` | header / footer / media slots | — |
| U-7 | `ino-modal` | size API, maximize, drag, adopt FocusTrap | W0-2, T-11 |
| U-8 | `ino-alert` + `ino-toast-container` | `info` severity, position input, sticky/persistent mode | W0-6 |
| U-9 | `ino-nav` | `role="menubar"`, submenus, mobile hamburger (resolves P-2) | — |

### Wave 2 — Tier 1, the 27 components the KYB MVP cannot ship without (≈39 d web)

Ordered by dependency, not by value. `M` column = mobile tracks (§5): **3** = all three, **1** = Capacitor only, **–** = web-only.

| Issue | Component | Group | M | Depends on | Est. |
|---|---|---|---|---|---|
| T-1 | **Table** | Data | – | W0-2, T-2, T-3 | 5 d |
| T-2 | Paginator | Data | – | W0-2 | 1.5 d |
| T-3 | VirtualScroller | Data | – | — | 2 d |
| T-4 | Timeline | Data | 3 | — | 1.5 d |
| T-5 | **FileUpload** | File | 3 | W0-1 | 3 d |
| T-6 | **InputOtp** | Form | 3 | W0-2, W0-3 | 1 d |
| T-7 | Textarea | Form | 3 | W0-2, W0-3 | 0.5 d |
| T-8 | **DatePicker** | Form | 3 | W0-2, T-19 | 4 d |
| T-9 | **Select rewrite** (custom listbox) | Form | 3 | W0-2, T-11 | 4 d |
| T-10 | MultiSelect | Form | 3 | T-9 | 2 d |
| T-11 | FocusTrap | Misc | – | — | 1 d |
| T-12 | Tag | Misc | 3 | W0-6, INO-113 | 0.5 d |
| T-13 | MeterGroup | Misc | 3 | INO-113 | 1 d |
| T-14 | Skeleton | Misc | 3 | — | 0.5 d |
| T-15 | ProgressBar | Misc | 3 | — | 0.5 d |
| T-16 | IconField | Form | 1 | W0-2 | 0.5 d |
| T-17 | InputGroup | Form | 1 | W0-2 | 0.5 d |
| T-18 | FloatLabel | Form | 3 | W0-3 | 0.5 d |
| T-19 | Label | Form | 3 | W0-3 | 0.5 d |
| T-20 | IftaLabel | Form | 3 | W0-3, T-19 | 0.5 d |
| T-21 | ProgressSpinner | Misc | 3 | — | 0.5 d |
| T-22 | Tooltip | Overlay | – | T-25 | 1 d |
| T-23 | Popover | Overlay | – | T-25, T-11 | 1.5 d |
| T-24 | Drawer | Overlay | 3 | T-11 | 1.5 d |
| T-25 | ConfirmDialog (web) | Overlay | – | T-11 | 1 d |
| T-26 | Tabs | Panel | 3 | — | 1.5 d |
| T-27 | Stepper | Panel | 3 | — | 1.5 d |

**Tier 1 web ≈ 39 agent-days. Mobile ports ≈ 24 agent-days** (§5). Critical path runs
W0-2 → T-9 → T-10 and W0-2 → T-3 → T-1: roughly 11 days of unavoidable serial depth.

### Tier 2 and Tier 3

**Tier 2 (~35 components) is specified, not built** in this phase — each gets a stub spec file and
a row in the docs site so the contract is known before the code exists (≈8 d total). **Tier 3 (~40
components — Knob, Rating, ColorPicker, Editor, OrgChart, Terminal, Dock, the gallery family,
Ripple, DragDrop, …) is formally declined in writing.** Declining in writing is worth as much as
building Tier 1: it stops every future parity review from re-litigating Terminal. If you want Tier 2
built rather than specified, say so — that adds ≈45 agent-days and is the single biggest lever on
the §9 number.

---

## 5. Mobile — the three tracks, and the porting rule

Three tracks exist and all three are already under token parity: `mobile/capacitor` (shares web
CSS + ThemeService), `mobile/react-native` (`src/theme/tokens.ts`), `mobile/flutter`
(`lib/theme/tokens.dart`). `check-theme-parity.mjs` enforces 57 colour roles × 3 themes × 2 native
ports today — at **token** level only. Extending it to **component** level is P-7, and it is a
Wave 3 issue (S-9).

The porting rule, so no agent has to guess:

| Rule | Consequence |
|---|---|
| Capacitor is not a port | It renders the same Angular component and the same CSS. A web component is Capacitor-done when it passes §2 rows 1–8, plus a 44px-target check. |
| React Native and Flutter are real ports | Re-authored against the same semantic role names. Cost ≈40% of the web component. |
| Desktop-idiom components do not port | Table, Paginator, VirtualScroller, Tooltip, Popover, ConfirmDialog(web), IconField, InputGroup are web-only or Capacitor-only. Their mobile counterpart is a *different* component — a card list, an action sheet, a long-press menu — and gets its own issue in a later wave rather than being forced into a shared abstraction. |
| Divergence is written down | Any track that cannot honour a role records it in the component spec. Silent divergence is what `check-theme-parity.mjs` exists to catch. |

Of the 27 Tier 1 components, 17 port to all three tracks, 2 are Capacitor-only, 8 are web-only.
17 × 0.4 × 3 tracks × 1.4 d average ≈ **24 agent-days**, delivered per-track so an RN agent and a
Flutter agent never touch the same file.

---

## 6. Parallelism and the merge model

Your point 2 is explicitly about merging quickly. The constraint on parallelism is not agent
availability, it is **shared-file conflict surface**. Four files would otherwise be touched by
every single issue:

| Shared file | Rule |
|---|---|
| `web/src/tokens.css` | **Frozen after Wave 0.** A component issue that believes it needs a new token stops and files a Wave 0 amendment instead. This is the single most important merge rule. |
| Component barrel / index | **No barrel.** Standalone Angular components imported by path. Removes the classic every-PR-conflicts file. |
| `scripts/check-theme-parity.mjs` | Append-only component registry array, one line per component, alphabetically inserted. Conflicts are trivial and mechanical. |
| `docs/brand/00-INDEX.md` | Append-only, one line per component, added at merge time by the integrating agent rather than by each component agent. |

With those four rules, a component issue touches **only** `web/src/app/components/<name>/**`,
`docs/brand/06-angular-components/<name>.md`, its preview HTML, and one registry line. That makes
the issues genuinely independent.

**Concurrency ceiling: 8 agents.** Above that, review-and-merge throughput (mine) becomes the
bottleneck, not authoring. Each PR must be green on `check-theme-parity.mjs`, `ng build`, the
adherence lint, and the a11y gate before merge — the last two being exactly why INO-118 is in
Wave 0 and not in backlog.

**Merge order:** Wave 0 (3 agents, serial-ish) → Wave 1 + Wave 2 leaves (8 agents) → dependency
roots (T-1, T-9, T-10) → mobile ports (3 agents, one per track) → Wave 3.

---

## 7. The missing-items register, with a wave and an issue for every row

Your point 3: this is the register from doc 16 §14, reproduced here so the plan is self-contained.
31 items. **Issue** column shows where it is tracked — existing issues are named, new ones carry
their §3/§4 handle.

### High — blocks or degrades near-term work

| # | Item | Issue | Wave | Gate |
|---|---|---|---|---|
| H-1 | Data-visualization palette (categorical / sequential / diverging, colourblind-safe, 3 themes) | **INO-113** | 0 | — |
| H-2 | Table / dense data component | **T-1** (+T-2, T-3) | 2 | W0-2 |
| H-3 | Devanagari + Indic typography | **INO-119** | 0 | — |
| H-4 | Report / PDF export theme — header/footer, type spec, print profile, INO-14 disclaimer lockup | **INO-120** | 3 | print colour half on INO-82 |
| H-5 | Design-system adherence lint | **INO-118** | 0 (exit) | — |
| H-6 | Hosted component documentation site | **INO-116** | 3 | — |
| N-1 | Per-component `sm`/`default`/`lg` size API | **W0-2** + every component issue | 0→2 | — |
| N-2 | Focus-ring token | **W0-1** | 0 | — |
| N-3 | `:active` / pressed state (0 of 16 today) | **W0-1** | 0 | — |
| N-4 | Form-label token set | **W0-3** | 0 | — |
| N-10 | Tier 1/2/3 scope decision | **§4** — decided by default as *build T1, spec T2, decline T3* | — | **you, reversible** |

### Medium — needed before anything external-facing

| # | Item | Issue | Wave | Gate |
|---|---|---|---|---|
| M-6 | Email design system — transactional templates + HTML signature block | **INO-121** | 3 | — |
| M-7 | Brand guidelines PDF | **INO-122** | 3 | **INO-82** |
| M-8 | Print colour spec — CMYK + Pantone | **INO-122** | 3 | **INO-82** |
| M-9 | Social profile kit — banner, avatar crops, post templates | **INO-122** | 3 | partly INO-82 |
| M-10 | Motion specimen — a page you can actually watch | **INO-117** | 3 | folded into H-6 |
| M-11 | Imagery / illustration direction | **S-5** | 3 | — |
| M-12 | App store listing assets × 3 tracks | **S-6** | 3 | partly INO-82 |
| M-13 | PrimeNG AI tooling adoption + pinned `llms.txt` CI check | **S-7** | 3 | — |
| M-14 | Decompose `ino-metric-panel` into Tag + MeterGroup in a Card | **T-12 + T-13** | 2 | — |
| N-5 | Composite type aliases + leading/tracking scales | **W0-4** | 0 | — |
| N-6 | Elevation scale (2 steps today vs 11) | **W0-4** | 0 | — |
| N-7 | `prefers-reduced-motion` coverage (5 of 16) | **W0-5** | 0 | — |
| N-8 | `info` severity tier | **W0-6** | 0 | — |
| N-9 | Icon slots + `danger` button variant | **T-16, T-17, U-1** | 1–2 | — |
| N-11 | Escape-hatch / override contract (PrimeNG `pt` equivalent) | **§10** — recommend narrow CSS-custom-property surface | — | **you** |

### Low — real, but safely deferrable

| # | Item | Issue | Wave |
|---|---|---|---|
| L-13 | Trademark / domain / handle audit — India TM classes 9 & 42 | **INO-122** | 3 (INO-82-gated) |
| L-14 | Sound & haptics — mobile approval/rejection feedback | **S-8** | 4 |
| L-15 | Accessibility statement (public VPAT-style page) | **S-8** | 4 — depends on INO-118 for its claims to be truthful |
| L-16 | DS versioning & release — semver the token contract, publish `06-angular-components/` as a real package | **INO-115** | 3 |
| L-17 | Figma library (connector verified live) | **S-4** | 3 |

**Two existing issues are superseded and will be cancelled** rather than left to cause duplicate
work: **INO-114** ("dense-data component set: table, badge, skeleton, empty state") is replaced by
T-1/T-2/T-3/T-12/T-14, and its per-component decomposition is strictly finer-grained. **INO-116**
("per-component contracts and usage docs for all 14 components") is absorbed as §2 row 10 — every
component issue now ships its own contract doc — and is re-scoped to the hosted docs site (H-6)
rather than cancelled.

---

## 8. Importable to Claude Design — tested this run, with a real finding

Your point 4. Doc 16 §5 established the direction: **we do not conform our tokens to Claude Design;
we make our design system importable by it.** This revision adds the mechanism, and one blocker I
found by actually trying it rather than describing it.

**What I did:** called the `DesignSync` tool's read-only `list_projects` method this run.

**What came back:**

> `DesignSync needs design-system authorization, but /design-login requires an interactive terminal
> and is not available in this environment.`

So the integration is real and the tooling is present — it is not available from an unattended
heartbeat. **Unblock action, yours, ~2 minutes:** run `/design-login` once in an interactive Claude
Code session (or use Claude Design's "Send to Claude Code Web"). After that the round-trip works
from here.

**What we ship into it**, and why §2 row 10 is written the way it is:

| Layer | Artifact | Where it comes from |
|---|---|---|
| Card index | Each preview HTML's **first line** `<!-- @dsCard group="…" -->` marker, compiled into `_ds_manifest.json` | §2 row 10 — produced per component, at authoring time |
| Component previews | One standalone HTML per component, all 3 themes | §2 row 10 |
| Foundations | Colour, type, spacing, motion, and the new data-viz palette as their own cards | Wave 0 + INO-117 |
| Token contract | `tokens.css` + `angular-theme-contract.md` | exists today |

The practical consequence: **the Claude Design bundle is a by-product of the docs site, not a
separate build.** The same preview files feed H-6 (INO-116), the motion specimen (INO-117), and
the Claude Design import. That is why H-6 is High priority rather than documentation polish — three
deliverables collapse into one artifact set. Zero additional Phase 2 cost beyond `/design-login`.

Sync discipline, once authorized: incremental, one component at a time, never a wholesale replace —
`list_files` → structural diff → `finalize_plan` → `write_files`.

---

## 9. Estimate, critical path, and what could move it

Unit: **1 agent-day = one focused agent session including review and merge.** Not wall-clock
human-days.

| Wave | Scope | Agent-days | Concurrency | Wall clock |
|---|---|---|---|---|
| 0 | Token foundation (9 issues) | 14 | 3 | 4–5 d |
| 1 | Uplift 12 existing components (9 issues) | 7 | 6 | 2 d |
| 2 | Tier 1 web (27 issues) | 39 | 8 | 8–9 d |
| 2M | Tier 1 mobile ports (3 tracks) | 24 | 3 | 8 d, overlaps Wave 2 |
| 2S | Tier 2 specs (~35 stubs) | 8 | 2 | 4 d, overlaps |
| 3 | Docs site, lint gate, PDF theme, email, Figma, imagery, packaging (11 issues) | 22 | 4 | 6 d |
| **Total** | | **≈114** | | **≈4–5 calendar weeks** |

**Critical path (≈24 days of unavoidable serial depth):** W0-2 (size tokens) → T-9 (Select rewrite)
→ T-10 (MultiSelect); and W0-2 → T-3 (VirtualScroller) → T-1 (Table) → INO-120 (report theme, which
*is* a table). Everything else has slack.

Three things move this number, in descending order of impact:

1. **Building Tier 2 instead of specifying it: +45 agent-days** (≈+2 weeks). Your call, §10.
2. **INO-82 resolution.** Five register rows are logo-gated. They are all in Wave 3, so the logo is
   not on the critical path — but if INO-82 stays open past week 3, INO-122 slips out of this phase.
3. **Concurrency below 8 agents.** Wave 2 is the wide part; at 4 agents its wall clock doubles.

Confidence: the Wave 0 and Wave 1 numbers are solid — that code exists and I have read it. Tier 1
has a ±30% spread concentrated in four components (Table, DatePicker, Select rewrite, FileUpload),
which together are 40% of the Wave 2 estimate.

---

## 10. Open decisions

None of these block Wave 0 — I am proceeding on the stated default so the foundation work starts
now. Each is cheap to reverse *before* Wave 2 and expensive after.

| # | Decision | My default | Cost to reverse later |
|---|---|---|---|
| **N-10** | Scope: Tier 1 only / Tier 1+2 / all 101 | **Build Tier 1 (27), spec Tier 2 (~35), decline Tier 3 (~40) in writing** | +45 agent-days if you want Tier 2 built; near-zero to decide during Wave 2 |
| **N-11** | Override contract — PrimeNG's `pt` equivalent | **Narrow, documented CSS-custom-property surface per component.** A closed system is only enforceable once INO-118 exists, and it doesn't yet | High — it is a public API shape baked into 27 components |
| **Premise** | PrimeNG is a **parity benchmark, not a runtime dependency** | Benchmark. This is my assumption and you have not confirmed it | **Very high.** If you intend to actually depend on PrimeNG, Waves 1–2 invert from "build 27 components" to "theme a dependency" — roughly 39 agent-days becomes 12. Correcting this after Wave 2 starts wastes most of it |

The third row is the one I would most like you to answer, and it is the only one where being wrong
is expensive rather than merely inconvenient.

---

## 11. Guardrails

The original HITL gate closed when the Vetra foundation was accepted (interaction `7e2a64f6`), so
tokens, CSS, and Angular components are post-approval execution. **The logo remains the one asset
still gated on explicit sign-off, via INO-82** — and per §9 it is off the critical path. No work in
Waves 0–2 depends on it. Everything lands in the repo and on `origin` as it is built; nothing is
held locally.

---

## 12. Issue map — the 49 issues created 2026-09-14

**Your point 2, executed.** Every handle used above now has a real board issue, created under INO-31
with dependency edges set as `blockedByIssueIds`. Issues with no unmet dependency are `todo` (ready
to claim now); the rest are `backlog` and will surface as their blockers merge.

### Wave 0 — token foundation (9 issues, all `todo`, all claimable now)

| Handle | Issue | Title |
|---|---|---|
| W0-1 | **INO-123** | Focus-ring token, accent-active, `:active` across 16 components |
| W0-2 | **INO-124** | Control-size token scale (sm / default / lg) x dense/fluid |
| W0-3 | **INO-125** | Form-label token set |
| W0-4 | **INO-126** | Elevation scale + composite type aliases + leading/tracking |
| W0-5 | **INO-127** | Motion contract + prefers-reduced-motion across 16 components |
| W0-6 | **INO-128** | `info` severity tier + status role completion |
| H-1 | **INO-113** | Data-visualization palette *(promoted from backlog)* |
| H-3 | **INO-119** | Devanagari / Indic typography *(promoted from backlog)* |
| H-5 | **INO-118** | Adherence lint + axe/pa11y gate *(promoted; Wave 0 exit criterion)* |

### Wave 1 — uplift the 12 existing components (9 issues)

| Handle | Issue | Component |
|---|---|---|
| U-1 | **INO-156** | `ino-button` — danger, size, `:active`, loading |
| U-2 | **INO-157** | `ino-input` — size, filled, invalid/readonly, icon slots |
| U-3 | **INO-158** | `ino-checkbox` — indeterminate, group, size |
| U-4 | **INO-159** | `ino-radio-group` — standalone radio, size |
| U-5 | **INO-160** | `ino-toggle` — icon overlay, error, size |
| U-6 | **INO-161** | `ino-card` — header / footer / media slots |
| U-7 | **INO-162** | `ino-modal` — size, maximize, drag, FocusTrap |
| U-8 | **INO-163** | `ino-alert` + toast — position, sticky |
| U-9 | **INO-164** | `ino-nav` — menubar role, submenus, hamburger |

### Wave 2 — Tier 1 components (27 issues)

| Handle | Issue | Component | Handle | Issue | Component |
|---|---|---|---|---|---|
| T-1 | **INO-155** | Table | T-15 | **INO-132** | ProgressBar |
| T-2 | **INO-137** | Paginator | T-16 | **INO-138** | IconField |
| T-3 | **INO-129** | VirtualScroller | T-17 | **INO-139** | InputGroup |
| T-4 | **INO-134** | Timeline | T-18 | **INO-141** | FloatLabel |
| T-5 | **INO-145** | FileUpload | T-19 | **INO-140** | Label |
| T-6 | **INO-146** | InputOtp | T-20 | **INO-142** | IftaLabel |
| T-7 | **INO-147** | Textarea | T-21 | **INO-133** | ProgressSpinner |
| T-8 | **INO-154** | DatePicker | T-22 | **INO-149** | Tooltip |
| T-9 | **INO-152** | Select rewrite | T-23 | **INO-150** | Popover |
| T-10 | **INO-153** | MultiSelect | T-24 | **INO-151** | Drawer |
| T-11 | **INO-130** | FocusTrap | T-25 | **INO-148** | ConfirmDialog (web) |
| T-12 | **INO-143** | Tag | T-26 | **INO-135** | Tabs |
| T-13 | **INO-144** | MeterGroup | T-27 | **INO-136** | Stepper |
| T-14 | **INO-131** | Skeleton | | | |

### Wave 3 — system, docs, and collateral

| Handle | Issue | Scope |
|---|---|---|
| S-3 | **INO-165** | Claude Design importable bundle + DesignSync round-trip *(needs `/design-login`)* |
| S-4 | **INO-166** | Figma library |
| S-5 | **INO-167** | Imagery / illustration direction |
| S-6 | **INO-168** | App store listing assets x 3 tracks |
| S-7 | **INO-169** | PrimeNG AI tooling + pinned `llms.txt` drift check |
| S-8 | **INO-170** | Sound/haptics + public accessibility statement |
| S-9 | **INO-171** | Component-level theme-parity check (resolves P-7) |
| H-6 | **INO-116** | Hosted component docs site *(re-scoped, promoted to high)* |
| M-10 | **INO-117** | Foundation + motion specimen cards |
| H-4 | **INO-120** | KYB report PDF/print theme |
| M-6 | **INO-121** | Email design system + signature block |
| L-16 | **INO-115** | Design-system packaging + versioning |
| M-7/8/9, L-13 | **INO-122** | Logo-gated brand bundle — **blocked on INO-82** |

### Reconciled

- **INO-114** (dense-data component set) — **cancelled, superseded.** Replaced by INO-155 + INO-137 +
  INO-129 + INO-143 + INO-131. The replacement set is finer-grained and parallelisable; it also adds
  the two Table prerequisites (Paginator, VirtualScroller) that INO-114 did not account for.
- **INO-116** — **re-scoped.** Per-component docs moved into the Definition of Done (§2 row 10);
  what remains is the hosted docs site, promoted to high because INO-117 and INO-165 both consume
  its output.

Every component issue carries the full §2 Definition of Done in its description, so an agent can
claim one and work without reading this plan or any other document.

---

*Revision 9 prepared 2026-09-14. Supersedes revision 8 in full. Builds on doc 16 revision 3
(`docs/brand/16-design-system-parity-vs-echeque-reference.md`, commit `e5df677`) and the PrimeNG
22.1.1 surface pinned at `specs/primeng/llms-22.1.1.txt`. Theme model per INO-92
(`scripts/check-theme-parity.mjs`).*
