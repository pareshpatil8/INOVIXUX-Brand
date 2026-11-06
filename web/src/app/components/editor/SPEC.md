# `<ino-editor>` — component spec

**Issue:** INO-475 (INO-31 B5, doc 26 §5 row "ino-editor")
**Parity benchmark:** PrimeNG 22.1.1 `Editor` — a thin wrapper over Quill 2. PrimeNG is a
benchmark, **not a runtime dependency** (same stance as every other SPEC in this library), and
this component deliberately does not take Quill either — see §1.
**Spec seed (doc 26 §5):** rich text: toolbar presets (basic/full); headings/lists/links/code;
sanitized paste; char limit. States: invalid, readonly, at-limit. Sizing: min-height scales.
Labels: label + help/error. A11y: `role=toolbar` roving focus; `aria-multiline` textbox; format
toggles announced. Web-only; heavy row — spec first.
**Siblings:** `<ino-textarea>` (INO-147) for the field shell (label/hint/error/counter,
`aria-describedby` wiring, readonly-not-disabled); `<ino-toolbar>` (INO-443) for the APG toolbar
roving-tabindex pattern.

This file records the decisions the §2 contract requires to be written down rather than silently
made. The row is marked "heavy — spec first"; every cut here is deliberate and §9 lists what was
cut.

---

## 1. Engine: `contenteditable` + `document.execCommand`, zero runtime dependencies

Three options were on the table:

1. **Take Quill (what PrimeNG does).** Rejected: the library has shipped ~80 components with zero
   runtime dependencies beyond Angular; a rich-text row is not the place to break that. Quill
   also brings its own theming/DOM model that fights the token system.
2. **Hand-rolled Selection/Range document model.** Rejected as out of proportion: a correct
   model-based editor (normalization, history, IME) is a product, not a component row.
3. **`contenteditable` + `document.execCommand` for the §5 format set only.** Chosen.
   `execCommand` is MDN-deprecated but universally shipped and frozen in all evergreen browsers,
   and the §5 format set (bold/italic/underline, lists, headings, links, code block) sits
   entirely inside the subset that behaves identically across them. The deprecation risk is
   recorded here deliberately: if a browser ever drops it, the toolbar degrades (buttons no-op)
   while typing, paste sanitization, char limit, and the whole a11y contract — all implemented
   by this component, not by `execCommand` — keep working.

The editor never runs `execCommand('paste'|'cut'|'copy')` and never touches
`queryCommandSupported` gating UI — the §5 commands are assumed; a silent no-op on a hostile
browser is an acceptable floor for a deprecated API we chose over a dependency.

## 2. Toolbar presets (§5: basic/full)

`preset: 'basic' | 'full'` (default `'basic'`).

| Preset | Groups (in order) |
|---|---|
| `basic` | **Inline:** bold, italic, underline · **Lists:** bulleted, numbered |
| `full` | basic + **Blocks:** heading 2, heading 3, code block · **Insert:** link, unlink · **Clear formatting** |

- **H2/H3, never H1** — an editor embedded in a page must not emit page-title headings; the host
  page owns `<h1>`. (Same reasoning as the docs portal's own anatomy pages.)
- **"code" (§5) means code *block*** (`formatBlock('pre')`). Inline code requires manual Range
  surgery `execCommand` cannot do; cut, see §9.
- **Link** prompts for a URL via `window.prompt` — modal, keyboard-accessible, SR-announced for
  free. A popover URL form is a v2 nicety, not a contract point (§9). URLs are validated by the
  same rule the paste sanitizer uses (§4): `http(s):` and `mailto:` only — `javascript:` etc.
  are rejected, not inserted.
- Group separators are `aria-hidden` dividers, not focusable.

## 3. Toolbar a11y: roving tabindex + announced format toggles

Same APG toolbar pattern `<ino-toolbar>` implements (ArrowLeft/Right wrap, Home/End, one tab
stop), re-implemented locally rather than by composing `<ino-toolbar>`: the editor owns and
renders its buttons (they are not projected content), needs `aria-pressed` state sync against
the live selection, and must disable the whole strip in readonly/disabled — none of which the
content-projection toolbar models.

- Strip: `role="toolbar"`, `aria-label` = "Text formatting", `aria-controls` = textbox id.
- Toggles (bold/italic/underline/lists/headings/code block): `aria-pressed` tracking the
  selection via `queryCommandState`/`queryCommandValue`, refreshed on `selectionchange` (document
  listener, bound only while focus is inside the component — see the `selectionchange` note in
  the component doc comment). A pressed-state flip on activation is the SR announcement §5 asks
  for; no live region is needed for toggles.
- Action buttons (link, unlink, clear): plain buttons, no `aria-pressed`.
- Every button is icon-only → each carries a text `aria-label` and a `title` tooltip.
- ArrowUp/Down are left alone (not toolbar keys in a horizontal toolbar); Arrow keys inside the
  *textbox* are never intercepted — only the strip has the roving handler.

## 4. Sanitized paste (§5) — one sanitizer, two call sites

`sanitizeHtml(html)` is a pure function (exported for the unit spec): parse via `DOMParser`,
walk the tree, rebuild against an allowlist. It is both the **XSS boundary** and the
**format-noise boundary** (Word/Google Docs paste junk).

- **Allowlist:** `p, br, strong, em, u, h2, h3, ul, ol, li, pre, code, a` — plus normalizations
  `b→strong`, `i→em`, `h1→h2`, `div→p`. Anything else (span/style/script/img/table/…) is
  unwrapped to its children or dropped (script/style/head dropped wholesale, including text).
- **Attributes:** everything stripped except `a[href]`, kept only when the href parses to
  `http:`, `https:` or `mailto:` (`javascript:`, `data:`, vbscript etc. rejected). Kept links get
  `rel="noopener noreferrer"`.
- **Call sites:** (1) the `paste` handler — `preventDefault`, read `text/html` (fall back to
  `text/plain` escaped into text nodes), sanitize, trim to the char budget (§5), insert at the
  caret via `insertHTML`; (2) the `value` **@Input setter** — the incoming string is assigned via
  `innerHTML`, so a hostile bound value walks through the same sanitizer. `valueChange` output is
  therefore always sanitizer-clean by construction.

## 5. Char limit + at-limit state (§5)

`maxLength` counts **`textContent` length, not HTML markup length** — the user-meaningful number
(`<strong>hi</strong>` is 2, not 19). `contenteditable` has no native `maxlength`, so
enforcement is this component's:

- `beforeinput`: when at the limit, text-inserting input types are `preventDefault`ed;
  deletions, history and formatting input types always pass (formatting never consumes budget).
  An edit that *replaces* a selection passes when the net length stays within budget.
- Paste inserts at most the remaining budget (plain-text-trimmed when over).
- Counter: same `{count}/{max}` + `showCount` contract as `<ino-textarea>` (counter never
  renders without `maxLength`), wired into `aria-describedby`, `aria-live="polite"`.
- **at-limit** (`count >= maxLength`): counter flips to `--ino-color-danger` + weight 600 —
  identical to textarea's `--limit` treatment. It is a *soft* signal on the counter only; the
  control border does not go danger (that is `error`'s job — at-limit is not invalid).

## 6. States (§2 standard set + §5: invalid, readonly, at-limit)

| State | Treatment |
|---|---|
| default | sunken surface, 1px `--ino-color-border` around the whole frame (toolbar + content as one bordered unit) |
| hover | border → `--ino-color-on-surface-muted` (frame), matching textarea |
| focus-visible | `--ino-focus-ring` on the **content area** when focused from keyboard; toolbar buttons carry their own rings |
| active (toggle pressed) | pressed toolbar button: accent fill + on-accent text (the ino-toggle-button checked pairing) + `aria-pressed="true"` |
| invalid (`error` set) | frame border `--ino-color-danger`, `aria-invalid="true"`, error line replaces hint (textarea contract) |
| readonly | `contenteditable=false`, **toolbar buttons disabled**, raised background; content stays in the tab order, selectable/copyable, `aria-readonly="true"` — never `disabled` for readonly (library rule) |
| disabled | not focusable (textbox loses `tabindex`), toolbar disabled, opacity 0.5, `aria-disabled="true"` |
| at-limit | §5 — counter-only danger treatment |
| empty | `aria-placeholder` + CSS `:empty::before` placeholder in `--ino-color-on-surface-subtle` (contenteditable has no native placeholder) |

Loading is deliberately not in this component's state set: no async source feeds an editor
directly (the host form owns submission state). Recorded as a deliberate omission on the docs
page.

## 7. Sizing — "min-height scales" (§5) + density

- The content area's `min-block-size` is `calc(var(--ino-control-height) * 3)`: the same
  three-alias re-point every sized control uses (`:host([data-size])` re-points
  `--ino-control-height`/`--ino-control-padding-inline`/`--ino-control-font-size` to the
  sm/lg rungs), so one multiplier yields **108 / 132 / 156 px** (sm/default/lg) fluid and
  **84 / 96 / 120 px** dense via the §12 dense re-point — min-height genuinely *scales* with
  both axes instead of being three hardcoded pixel values. The `* 3` multiplier is layout math
  on a token, the same class of exception textarea's SPEC §1 records for `scrollHeight`.
- Toolbar buttons are square `--ino-control-height-compact` targets inside a strip padded with
  `--ino-space-2` — compact is the overlay/chrome rung and the strip is chrome, not a form row;
  the dense floor rule (tokens.css §12) keeps them ≥ the 24px WCAG 2.5.8 floor in both
  registers.
- The content area grows with content beyond min-height (no max — the host page scrolls; a
  `maxRows`-style cap is §9).

## 8. Field shell + the one labeling divergence

Label/hint/error/counter reuse the `.ino-field` shell verbatim from `<ino-textarea>` (this repo
re-declares the shell per control; no shared SCSS infra — same note as textarea/input). **The
divergence:** a contenteditable `<div>` is not a labelable element, so `label[for]` cannot
associate. The label instead carries an `id` and the textbox div points back with
`aria-labelledby`; `<ino-label>` is rendered without `for`. Click-to-focus on the label (the
one thing `for` would have added) is restored by a `(click)` → `focus()` handler on the label
wrapper. `hint`/`error`/counter wire through `aria-describedby` exactly as textarea does.

Value contract: plain `@Input() value` (HTML string) / `@Output() valueChange` — banana-in-a-box,
no `ControlValueAccessor`, matching the repo-wide forms convention (see ino-input doc comment).
`valueChange` emits the sanitized `innerHTML` on every `input` event.

## 9. Out of scope (deliberate omissions — rendered on the docs page)

- **Mobile ports** — the §5 row is explicitly Web-only; no RN/Flutter disposition.
- **Inline code** — needs manual Range surgery; `code` ships as code *block* (§2).
- **Link popover editor** — `window.prompt` is the v1 URL capture (§2).
- **Images/tables/embeds, font/color pickers** — not in the §5 format set.
- **Undo/redo buttons** — native Ctrl/Cmd+Z/Y work via the browser's execCommand history;
  surfacing buttons adds no capability.
- **`maxRows`-style growth cap** and **auto-resize knobs** — the host constrains height.
- **Loading state** — §6.
- **`ControlValueAccessor`** — repo convention (§8).

## 10. Verification plan (§2 contract, point 8 evidence)

- Unit spec (`ino-editor.spec.ts`): sanitizer table (allowlist, normalizations,
  `javascript:` href rejection, script/style wholesale drop, attribute stripping), char-budget
  math (textContent counting, paste trim, formatting exempt), `describedBy` composition.
- Docs-page QA (QALead, the point-8 gate): 3 themes × dense/fluid screenshots, keyboard-only
  walkthrough (Tab → toolbar one stop → arrows rove → Tab → textbox → type/format → Tab out),
  SR spot-check on a format toggle (`aria-pressed` flip announced), paste from a Word/Docs
  source shows sanitized result, char limit at-limit behavior.
