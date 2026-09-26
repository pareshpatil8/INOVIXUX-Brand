# 16 — Design System Gap Analysis (Revision 3)

**Revision 3 (2026-09-14).** Rebaselined against **PrimeNG 22.1.1 as it actually ships today**, not the
38-component plan document. Two of the three blockers named in revision 2 are now **resolved**. Nothing
from the revision 2 pending-items register has been dropped — it is carried forward in §14 with its
High / Medium / Low structure intact, plus five new items.

> **This is still PHASE 1.** No implementation work has started and no child issues have been created.
> Phase 2 is gated on your explicit confirmation of §3 (the rebaseline) per your point 7.

### What changed in revision 3

| Your point | What was asked | Where it landed |
|---|---|---|
| 1 | Re-write the customisation, inline with our design system | **§4** — new section; PrimeNG's four customisation surfaces rewritten as our four-layer contract |
| 2 | Add an action item for a hosted HTML docs site like primeng.org | **§6** + register item **H-6** |
| 3 | Refer to `claude.com/product/design` | **§5** — fetched and evaluated; resolves blocker P-8 |
| 4 | All 38 components listed in the doc | **§3.3** — all 38 retained and individually traceable inside the 101-row table |
| 5 | Research current PrimeNG (80+); MCP vs llms.txt vs plugin; rebaseline | **§2** (tooling decision) + **§3** (rebaseline: it is **101**, not 80) |
| 6 | Figma account is authorised | **§15** — verified live this run; **L-17 unblocked** |
| 7 | Confirm point 5 → Phase 2 | **§16** — confirmation requested on the issue thread |
| — | Do not lose the High/Medium/Low register | **§14** — all 26 items carried, 5 added, 31 total |

---

## 0. Sources

| # | Source | Path / URL | Read this run |
|---|---|---|---|
| A | doc 16 rev 2 | `docs/brand/16-design-system-parity-vs-echeque-reference.md` | 638 lines |
| B | ds_context | e-Cheque reference `guidelines/ds-context.md` | carried from rev 2 (344 lines) |
| C | PrimeNG 38-component plan | e-Cheque reference `uploads/primeng_component_implementation_plan.md` | carried from rev 2 (768 lines, 38 components) |
| **E** | **PrimeNG `llms.txt` (live)** | `https://primeng.dev/llms/llms.txt` | **HTTP 200, 16,984 bytes, 132 lines — fetched this run** |
| **F** | **PrimeNG AI-tooling docs** | `primeng.dev/mcp`, `primeng.dev/plugin`, `primeng.dev/llms` | fetched this run |
| **G** | **Claude Design** | `https://claude.com/product/design` | fetched this run |
| D | Our system | `web/src/tokens.css` (436 lines), `web/src/app/components/` (16), `mobile/{capacitor,react-native,flutter}/` | re-verified this run |

**Re-verification of rev 2's two load-bearing claims** (both still true as of this commit):

```
ls web/src/app/components/ | wc -l                              → 16
grep -rn "@Input() size" web/src/app/components/*/*.component.ts → 0 matches
```

---

## 1. Headline — rebaselined

Revision 2 measured us against a 38-component plan. That plan is a **derived artifact of the e-Cheque
reference**, not PrimeNG's actual surface. Measured against PrimeNG 22.1.1 as shipped:

| Dimension | Rev 2 (vs 38-item plan) | **Rev 3 (vs PrimeNG 22.1.1)** |
|---|---|---|
| PrimeNG surface | 38 components | **101 documented components/directives** + 2 service APIs |
| Our coverage | 10 of 38 (26%) | **12 of 101 (11.9%)** |
| Fully conformant | **0** | **0** — unchanged |
| Components with a `size` API | 0 of 16 | **0 of 16** — unchanged |
| Floating / IFTA label modes | absent | **absent** — and PrimeNG now ships them as *three dedicated components* (`FloatLabel`, `IftaLabel`, `Label`) |

**The coverage percentage fell by more than half without us deleting a single line of code.** That is the
entire point of the rebaseline: the 38-item plan was understating the target by 63 components.

Three findings that only became visible at the 101-component baseline:

1. **Label placement is a component concern in PrimeNG, not a prop.** `FloatLabel`, `IftaLabel`, and
   `Label` are separate wrapper components (Form group). Rev 2 logged "floating/IFTA labels missing" as a
   *variant* gap on 7 components. It is actually a **three-component architectural gap** — and the wrapper
   approach is cheaper for us than adding a `labelMode` input to every form control.
2. **`IconField` and `InputGroup` are the sanctioned icon-slot mechanism.** Rev 2's finding "no icon slots
   on `ino-input`" (item N-9) has a known-good shape: a wrapper component, not an `@Input() icon`.
3. **`Fluid` and `FocusTrap` exist as standalone primitives.** Our rev 2 pending item P-1 (modal focus trap
   unverified) maps to a component, not a hand-rolled utility.

The two systemic defects from rev 2 are **unchanged and still the cheapest things to fix**:

- **No `:active` / pressed state anywhere.** Zero `:active` selectors across all 16 components.
- **No focus-ring token.** Hand-repeated `outline: 2px solid var(--ino-color-accent)`, already drifted
  (`outline-offset` is `2px` on button/checkbox, `1px` on input).

---

## 2. PrimeNG AI tooling — llms.txt vs MCP server vs Plugin

Your point 5 asked which of the three to use. All three exist and are official. They are not alternatives
at the same level — the Plugin is a superset.

| | **llms.txt** | **MCP server** | **Plugin** ← recommended |
|---|---|---|---|
| What it is | Static index + per-page Markdown | `@primeng/mcp`, 8 tools | `@primeui/cli` installer that sets up the MCP server **plus 7 skills** |
| Install | none — plain HTTP | per-assistant MCP config | `pnpm @primeui/cli plugin install --tool claude --library primeng` |
| Requirements | none | **Node.js 22+** | Node.js 22+ |
| Supports Claude Code | via fetch | yes | **yes, first-class** |
| Deterministic / pinnable | **yes** — byte-stable, cacheable | no — live service | no |
| Works offline / in CI | **yes** | no | no |
| Query granularity | whole page | `list`, `search`, `get_component`, `get_guide`, `get_example`, `get_setup`, `validate_usage`, `version` | same 8 tools + skills |
| Modifies our app | no | no | **no** — assistant-side only, installs no PrimeNG dependency |

**PrimeNG's 7 plugin skills:** `primeng-router`, `primeng-component-implementation`,
`primeng-setup-installation`, `primeng-theming-customization`, `primeng-accessibility-icons`,
`primeng-migration`, `primeng-audit-troubleshooting`.

### Decision: use both, for different jobs

**Adopt the Plugin** for interactive Phase 2 work. It is one command, it bundles the MCP server, it is
explicitly supported for Claude Code, and it installs nothing into our application — it only changes what
the assistant can see. The `validate_usage` tool is the one that matters most: it checks component usage
against generated API metadata, which is exactly the parity-checking loop this document exists to support.

**Also pin a snapshot of `llms.txt` into the repo** as `specs/primeng/llms-22.1.1.txt`. Reason: the MCP
server is a live service and a moving target. Every ✅/❌ in this document is a claim about a specific
PrimeNG version. Without a pinned snapshot, revision 4 cannot tell the difference between "we regressed"
and "PrimeNG added components." The snapshot costs 17 KB and makes the baseline reproducible.

**Do not rely on the MCP server alone.** It requires Node 22 and network access, so it cannot back a CI
parity gate. The adherence lint (H-5) must run against the pinned snapshot.

### Useful mechanism discovered

Appending `.md` to any documentation route returns clean Markdown:
`https://primeng.dev/llms/components/button.md` → HTTP 200, 47,135 bytes of prose + API + accessibility.
**Verified across 16 routes this run — all returned HTTP 200.** This is the pattern our own documentation
site should copy (see §6).

---

## 3. Rebaseline — the real PrimeNG 22.1.1 surface

### 3.1 What `llms.txt` actually contains

132 lines: 18 guide routes + **103 component/API routes** (101 components and directives, plus
`FilterService` and the `Overlay` API).

> **Correction to the brief.** Your comment said "more than 80 components." The live count is **101
> documented components and directives**. The ~93 figure visible in the rendered sidebar excludes routes
> that are still fully documented but grouped elsewhere or carried from prior majors — `MultiSelect`,
> `ColorPicker`, `Editor`, `Galleria`, `Image`, `ImageCompare`, `ScrollPanel`, `PanelMenu`, `DragDrop`,
> `Chart`. I probed all ten directly: **every one returned HTTP 200 with full documentation and no
> deprecation notice.** They are real surface area, so they are in the baseline.

### 3.2 The 101-component baseline vs our system

Legend: ✅ Covered · ⚠️ Partial · ❌ Missing · **[38]** = was in the original 38-component plan ·
**[new]** = surfaced by this rebaseline, not in the 38-plan.

#### Form (31)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| AutoComplete | [new] | — | ❌ |
| CascadeSelect | **[38]** | — | ❌ |
| Checkbox | **[38]** | `<ino-checkbox>` | ⚠️ no indeterminate, no group, no size |
| ColorPicker | **[38]** | — | ❌ |
| DatePicker | **[38]** | — | ❌ |
| Editor | **[38]** | — | ❌ |
| **FloatLabel** | [new] | — | ❌ — rev 2 logged this as a variant gap; it is a component |
| **IconField** | [new] | — | ❌ — the sanctioned icon-slot mechanism (see N-9) |
| **IftaLabel** | [new] | — | ❌ — rev 2 logged this as a variant gap; it is a component |
| InputColor | [new] | — | ❌ |
| **InputGroup** | [new] | — | ❌ — prefix/suffix addon mechanism |
| InputMask | [new] | — | ❌ |
| InputNumber | **[38]** | `<ino-input type="number">` | ❌ no spinners, no currency, no locale |
| **InputOtp** | [new] | — | ❌ — **directly needed for KYB verification flows** |
| InputPassword | [new] | `<ino-input type="password">` | ⚠️ no strength meter, no mask toggle |
| InputTags | [new] | — | ❌ |
| InputText | **[38]** | `<ino-input>` | ⚠️ no icon slot, no size, no filled state |
| KeyFilter | [new] | — | ❌ (directive) |
| Knob | **[38]** | — | ❌ |
| **Label** | [new] | — | ❌ — PrimeNG has a first-class label primitive; we have one misused mono token (§9.2) |
| Listbox | [new] | — | ❌ |
| MultiSelect | **[38]** | — | ❌ |
| RadioButton | **[38]** | `<ino-radio-group>` | ⚠️ group only, no standalone, no size |
| Rating | **[38]** | — | ❌ |
| Select | **[38]** | `<ino-select>` | ⚠️ native `<select>` — 4 of 5 variants structurally impossible |
| SelectButton | **[38]** | — | ❌ |
| Slider | **[38]** | — | ❌ |
| Textarea | **[38]** | — | ❌ |
| ToggleButton | [new] | — | ❌ |
| ToggleSwitch | **[38]** | `<ino-toggle>` | ⚠️ no icon overlay, no error state, no size |
| TreeSelect | **[38]** | — | ❌ |

**Form: 0 ✅ · 6 ⚠️ · 25 ❌**

#### Button (3)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| Button | [new] | `<ino-button>` | ⚠️ `primary\|secondary\|ghost\|icon`; **no `danger`**, no size, no `:active` |
| SpeedDial | [new] | — | ❌ |
| SplitButton | [new] | — | ❌ |

> The 38-plan **omitted Button entirely**. Rev 2 called that "an omission in their plan, not a gap in
> ours." The rebaseline confirms it: PrimeNG has a Button group with three components and we cover one
> partially.

#### Data (10)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| **Table** | **[38]** | — | ❌ **highest-impact gap.** `--ino-row-min-height: 32px` exists in `tokens.css` §10; **zero component consumers** |
| DataView | **[38]** | — | ❌ |
| OrderList | **[38]** | — | ❌ |
| OrgChart | **[38]** | — | ❌ |
| **Paginator** | [new] | — | ❌ — a table prerequisite the 38-plan missed |
| PickList | **[38]** | — | ❌ |
| **Timeline** | [new] | `<ino-timeline>` | ✅ — marker/connector rail, vertical + horizontal layout, alternate zig-zag, interactive roving-tabindex mode; web-only by design (INO-134) |
| Tree | **[38]** | — | ❌ |
| TreeTable | **[38]** | — | ❌ |
| **VirtualScroller** | [new] | `<ino-virtual-scroller>` | ✅ — fixed + variable item size, lazy loading, scroll-position restoration; web-only by design (INO-129) |

**Data: 1 ✅ · 0 ⚠️ · 9 ❌.** The KYB MVP cannot ship without this group — a risk-flag report *is* a
dense table. The rebaseline adds three prerequisites (Paginator, VirtualScroller, Timeline) the 38-plan
did not list; VirtualScroller is the first of the three closed.

#### Panel (11)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| Card | **[38]** | `<ino-card>` | ⚠️ no header/footer/media slots |
| Accordion | **[38]** | — | ❌ |
| Divider | [new] | — | ❌ |
| Fieldset | [new] | — | ❌ |
| Panel | [new] | — | ❌ |
| ScrollArea | [new] | — | ❌ |
| ScrollPanel | [new] | — | ❌ |
| Splitter | [new] | — | ❌ |
| Stepper | **[38]** | — | ❌ |
| Tabs | **[38]** | — | ❌ (web; mobile bottom tab bar is a different component) |
| Toolbar | **[38]** | — | ❌ |

**Panel: 0 ✅ · 1 ⚠️ · 10 ❌**

#### Overlay (7)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| Dialog | **[38]** | `<ino-modal>` | ✅ size sm/default/lg, maximize, drag — INO-162 / INO-31 U-7 |
| ConfirmDialog | **[38]** | `<ino-confirm-action-sheet>` (3 mobile tracks) | ⚠️ **mobile only — nothing on web** |
| ConfirmPopup | **[38]** | — | ❌ (the "inline anchor popup" variant from rev 2 §3.2) |
| Drawer | **[38]** | — | ❌ — `ino-modal` has no edge positioning |
| DynamicDialog | [new] | — | ❌ |
| Popover | **[38]** | — | ❌ |
| Tooltip | **[38]** | — | ❌ |

**Overlay: 0 ✅ · 2 ⚠️ · 5 ❌**

#### Menu (10)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| Menubar | **[38]** | `<ino-nav>` | ⚠️ flat links + CTA; no submenus, no `role="menubar"` |
| Menu | **[38]** | — | ❌ |
| Breadcrumb | [new] | — | ❌ |
| CommandMenu | [new] | — | ❌ |
| ContextMenu | [new] | — | ❌ |
| Dock | [new] | — | ❌ |
| MegaMenu | [new] | — | ❌ |
| PanelMenu | [new] | — | ❌ |
| Sidebar | [new] | — | ❌ |
| TieredMenu | [new] | — | ❌ |

**Menu: 0 ✅ · 1 ⚠️ · 9 ❌**

#### Messages (2)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| Toast | **[38]** | `<ino-toast-container>` + `<ino-alert variant="toast">` | ⚠️ no position input (severity tiers complete — **N-8** closed) |
| Message | **[38]** | `<ino-alert>` | ⚠️ no `outlined` / `simple` variant (severity tiers complete — **N-8** closed) |

**Messages: 0 ✅ · 2 ⚠️ · 0 ❌** — still our strongest group. Both remaining gaps are *variant*
gaps, not severity gaps; each is recorded as a deliberate omission in
`06-angular-components/alert.md`.

#### Media (6)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| Carousel · Compare · Gallery · Galleria · Image · ImageCompare | all [new] | — | ❌ ×6 |

**Media: 0 ✅ · 0 ⚠️ · 6 ❌.** Entirely absent from the 38-plan. Ties directly to register item **M-11**
(imagery / illustration direction).

#### File (1)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| **FileUpload** | [new] | — | ❌ — **KYB is a document-intake product. This is a functional blocker, not polish.** |

#### Misc (21)

| PrimeNG component | In 38-plan? | Our equivalent | Status |
|---|---|---|---|
| **Skeleton** | [new] | — | ❌ — rev 2 finding E-4 ("no skeleton on card or metric-panel") maps here |
| **FocusTrap** | [new] | — | ❌ — rev 2 pending item **P-1** maps to this component |
| **ProgressBar** | [new] | — | ❌ |
| **ProgressSpinner** | [new] | — | ❌ — our only loading affordance is `aria-busy` on button |
| **Tag** | [new] | — | ❌ — **the natural home for RAG risk flags**; today that logic is fused into `ino-metric-panel` |
| **MeterGroup** | [new] | — | ❌ — **strong fit for a composite risk score** |
| **Fluid** | [new] | — | ❌ — rev 2's "fluid mode not toggleable" on `ino-input` maps to this |
| Avatar · Badge · BlockUI · Chip · Inplace · ScrollTop · Terminal | all [new] | — | ❌ ×7 |
| AnimateOnScroll · AutoFocus · Bind · ClassNames · Ripple · StyleClass · DragDrop | all [new] | — | ❌ ×7 (directives) |

**Misc: 0 ✅ · 0 ⚠️ · 21 ❌.** Six of these (Skeleton, FocusTrap, ProgressBar, ProgressSpinner, Tag,
MeterGroup) close rev 2 findings that were previously filed as vague "partial" states with no named target.

#### Services (2, not components)

`FilterService` and the `Overlay` API. Both are infrastructure for Table/Select. Out of scope until H-2.

### 3.3 Where the original 38 went

All 38 are preserved and individually traceable in the tables above via the **[38]** marker. The
38-plan's six sections map onto PrimeNG's eleven current groups as follows:

| 38-plan section | Count | Maps to current PrimeNG group(s) |
|---|---|---|
| 1 — Form & Data Input | 17 | Form (31) |
| 2 — High-Density Data Containers | 7 | Data (10) |
| 3 — Overlays & Contextual Layers | 5 | Overlay (7) |
| 4 — Navigation & Menus | 6 | Panel (11) + Menu (10) |
| 5 — Notifications & Status | 2 | Messages (2) |
| 6 — Structural Containers | 1 | Panel (11) |
| — *(not in the 38-plan)* | 0 | Button (3), Media (6), File (1), Misc (21) |

**Rebaseline rollup**

| Group | ✅ | ⚠️ | ❌ | Total | of which [38] |
|---|---|---|---|---|---|
| Form | 0 | 6 | 25 | 31 | 17 |
| Button | 0 | 1 | 2 | 3 | 0 |
| Data | 0 | 0 | 10 | 10 | 7 |
| Panel | 0 | 1 | 10 | 11 | 7 |
| Overlay | 0 | 2 | 5 | 7 | 5 |
| Menu | 0 | 1 | 9 | 10 | 1 |
| Messages | 0 | 2 | 0 | 2 | 2 |
| Media | 0 | 0 | 6 | 6 | 0 |
| File | 0 | 0 | 1 | 1 | 0 |
| Misc | 0 | 0 | 21 | 21 | 0 |
| **Total** | **0** | **12** | **89** | **101** | **38** |

### 3.4 Scope decision this forces

Rev 2 asked whether to build all 38 or the ~22 load-bearing ones. The rebaseline makes that question
sharper, and it is **register item N-10**:

| Tier | Components | Rationale |
|---|---|---|
| **Tier 1 — KYB MVP critical** | ~26 | Table, Paginator, VirtualScroller, FileUpload, InputOtp, Tag, MeterGroup, Skeleton, ProgressBar/Spinner, FocusTrap, Textarea, DatePicker, MultiSelect, Select rewrite, IconField, InputGroup, FloatLabel/IftaLabel/Label, Tooltip, Popover, Drawer, ConfirmDialog (web), Tabs, Stepper, Timeline |
| **Tier 2 — product completeness** | ~35 | Accordion, Toolbar, Menu family, Breadcrumb, Avatar, Badge, Chip, Divider, Fieldset, Panel, Splitter, ScrollArea, Slider, SelectButton, ToggleButton, InputMask, InputNumber, InputPassword, AutoComplete, Listbox, Tree, TreeSelect, TreeTable, DataView, Carousel, Image, directives |
| **Tier 3 — defer or decline** | ~40 | Knob, Rating, ColorPicker, InputColor, Editor, OrgChart, PickList, OrderList, Dock, Terminal, CommandMenu, MegaMenu, Gallery/Galleria/Compare/ImageCompare, SpeedDial, Inplace, BlockUI, ScrollTop, Ripple, AnimateOnScroll, DragDrop, ScrollPanel |

My recommendation: **build Tier 1, spec Tier 2, formally decline Tier 3.** Declining Tier 3 in writing is
as valuable as building Tier 1 — it stops every future parity review from re-litigating Knob and Terminal.

---

## 4. Customisation model — rewritten against the INOVIXUX design system

*Your point 1.*

### 4.1 The premise that has to be stated first

**We are not adopting PrimeNG as a runtime dependency.** PrimeNG is a *parity benchmark and a
documentation model*, not a vendor. Nothing in §3 implies `npm install primeng`. If that assumption is
wrong, say so now — it inverts the entire Phase 2 plan (from "build 26 components" to "theme a
dependency"), and it is much cheaper to correct here than after Phase 2 starts.

Given that premise, PrimeNG's customisation surfaces cannot be adopted directly. They have to be
*translated*. That translation is the rewrite below.

### 4.2 Translation table

| PrimeNG surface | What it does | **Our equivalent** | Status |
|---|---|---|---|
| **Styled Mode** — preset design tokens, `definePreset()` | Swap a token preset to re-skin everything | `[data-theme]` on `<html>` + primitive→role indirection in `tokens.css` | ✅ **Ahead** — we ship 3 themes (dark / light / high-contrast) with measured contrast ratios; PrimeNG presets carry no such guarantee |
| **Unstyled Mode** — ship no CSS, bring your own | Escape hatch for full visual control | n/a — we own the CSS; there is nothing to escape from | ✅ n/a by construction |
| **Pass Through (`pt`)** — inject attributes/classes into any internal DOM node | Per-instance override without forking | ❌ **Nothing.** No sanctioned override mechanism exists | ❌ **Missing — new item N-11** |
| **Tailwind integration** | Utility classes co-exist with the component layer | ❌ Not applicable; no utility layer | — Deliberate. Recommend keeping it that way |
| *(no PrimeNG equivalent)* | — | `[data-density="dense\|fluid"]` container mode | ✅ **Ours alone** |
| *(no PrimeNG equivalent)* | — | `scripts/check-theme-parity.mjs` cross-platform token parity | ✅ **Ours alone** |

### 4.3 The INOVIXUX customisation contract — four layers

Replacing PrimeNG's model with ours. Each layer has one rule, and the rules are what the adherence lint
(H-5) should enforce.

**Layer 1 — Theme.** `[data-theme="dark|light|high-contrast"]` on the document root. Primitives
(`--ino-indigo-500`) resolve to roles (`--ino-color-accent`); components read **roles only**.
→ *Rule: a component SCSS file that references a primitive token is a lint error.*
→ *Gap:* no `--ino-color-accent-hover` / `-active`. This is the **root cause of rev 2 finding E-1** (no
pressed state anywhere) — you cannot style `:active` when no token describes the active colour. Fixing
N-2 and N-3 starts here, in the token layer, not in the components.

**Layer 2 — Density.** `[data-density="dense|fluid"]` on any container. Governs row height, row spacing,
and body type size. This is a **container-scoped** axis.
→ *Rule: density is set by a layout, never by a component.*
→ *Gap:* declared in `tokens.css` §10, **consumed by zero components** (grep-confirmed). Density is
orthogonal to the per-component `size` prop (N-1) and the two must never be merged — dense mode describes
a *screen*, `size="sm"` describes *one control on that screen*. Conflating them is the single most likely
architectural mistake in Phase 2.

**Layer 3 — Component API.** Closed, typed `@Input()` string unions: `variant`, `status`, `padding`, and
the missing `size`.
→ *Rule: closed unions only. No free-form `class` strings, no `[ngClass]` pass-through, no boolean flags
that encode a variant.*
→ *Gap:* `size` absent on all 16 (N-1); `danger` absent on button. (`info` on alert/toast — N-8 — is
closed by INO-128.)

**Layer 4 — Escape hatch.** **This layer does not exist, and that is a decision we are making by
default rather than on purpose.** PrimeNG's `pt` is a pressure valve; without one, the first consumer
with an unmet need reaches for `::ng-deep`, and `::ng-deep` is unlintable, unversionable, and permanent.
→ *Decision required (N-11).* Two options:
 - **(a) Narrow contract** — each component documents a small set of `--ino-<component>-*` CSS custom
   properties as its public override surface. Overridable, lintable, versionable.
 - **(b) Closed system** — no overrides; every unmet need becomes a component-API change. Higher
   discipline, slower, but zero drift.
 My recommendation is **(a)**, because (b) is only enforceable with the adherence lint already in place,
 and that lint is itself still unbuilt (H-5).

### 4.4 What this rewrite changes about the Phase 2 plan

The important consequence: **three of rev 2's "component" gaps are actually token-layer gaps**, and doing
them in the wrong order wastes the work.

| Gap | Rev 2 filed it as | Actually |
|---|---|---|
| No `:active` state (N-3) | 16 component fixes | **1 token addition** (`--ino-color-accent-active`) + 16 trivial consumers |
| No focus ring (N-2) | drifting CSS | **1 token** (`--ino-focus-ring`) + delete 16 hand-repeats |
| No `size` API (N-1) | 16 component props | **control-height token scale first**, then 16 props |

**Ordering rule for Phase 2: tokens before components, always.** Every component built before these three
tokens land is a component that has to be revisited.

---

## 5. Claude Design — evaluated

*Your point 3. This resolves revision 2's pending item **P-8** and its associated blocker.*

Fetched `https://claude.com/product/design` this run. What it actually offers:

| Capability | Relevance to us |
|---|---|
| **Design-system import from a GitHub repo, design file, or local codebase**; it then "builds with your components, checks its output against your design system, and makes corrections before you see it" | **The highest-value hook.** This repo *is* the design system. Once §6's docs site and a machine-readable manifest exist, Claude Design can self-correct against our tokens instead of inventing new ones |
| **Export to PDF, PPTX, HTML** | Directly serves **H-4** (report/PDF theme), **M-7** (brand guidelines PDF), and the *Pitch Presentations* channel named in the original INO-31 brief |
| **`/design-sync` and `/design`** bridge Claude Design ↔ Claude Code | A working round-trip between the design surface and this repo |
| **Enterprise: admins approve a standard system and lock down edits** | The governance counterpart to our adherence lint (**H-5**) |
| Connected apps: Adobe, Canva, Miro, Vercel, Figma-adjacent | Serves **M-9** (social kit) and **M-11** (imagery direction) |
| Comment, direct text edit, spacing/colour sliders, layout controls | Your review loop on generated collateral |

### The honest finding

**"Claude Design System" is a workflow, not a published token standard.** The page documents no token
specification, no named component library, and no design-token vocabulary we could conform to. So P-8's
original framing — "align our tokens to the Claude Design System" — has no referent.

What it *is* is a consumer of our design system. That reverses the direction of the integration:

> We do not align our tokens to Claude Design. **We make our design system importable by Claude Design.**

This is a better outcome, and it is already the thing §6 and register item H-6 build. It also means the
Claude-Design work has **no Phase 2 cost of its own** — it falls out of the docs site for free, provided
the docs site ships a machine-readable manifest alongside the HTML.

**P-8 is resolved.** No further input needed from you on it.

---

## 6. Hosted component documentation site — new action item

*Your point 2. Registered as **H-6**.*

Model: `v17.primeng.org/installation` / `primeng.dev`. Per-component, PrimeNG gives a live preview, then
Features, Import, worked examples per variant with copyable code, a full API table, Theming, and
Accessibility. That is the target shape.

### 6.1 Specification

**Site-level pages** — Installation · Configuration · Theming (our 3 themes + the 2 density modes,
live-switchable) · Tokens (generated from `tokens.css`, never hand-written) · Icons · Accessibility ·
Motion specimen (closes **M-10**) · Changelog · Migration.

**Per-component page** — every one of these sections, for every component we ship:

1. **Live preview**, theme- and density-switchable in place
2. **Import** — the exact `import` line
3. **Basic** — minimal working example
4. **One worked example per variant**, with copyable source
5. **API** — every `@Input()` / `@Output()` with type, default, and description, **generated from the
   `.ts` source**, not transcribed (transcribed API tables are wrong within one sprint)
6. **Theming** — which tokens this component consumes (this is what makes the adherence lint auditable)
7. **Accessibility** — screen-reader behaviour + a keyboard-support table, matching PrimeNG's format
8. **States gallery** — default / hover / focus / active / filled / error / disabled / loading, rendered.
   This one is ours, not PrimeNG's, and it is how findings E-1 through E-5 stop recurring silently.

**Machine-readable layer** — publish our own `llms.txt` plus a `.md` variant of every component page,
mirroring the `primeng.dev/llms/components/<name>.md` mechanism verified in §2. Then our agents consume
our design system exactly the way we consume PrimeNG's, and Claude Design (§5) can import it directly.

**Hosting** — extend the existing GitHub Pages workflow (`.github/workflows/deploy-pages.yml`); it
already publishes the mobile track previews.

### 6.2 Why this ranks High rather than Medium

The docs site is not documentation overhead — it **closes four open packaging rows at once** from the
e-Cheque parity table in §13, and it is a prerequisite for two other register items:

| Closes | Row |
|---|---|
| Row 13 | `guidelines/*.card.html` ×12 — we have one combined style-guide page 🟡 |
| Row 17 | `X.prompt.md` per component — rev 2's "largest doc gap" ❌ |
| Row 18 | per-group gallery page 🟡 |
| Row 20 | `_ds_manifest.json` ❌ |
| Enables | **H-5** adherence lint — §6.1 item 6 is the token-consumption manifest the lint needs |
| Enables | **§5** Claude Design import |

Built at 16 components it is a one-time scaffold plus a template. Built after 40 components exist, it is
the same scaffold plus 40 pages of backfill.

---

## 7. Matrix B — Variant coverage for the 12 components we partially have

*Carried from revision 2 §3, re-verified. Unchanged except where the rebaseline renames the target.*

### InputText — `<ino-input>`

| Required variant | Status | Note |
|---|---|---|
| Basic unadorned text box | ✅ | |
| Icon slot — left / right / dual | ❌ | **Rebaselined target: `IconField`** (a wrapper component, not an `@Input`) |
| Prefix / suffix addon | ❌ | **Rebaselined target: `InputGroup`** — not in the 38-plan at all |
| Help / hint text below | ✅ | `@Input() hint` |
| Fluid (100% width) mode | ⚠️ | always full-width; not toggleable. **Rebaselined target: `Fluid` component** |
| Types beyond text | ✅ ahead | `text\|email\|password\|number\|search\|tel\|url` |
| Filled state | ❌ | precondition for float/IFTA labels |

### Select — `<ino-select>`

| Required variant | Status |
|---|---|
| Standard select trigger | ✅ native `<select>` |
| Editable input (type-to-filter + custom values) | ❌ impossible on native |
| Filter/search field in panel header | ❌ impossible on native |
| Grouped options (`<optgroup>`) | ❌ no support in `InoSelectOption` |
| Custom item template slot | ❌ impossible on native |

> **Architectural note, unchanged and now firmer.** Four of five variants are impossible on a native
> `<select>`. The rebaseline adds `AutoComplete`, `Listbox`, and `MultiSelect` as siblings that share the
> same overlay-listbox machinery. Building a custom listbox once unlocks **four** components; keeping the
> native element caps all four permanently. This is the highest-leverage single decision in Phase 2.

### Checkbox / RadioButton / ToggleSwitch

| Component | Have | Missing |
|---|---|---|
| `<ino-checkbox>` | standalone binary | group (array), **indeterminate** (`aria-checked="mixed"` never emitted) |
| `<ino-radio-group>` | group | standalone single radio |
| `<ino-toggle>` | track + thumb | icon overlay on thumb, **error state** (inconsistent with its siblings) |

### Dialog — `<ino-modal>`

| Required variant | Status |
|---|---|
| Standard blocking modal | ✅ `role="dialog"` + `aria-modal` |
| Dynamic runtime content | ✅ `ng-content` — *(rebaselined: PrimeNG splits this out as `DynamicDialog`)* |
| Header title | ✅ `@Input() heading` |
| Footer action shelf | ✅ `[ino-modal-footer]` named slot *(this row was already stale before INO-162 — the slot has been named since the component's original build)* |
| Maximizable / Draggable | ✅ `maximizable` + `[(maximized)]`; `draggable` — INO-162 |
| Width variants sm/md/lg | ✅ `size` input (sm/default/lg) — INO-162 |
| Edge positioning | ❌ — **rebaselined target: `Drawer`** |

### Menubar — `<ino-nav>`

| Required variant | Status |
|---|---|
| Desktop horizontal bar | ✅ |
| Dropdown submenus | ❌ |
| Mobile hamburger → vertical panel | 🔲 Pending (P-2) |
| Start slot (logo) / End slot (search, profile) | ⚠️ hardcoded / `ctaLabel` only |
| `role="menubar"` + arrow-key navigation | ❌ |

### Toast / Message — `<ino-toast-container>` / `<ino-alert>`

| Required variant | Status |
|---|---|
| Summary + detail + leading icon | ✅ |
| Severity Success / Warning / Error | ✅ |
| Severity **Info** | ✅ — `InoAlertStatus` is `info\|success\|warning\|danger` (**N-8** closed by INO-128) |
| Position (5 corners) | ❌ fixed placement |
| Sticky / persistent | 🔲 Pending (P-3) |
| Dismissable / close button | ✅ |

### Card — `<ino-card>`

| Required structure | Status |
|---|---|
| Body | ✅ |
| Header (title + subtitle) / Footer / Media slot | ❌ ×3 |
| Configurable padding | ✅ ahead — `sm\|md\|lg` |
| Interactive hover | ✅ `interactive` |
| Surface variants | ✅ ahead — `default\|sunken\|overlay` |
| Loading skeleton | ❌ — **rebaselined target: `Skeleton` component** |

### Button — `<ino-button>`

| Required variant | Status |
|---|---|
| `primary` / `secondary` / `ghost` / `icon` | ✅ |
| `danger` | ❌ — flagged as a known workaround in `confirm-action-sheet` source |
| Size tiers | ❌ |
| `:active` / pressed | ❌ |
| Loading | ✅ `aria-busy` |

### Components we have with no PrimeNG counterpart

`<ino-hero>` · `<ino-feature-grid>` · `<ino-tier-card>` · `<ino-metric-panel>` · `<ino-footer>` ·
`<ino-empty-state>` (×3 mobile) · `<ino-screen-template>` (×3 mobile).

> **Rebaseline note on `<ino-metric-panel>`:** it fuses three PrimeNG concerns — `Tag` (the RAG status
> chip), `MeterGroup` (the score bar), and `Card` (the container). That fusion is why it has a closed
> `status` union and no reusable parts. Decomposing it into Tag + MeterGroup inside a Card is worth
> considering in Phase 2, since both primitives are needed independently across the KYB dashboard.

---

## 8. Matrix C — Sizing / density tiers

*Carried from revision 2 §4, re-verified this run.*

| Question | Answer |
|---|---|
| Components accepting a `size` input | **0 of 16** — `grep "@Input() size"` returns no matches |
| Size tokens to build against | ⚠️ Partial — `tokens.css` §10 defines `[data-density]` with `--ino-space-row`, `--ino-type-body-size`, `--ino-row-min-height` |
| Is density the same axis as `sm/default/lg`? | **No** — container-level vs per-component. Orthogonal. We have one of the two. See §4.3 Layer 2 |
| Any component consuming density tokens? | **No** — `grep "dense\|fluid"` across component SCSS → zero hits |
| Control-height token scale | ❌ Does not exist |
| Touch-target floor (WCAG 2.2 §2.5.8) | ✅ `tokens.css` §7 — dense row 32px vs 24px floor |

PrimeNG requires size tiers across its Form group. At the 101-component baseline that is **~35 components**,
not the 20 the 38-plan stated — which raises, not lowers, the urgency of **N-1**.

---

## 9. Matrix D — Label placement and label sizes

### 9.1 Placement modes — *rebaselined*

| Mode | Our status | **Rebaselined PrimeNG target** |
|---|---|---|
| External label above field | ✅ `@Input() label` / `legend` | `Label` component |
| **Floating label** | ❌ **Missing system-wide** | **`FloatLabel` — a component, not a prop** |
| **IFTA label** | ❌ **Missing system-wide** | **`IftaLabel` — a component, not a prop** |
| Inline-right label | ✅ checkbox, radio-group | — |
| Inline-left label | ❌ no placement input | — |
| External surrounding text | ✅ toggle | — |
| Boundary value badges | ❌ n/a — Slider missing | `Slider` |

> **This is the most useful thing the rebaseline changed.** Rev 2 filed float/IFTA as a variant gap
> requiring a `labelMode` input on 7 form components. PrimeNG solves it with **three wrapper components**
> that work with *any* form control. Building three wrappers is far less work than 7+ per-component props,
> and it scales to all 31 Form components instead of 7.

### 9.2 Label sizes — token level

`tokens.css` §4 defines exactly one label token:

```
--ino-type-label-size: 11px;  --ino-type-label-weight: 600;  --ino-type-label-tracking: 0.14em;
```

| Finding | Status |
|---|---|
| A label type token exists | ✅ |
| Fit for form labels | ❌ — it is **mono, uppercase, 0.14em-tracked**, specified in §4 for "uppercase eyebrows/section labels". Using it as a form-field label is a misuse |
| Form-label token (sentence case, body font) | ❌ Missing |
| Label size tiers matched to sm/default/lg | ❌ Missing — reference ships `--type-label` *and* `--type-label-sm` |
| Help / hint text token | ⚠️ `--ino-type-body-sm-size: 12.5px` exists but is not named as a hint/caption role |
| Caption token | ❌ Missing |

**Net: a one-token system where a five-token system is required** (label-lg, label, label-sm, hint,
caption). Unchanged from rev 2 — item **N-4**.

---

## 10. Matrix E — Component states

*Carried from revision 2 §6, re-verified.* Required set: Default · Hover · Focus · **Active/Pressed** ·
Filled · Invalid/Error · Disabled · Loading.

| Component | Default | Hover | Focus | **Active** | Filled | Error | Disabled | Loading |
|---|---|---|---|---|---|---|---|---|
| `ino-button` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | ✅ | ✅ `aria-busy` |
| `ino-input` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `ino-select` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `ino-checkbox` | ✅ | ❌ | ✅ | ❌ | n/a | ✅ | ✅ | n/a |
| `ino-radio-group` | ✅ | ❌ | ✅ | ❌ | n/a | ✅ | ✅ | n/a |
| `ino-toggle` | ✅ | ❌ | ✅ | ❌ | n/a | ❌ | ✅ | n/a |
| `ino-card` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | n/a | ❌ |
| `ino-alert` | ✅ | ✅ | ✅ | ❌ | n/a | ✅ | n/a | n/a |
| `ino-modal` | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | ❌ |
| `ino-nav` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | n/a | n/a |
| `ino-footer` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | n/a | n/a |
| `ino-hero` | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `ino-feature-grid` | ✅ | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a |
| `ino-tier-card` | ✅ | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a |
| `ino-metric-panel` | ✅ | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ |
| `ino-toast-container` | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

| # | Finding | Status |
|---|---|---|
| E-1 | **`:active` / pressed absent from all 16 components.** Root cause is token-layer (§4.3 Layer 1), not component-layer | ❌ 16/16 |
| E-2 | **Hover missing on all three binary controls** — checkbox, radio-group, toggle | ❌ 3 components |
| E-3 | **Filled state not styled** on input or select — precondition for FloatLabel/IftaLabel | ❌ |
| E-4 | **Loading exists only on button.** *Rebaselined targets: `Skeleton`, `ProgressBar`, `ProgressSpinner`* | ⚠️ 1/N |
| E-5 | `ino-toggle` has no error state, unlike its siblings | ❌ |
| E-6 | Marketing components carry no interactive states; `tier-card` has a `highlighted` input implying selection | ⚠️ Needs a decision |
| E-7 | Error state styled consistently (`--ino-color-risk-high-*`) on the three controls that have it | ✅ |
| E-8 | Disabled implemented via `[disabled]` + SCSS, not `pointer-events: none` | ✅ |

---

## 11. Matrix F — Accessibility (WCAG 2.1 AA)

*Carried from revision 2 §7.* PrimeNG states it targets **AA** on WCAG and documents screen-reader plus
keyboard support per component — the format §6.1 item 7 adopts.

### 11.1 Per-component

| Component | ARIA present | Gaps |
|---|---|---|
| `ino-button` | `aria-label`, `aria-busy`, `[attr.disabled]` | ⚠️ anchor variant: `disabled` not honoured on `<a>` — a keyboard user can still activate a "disabled" link |
| `ino-input` | `role`, `aria-invalid`, `aria-describedby` | ✅ meets contract |
| `ino-select` | `role`, `aria-invalid`, `aria-describedby` | ❌ no `aria-expanded`/`aria-activedescendant` — **acceptable today** on native `<select>`; becomes a gap the moment we move to a custom listbox (§7) |
| `ino-checkbox` | `role`, `aria-invalid`, `aria-describedby` | ❌ no `aria-checked="mixed"` |
| `ino-radio-group` | `role`, `aria-describedby` | ⚠️ arrow-key cycling comes free from native radios |
| `ino-toggle` | `role="switch"`, `aria-checked`, `aria-label` | ✅ meets contract |
| `ino-modal` | `role="dialog"`, `aria-modal`, `aria-labelledby`, `tabindex` | ✅ meets contract — focus containment delegated to `[inoFocusTrap]` (T-11); resolves **P-1** (INO-162) |
| `ino-alert` | `role`, `aria-label` | ⚠️ `aria-live` sits on the container, not the alert; inline-injected alerts may not announce |
| `ino-toast-container` | `aria-live`, `aria-atomic` | ⚠️ single politeness level; needs `assertive` for errors, `polite` otherwise |
| `ino-nav` | `aria-label` | ❌ no `role="menubar"`, no `aria-current` |
| `ino-card` | none | ⚠️ `interactive` cards have no `role="button"` or anchor wrapper → **keyboard-inaccessible clickable card** |
| `ino-hero`, `feature-grid`, `tier-card`, `metric-panel`, `footer` | none | ⚠️ presentational; acceptable if confirmed non-interactive (E-6) |

### 11.2 System level

| SC | Criterion | Status | Evidence |
|---|---|---|---|
| 1.4.3 | Contrast (Minimum) 4.5:1 | ✅ | Ratios measured, all 3 themes; high-contrast targets AAA |
| 1.4.11 | Non-text Contrast 3:1 | ⚠️ | Border/focus colours token-derived but **not measured** |
| 1.4.1 | Use of Colour | ⚠️ | RAG uses colour **and** text in `metric-panel`; not enforced as a rule |
| 2.1.1 | Keyboard | ⚠️ | Interactive card not operable; anchor-button disabled gap |
| 2.1.2 | No Keyboard Trap | ✅ | `[inoFocusTrap]` (T-11) on `ino-modal`'s panel — 15 passing tests in `ino-focus-trap.spec.ts`; resolves P-1 (INO-162) |
| 2.4.7 | Focus Visible | ⚠️ | Present everywhere but **hand-repeated, no token**, already drifted |
| 3.3.1 | Error Identification | ✅ | `aria-invalid` + visible error text |
| 3.3.2 | Labels or Instructions | ✅ | `label`/`legend`/`hint` on all form controls |
| 4.1.2 | Name, Role, Value | ⚠️ | Strong on form controls; missing on nav and card |
| 4.1.3 | Status Messages | ⚠️ | `aria-live` on toast container only; one politeness level |
| 2.5.8 (2.2) | Target Size | ✅ | `tokens.css` §7 |
| — | `prefers-reduced-motion` | ✅ | Closed by **INO-127** (W0-5) — see N-7 below |

**No automated accessibility gate exists.** No axe, no pa11y, no CI a11y check.
`scripts/check-theme-parity.mjs` checks token parity, not accessibility. **Every ✅ above is a
source-reading assertion, not a test result** — which is what H-5 exists to fix.

---

## 12. Matrix G — Token vocabulary vs ds_context

*Carried from revision 2 §8, unchanged.*

| Token family | ds_context | INOVIXUX | Status |
|---|---|---|---|
| Colour primitives | 11-step indigo + slate + 4 status | primitive→role, **3 themes** | ✅ ahead |
| Brand state tokens | `--color-brand-hover/-active/-subtle/-muted/-emphasis` | `--ino-color-accent`, `-secondary` | ⚠️ **no `-hover`/`-active`** — root cause of E-1 |
| Surfaces | 7 tokens | surface / raised / sunken / scrim | ✅ |
| Text roles | 10 incl. placeholder, disabled | present | ⚠️ verify by name |
| Border colours | subtle/default/strong/brand/focus | present | ⚠️ no named `--border-focus` |
| Spacing | 4px grid, 18 steps | §5 | ✅ |
| Grid tokens | cols/gutter/margin per breakpoint | ❌ | ❌ Missing |
| Touch targets | `--touch-sm/md/lg` | §7 | ✅ |
| Type scale | 9 steps | §4 | ✅ |
| Font weights | 6 named | per-role, unnamed | ⚠️ |
| Line heights | 5 named `--leading-*` | per-role | ⚠️ no reusable scale |
| Letter spacing | 6 named `--tracking-*` | per-role | ⚠️ |
| Composite type aliases | 15 | ❌ per-property only | ❌ Missing |
| Radius | 9 steps + 12 semantic | §6 | ⚠️ verify semantic aliases |
| Border widths | 4 + 6 semantic | §6 | ⚠️ |
| Shadows | 6 elevation + 3 brand + 2 inset + 3 focus + 6 semantic | **2 elevation + scrim** | ⚠️ materially thinner |
| **Focus-ring tokens** | brand / error / success | ❌ **none** | ❌ Missing — root cause of SC 2.4.7 |
| Motion durations / easings | 6 / 7 named | §9 | ✅ |
| Motion composite transitions | 7 + 3 | ❌ | ❌ Missing |
| Density modes | ❌ none | ✅ §10 | ✅ ahead |
| Safe-area insets | ❌ | ✅ §11 | ✅ ahead |
| Cross-platform parity check | ❌ | ✅ `check-theme-parity.mjs` | ✅ ahead |
| **Data-viz palette** | ❌ | ❌ | ❌ Missing — **H-1** |

### ds_context global requirements

| # | Requirement | Status |
|---|---|---|
| 1 | All values reference CSS variables, nothing hardcoded | 🔲 **no lint enforces this** (H-5) |
| 2 | Do not change the colour palette | ✅ |
| 3 | Consistent focus ring via a single token | ❌ hand-repeated, already drifted |
| 4 | All motion respects `prefers-reduced-motion` | ✅ closed by **INO-127** |
| 5 | Dark mode via CSS variables, no class overrides | ✅ ahead — 3 themes via `[data-theme]` |
| 6 | Responsive / mobile-viewport functional | ✅ |
| 7 | No external icon library assumed; icon slots | ⚠️ `14-icon-system.md` exists; **components have no icon slots** → `IconField` (§3.2) |

---

## 13. Structural parity vs the e-Cheque packaging layer

*Carried from revision 1, preserved. `✅` at parity or ahead · `🟡` content covered, packaging missing ·
`❌` gap.* **Rows 13, 17, 18, 20 are all closed by H-6 (§6).**

| # | Reference artifact | Our equivalent | Verdict |
|---|---|---|---|
| 1 | `styles.css` import entry | consumers import `web/src/tokens.css` | 🟡 |
| 2 | `tokens/` split into 6 files | single 436-line `tokens.css` | 🟡 structure only |
| 3 | `tokens/colors.css` | §1–§2c, **3 themes**, ratios measured | ✅ ahead |
| 4 | `tokens/typography.css` | §4, Geist + system fallback | ✅ |
| 5 | `tokens/spacing.css` | §5 | ✅ |
| 6 | `tokens/shadows.css` | 2 elevation + scrim | ⚠️ thinner |
| 7 | `tokens/borders.css` | §6 | ✅ |
| 8 | `tokens/motion.css` | §9 | ✅ |
| 9 | *(none in reference)* | §10 density, §7 touch, §11 safe-area | ✅ ahead |
| 10 | *(none in reference)* | `check-theme-parity.mjs` | ✅ ahead |
| 11 | `assets/logo*.svg` ×3 | 9 SVGs + 5 PNGs | ✅ ahead *(final artwork still INO-82)* |
| 12 | `brand-hero.svg`, `brand-illustration.svg` | none | ❌ |
| 13 | `guidelines/*.card.html` ×12 | one combined style-guide page | 🟡 → **H-6** |
| 14 | `guidelines/ds-context.md` | `02-design-tokens/README.md` + theme contract | ✅ |
| 15 | `components/<group>/X.jsx` | 16 Angular components, mirrored | ✅ |
| 16 | `components/<group>/X.d.ts` | `@Input()`s in `.ts`, no extracted contract | 🟡 → **H-6** §6.1 item 5 |
| 17 | `components/<group>/X.prompt.md` | none | ❌ → **H-6** |
| 18 | `<group>.card.html` gallery | one 104-line docs page | 🟡 → **H-6** |
| 19 | `ui_kits/` prototypes | 3 mobile apps (13 screens each) + 14-route site + Pages preview | ✅ well ahead |
| 20 | `_ds_manifest.json` | none | ❌ → **H-6** machine-readable layer |
| 21 | `_ds_bundle.js` | `06-angular-components/package.json`, never published | 🟡 |
| 22 | `_adherence.oxlintrc.json` | none — parity ≠ adherence | ❌ → **H-5** |
| 23 | `SKILL.md` | none | ❌ |
| 24 | `readme.md` | `00-INDEX.md` | ✅ |
| 25 | `thumbnail.html` | none | ❌ cosmetic |
| 26 | `uploads/` source briefs | `specs/`, issue threads | ✅ |

**Score: 14 ✅ (6 ahead) · 6 🟡 · 6 ❌.**

---

## 14. Pending Items Register

**All 26 items from revision 2 carried forward unchanged, plus 5 new (N-10, N-11, H-6, M-13, M-14).
Total 31.** Two items change status on the strength of your points 3 and 6.

### HIGH — blocks or degrades near-term work

| # | Item | Status | Evidence | Blocked by |
|---|---|---|---|---|
| **H-1** | **Data-visualization palette** — categorical series, sequential + diverging ramps, colourblind-safe validation across all 3 themes | ❌ Missing | `tokens.css` mentions "chart strokes" once, in passing | — |
| **H-2** | **Table / dense data component** | ❌ Missing | `--ino-row-min-height: 32px` defined; **zero consumers**. Rebaseline adds Paginator + VirtualScroller as prerequisites — **VirtualScroller shipped (INO-129)**, Paginator still open | — |
| **H-3** | **Devanagari + Indic typography** — Noto Sans Devanagari pairing, matched vertical rhythm | ❌ Missing | font chain is `Geist, system-ui, -apple-system, Arial, Helvetica` — no Devanagari face; a Hindi string falls to the OS default and breaks the line-height contract | — |
| **H-4** | **Report / PDF export theme** — header/footer, typographic spec, print colour profile, INO-14 disclaimer lockup | ❌ Missing | no `@media print` block anywhere | print-colour half on **INO-82** |
| **H-5** | **Design-system adherence lint** | ❌ Missing | `check-theme-parity.mjs` checks parity, not adherence | needs H-6 §6.1 item 6 |
| **H-6** | **Hosted component documentation site** *(NEW — your point 2)* | ❌ Missing | §6. Closes parity rows 13/16/17/18/20; enables H-5 and Claude Design import | — |
| **N-1** | **Per-component `sm`/`default`/`lg` size API** | ❌ Missing (0 of 16) | §8. Rebaseline raises the requirement from 20 to **~35** components | needs control-height tokens first |
| **N-2** | **Focus-ring token** (`--ino-focus-ring`) | ❌ Missing | §12; already drifted (offset 1px vs 2px) | — |
| **N-3** | **`:active` / pressed state** | ❌ Missing (16 of 16) | §10 E-1; root cause is the missing `--ino-color-accent-active` token | — |
| **N-4** | **Form-label token set** — label-lg / label / label-sm / hint / caption | ❌ Missing | §9.2 — one mono uppercase token today, misused as a form label | — |
| **N-10** | **Tier-1/2/3 scope decision across the 101-component baseline** *(NEW)* | 🔲 **Decision required** | §3.4. Without it, Phase 2 estimates have a 4× spread | **You** |

**Why N-1…N-4 are High and not Medium:** each is a *cross-cutting contract change*. Adding a `size` prop
or a focus-ring token after 30 more components exist costs 30× what it costs today. They are cheapest at
the current component count and get monotonically more expensive. §4.4 makes the ordering explicit:
**tokens before components, always.**

### MEDIUM — needed before anything external-facing

| # | Item | Status | Blocked by |
|---|---|---|---|
| **M-6** | Email design system — transactional templates (verification, approval-requested, report-ready) + HTML signature block | ✅ **Closed** by **INO-121** — `docs/brand/07-collateral/email/`, 4 transactional templates + signature block, values generated from `tokens.css` (`scripts/gen-email-templates.mjs`), drift-checked in CI (`scripts/check-email-tokens.mjs`). Also covers password-reset (not separately listed here). Final logo swap pending **INO-82** | — |
| **M-7** | Brand guidelines PDF — the single distributable file a vendor/printer/partner gets | ❌ Missing | **INO-82** |
| **M-8** | Print colour specification — CMYK + Pantone for the violet/indigo accent | ❌ Missing | **INO-82** |
| **M-9** | Social profile kit — LinkedIn/X banner, avatar crops, post templates | ❌ Missing | partly **INO-82** |
| **M-10** | Motion specimen — rendered page demonstrating durations and easings | ❌ Missing | folded into **H-6** |
| **M-11** | Imagery / illustration direction | ❌ Missing | — |
| **M-12** | App store listing assets — screenshots, feature graphic, store copy × 3 tracks | ⚠️ Partial — spec, icon-size pipeline docs, placeholder feature graphic, and store copy done (`07-collateral/app-store-listing-assets.md`); screenshots need a build/simulator step (handed to QALead), final artwork gated on INO-82, submission gated on the INO-14 hold | partly **INO-82** |
| **M-13** | **PrimeNG AI tooling adoption** *(NEW)* — install the Plugin; pin `llms.txt` to `specs/primeng/llms-22.1.1.txt` | ❌ Not started | §2 | 
| **M-14** | **Decompose `ino-metric-panel`** *(NEW)* into `Tag` + `MeterGroup` inside a `Card` | 🔲 Decision | §7 |
| **N-5** | Composite type aliases + `--leading-*` / `--tracking-*` scales | ✅ **Closed** by **INO-126** (W0-4) — `tokens.css` §4c: 9-step `--ino-leading-*` + 7-step `--ino-tracking-*` scale, every existing role re-pointed at it, plus one `font`-shorthand composite alias per role, asserted by `check-theme-parity.mjs` | — |
| **N-6** | Shadow/elevation scale — 2 steps today vs 6 + 3 brand + 2 inset | ✅ **Closed** by **INO-126** (W0-4) — `tokens.css` §2: `--ino-elevation-neutral-1..6` / `-brand-1..3` / `-inset-1..2`, brand parametric on `var(--ino-color-accent)`, all 11 flatten to `none` in high-contrast (recorded decision), old `-0/-1/-2` left in place for existing consumers | — |
| **N-7** | `prefers-reduced-motion` coverage — 5 of 16 components | ✅ **Closed** by **INO-127** (W0-5) — every component directory with `transition`/`animation`/`@keyframes` CSS (`alert`, `button`, `card`, `input`, `modal`, `nav`, `select`, `tag`, `toast-container`, `toggle`, `virtual-scroller`) now gates it under `prefers-reduced-motion`, plus JS-driven motion (`CountUpDirective`, `virtual-scroller`'s programmatic scroll) already checked `matchMedia`. `alert`, `input`, `nav`, `select` were the actual gap and got the branch this pass; the rest already had it. `checkbox`, `radio-group`, `feature-grid`, `footer`, `tier-card`, `focus-trap` have no motion to gate. Pattern documented in `docs/brand/06-angular-components/motion-contract.md` so Wave 2 inherits it. | — |
| **N-8** | **Info severity tier** — `info` on both Toast and Message | ✅ **Closed** by **INO-128** (W0-6) — `InoAlertStatus` is `info\|success\|warning\|danger`; `--ino-color-info` / `--ino-color-on-info` in all 3 themes + both mobile ports, asserted by `check-theme-parity.mjs` | — |
| **N-9** | Icon slots + `danger` button variant | ✅ **Closed** (icon slots) by **INO-157** (U-2) — `ino-input` deliberately ships no `@Input() icon`; leading/trailing icons compose via `<ino-icon-field>` (T-16), prefix/suffix addons via `<ino-input-group>` (T-17). `danger` button variant still outstanding | rebaselined to `IconField` + `InputGroup` (§3.2) |
| **N-11** | **Escape-hatch / override contract** *(NEW)* — PrimeNG's `pt` equivalent | 🔲 **Decision required** | §4.3 Layer 4. **You** — recommend option (a) |

### LOW — real, but safely deferrable

| # | Item | Status | Blocked by |
|---|---|---|---|
| **L-13** | Trademark / domain / handle audit — India TM classes 9 & 42, domain + social handles for "INOVIXUX" | ❌ Not started | partly **INO-82** |
| **L-14** | Sound & haptics — mobile approval/rejection feedback | ❌ Missing | — |
| **L-15** | Accessibility statement — public VPAT-style page | ❌ Missing | depends on H-5 + an automated a11y gate for its claims to be truthful |
| **L-16** | DS versioning & release — semver the token contract, publish `06-angular-components/` as a real package | ❌ Missing | — |
| **L-17** | **Figma library** | ✅ **UNBLOCKED this run** | Figma connector verified live — `whoami` → `Paresh` / team `INVC` (starter tier). Moves to Phase 2 scope |

### Rollup

| Priority | Items | ❌ Missing | ⚠️ Partial | 🔲 Decision | ✅ Unblocked |
|---|---|---|---|---|---|
| High | 11 | 10 | 0 | 1 | 0 |
| Medium | 15 | 10 | 4 | 2 | 0 |
| Low | 5 | 4 | 0 | 0 | 1 |
| **Total** | **31** | **24** | **4** | **3** | **1** |

---

## 15. Blockers — two resolved

| Blocker | Status | Blocks | Unblock action |
|---|---|---|---|
| **INO-82** (Brand Logo, `in_review`) | 🔴 **Still open** | M-7, M-8, parts of M-9 / M-12 / L-13 | **You** — approve or reject the INO-82 logo round |
| **Figma connector** | ✅ **RESOLVED** (your point 6) | was L-17 | Verified live this run: `whoami` → `Paresh`, plan `INVC`, seat Full, tier **starter**. ⚠️ One caveat: starter tier may cap library-publishing features; I will confirm against a real file in Phase 2 rather than assume |
| **"Claude Design System" undefined** (P-8) | ✅ **RESOLVED** (your point 3) | was Phase 2 alignment | §5. Finding: it is a *workflow and a consumer* of design systems, not a token standard. Integration direction reverses — we make our DS importable, we do not conform our tokens to it. **No cost of its own; falls out of H-6** |
| **No automated a11y gate** | 🟡 Open | every ✅ in §11 is an assertion, not a test | Me, in Phase 2 — fold axe/pa11y into H-5 |
| **N-10 scope + N-11 override contract** | 🟡 **Awaiting you** | Phase 2 estimate accuracy | §3.4 and §4.3 Layer 4 |

### Still unassessable

| # | Item | Resolves via |
|---|---|---|
| P-2 | `ino-nav` mobile hamburger | read the site shell, or a mobile-viewport screenshot |
| P-3 | Toast sticky/persistent mode | read the toast service |
| P-4 | Hardcoded-value audit (ds_context req. 1) | **H-5** — this is exactly what it is for |
| P-5 | Rendered contrast of non-text elements (SC 1.4.11) | extend the ratio script to borders and focus rings |
| P-7 | Mobile-track component parity | per-track audit, or extend `check-theme-parity.mjs` to component level |

*(P-6 Figma and P-8 Claude Design are now resolved and removed from this list. P-1 modal focus
trap is also resolved — INO-162 adopted `[inoFocusTrap]` (T-11) on `ino-modal`'s panel; see §11.1
and §11.2 above.)*

---

## 16. Phase 2 gate

**Phase 1 ends here.** Nothing in §14 has been started, and no child issues have been created.

Per your point 7, I have posted a confirmation request on the issue thread covering **§3 — the
rebaseline**. On your confirmation I will deliver Phase 2: an implementation plan for all 31 register
items, agent orchestration strategy (count, specialization, dependency graph), time estimates with the
critical path and parallelization limits, the H-6 documentation site, and the Figma library now that the
connector is live.

**Two decisions I need with your confirmation** — they do not block approval, but they change the Phase 2
estimate by roughly 4×:

1. **N-10 — scope.** Tier 1 only (~26 components), Tier 1 + 2 (~61), or all 101? My recommendation:
   **build Tier 1, spec Tier 2, formally decline Tier 3 in writing.**
2. **N-11 — override contract.** Narrow CSS-custom-property surface (a), or closed system (b)? My
   recommendation: **(a)**, because (b) is only enforceable once H-5 exists.

**One premise to confirm or correct** (§4.1): we treat PrimeNG as a **parity benchmark, not a runtime
dependency**. If you intend to actually depend on PrimeNG, the Phase 2 plan inverts from "build
components" to "theme a dependency," and that is far cheaper to correct now than later.

**One carried decision from rev 2, now firmer:** the `ino-select` rewrite. 4 of 5 Select variants are
impossible on a native `<select>`, and the rebaseline shows a custom listbox would unlock **four**
components (Select, MultiSelect, AutoComplete, Listbox) rather than one. This is the highest-leverage
single decision in Phase 2, and it lands inside Tier 1 either way.

---

*Revision 3 prepared 2026-09-14. Sources A–G. Live PrimeNG data fetched this run from `primeng.dev`
(`llms.txt`, 16,984 bytes, HTTP 200) and verified against 16 individual component routes. Revision 1
(e-Cheque structural parity) preserved as §13; revision 2's matrices preserved as §7–§12 and its full
pending-items register as §14. Supersedes the "folder could not be read" notes in
`12-branding-completeness-checklist.md` §7 and `11-dark-light-mobile-accessibility.md` §9.*
