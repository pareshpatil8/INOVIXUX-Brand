# ino-inputtags (Chips) — Component Specification

**Issue:** INO-418 (INO-31 Phase B1)  
**Contract:** doc 26 §2 Component Publish Contract (all 8 points)  
**PrimeNG mapping:** Chips (22.1.1)

---

## 1. Variants/Structure

### Free-entry tags
Users can type any text and press Enter, comma, or blur to add it as a tag. No pre-defined list is required—the component accepts arbitrary user input.

### Suggestions (autocomplete reuse)
While typing, a filtered dropdown of suggestions appears (reuses the overlay + filter pattern from `ino-autocomplete`). Users can:
- Continue typing and press Enter to add the typed text as-is
- Click or arrow-down + Enter to select a suggestion
- Press Escape to dismiss the dropdown without adding anything

### Max tags
`maxTags: number | null` (default `null`) hard-caps the number of tags. Once `value.length >= maxTags`:
- The input field dims and becomes non-interactive
- Existing tags can still be removed
- The dropdown never opens
- The `at-max` state is applied

### Per-tag validation
`validateTag: (tag: string) => boolean` callback runs on each tag as it's added. Tags that fail validation:
- Are still added to `value` (not rejected silently)
- Have `invalid: true` set
- Render with `--ino-color-danger-text-safe` label text and an `--ino-color-danger` border (INO-723:
  the chip fill stays `--ino-color-surface-raised` in both states — the invalid signal is the border
  and the label colour, not a red tint)
- Retain all normal chip behaviors (removable, keyboard-accessible)

---

## 2. States (beyond §2 standard set)

All components get the §2 standard states:
- default
- hover
- focus-visible
- active
- disabled
- readonly
- invalid/error (field-level)
- loading (N/A for this component)
- empty (when `value.length === 0`)

**Additional states specific to ino-inputtags:**

### tag-invalid
Individual chips with `invalid: true` (returned by `validateTag`) render with error styling. Does not block addition—invalid tags are added and rendered, not silently dropped.

### at-max
When `value.length >= maxTags` and `maxTags` is not null:
- Input dims and becomes non-interactive
- Dropdown never opens
- Existing chips remain removable
- The `.ino-inputtags--at-max` class is applied to the host

---

## 3. Sizing

- `sm`: compact tags, smaller input font
- `default` (md): baseline
- `lg`: larger tags, larger input font

Controlled via `size: InoControlSize` (`'sm' | 'default' | 'lg'`).

---

## 4. Labels

Full label set from `ino-label`:
- `label`: the field label (renders as `<ino-label>`)
- `required`: red asterisk marker
- `hint`: help text below the field
- `error`: error message (replaces hint when present)

All accessible via proper `for`, `id`, `aria-describedby` associations.

---

## 5. Accessibility

### Roles and semantics
- Input: `role="combobox"` with `aria-expanded` tracking dropdown state
- Chip list: `role="list"` with each chip as `role="listitem"`
- Suggestions dropdown: `role="listbox"` with each option as `role="option"`
- `aria-activedescendant` on input points to the active suggestion

### Keyboard map
- **Enter**: Add current input text as a tag, or select active suggestion if dropdown is open
- **Comma** (or custom separator): Add current input text as a tag
- **Backspace**: When input is empty, remove the last tag and announce "Removed {tag}"
- **Escape**: Close the suggestions dropdown
- **Arrow Down/Up**: Navigate suggestions
- **Tab**: Add current input (if `addOnBlur` is true), then blur

### Screen reader announcements
- Tag removal: "Removed {tag label}" announced via `role="status"` live region
- Invalid tags: `aria-invalid` on individual chips (though chips themselves are not form controls—this is a visual/semantic hint)
- Field-level error: `aria-describedby` points to error message, `aria-invalid="true"` on input when `error` is set

### WCAG 2.2 AA
- Contrast: `--ino-color-accent` / `--ino-color-danger` / `--ino-color-danger-text-safe` meet AA in all
  three themes, gated by `check-theme-parity`. (Before INO-723 this line named `--ino-color-primary` /
  `--ino-color-error`, which tokens.css never defined — so the claim that the gate covered them was
  false twice over. The gate now also asserts that every `var(--ino-*)` in this file resolves at all.)
- Focus indicators: `outline: var(--ino-focus-ring)` with `var(--ino-focus-ring-offset)` on the field
  (`:focus-within`) and on chip remove buttons; the invalid field's focus ring is `--ino-invalid-ring`
- Label association: `<ino-label>` with `for` pointing to `inputId`

---

## 6. Notes

### Deliberate omissions
- **No built-in async fetch**: Unlike `ino-autocomplete`, this component does not emit a debounced `search` event by default. If you need server-side suggestions, listen to the `search` output and update `suggestions` externally (same contract as `ino-autocomplete`).
- **No grouping**: Suggestions do not support `option.group` (unlike `ino-autocomplete` and `ino-select`). The use case for grouped tag suggestions is weak, and the implementation cost is non-trivial. If you need it, file a follow-up.
- **No `forceSelection`**: All typed input can be added as a tag—there is no mode that rejects free-text and requires picking from suggestions. Use `validateTag` if you want to mark certain tags invalid.

### PrimeNG mapping
- PrimeNG component: **Chips** (22.1.1)
- PrimeNG `max` → our `maxTags`
- PrimeNG `allowDuplicate` → our `allowDuplicates`
- PrimeNG `addOnBlur` → same name here
- PrimeNG `separator` → our `separators` (string of separator chars, not a single char)
- **Difference**: PrimeNG Chips has no built-in autocomplete. We add it as a first-class feature (via `suggestions` input).

### Mobile disposition
**Port both**: React Native and Flutter implementations with the same tag-add/remove/validate contract. Mobile platforms get:
- Native chip rendering (Material chips on Android, iOS-native chips on iOS)
- Platform keyboard handling (Return key to add, Backspace to remove)
- Accessibility: TalkBack/VoiceOver announcements for tag removal

---

## 7. API Surface

### Inputs
- `label: string` — field label
- `value: InoInputTagsTag[]` — array of tags (each: `{value, label, invalid?}`)
- `suggestions: InoInputTagsOption[]` — autocomplete suggestions
- `placeholder: string` — shown when no tags exist
- `hint: string` — help text
- `error: string` — error message (replaces hint)
- `size: InoControlSize` — `'sm' | 'default' | 'lg'`
- `required: boolean` — shows required marker
- `disabled: boolean` — dims and disables all interaction
- `readonly: boolean` — prevents adding/removing tags
- `allowDuplicates: boolean` — default `false` (adding a duplicate is a silent no-op)
- `addOnBlur: boolean` — default `true` (blur adds current input as a tag)
- `maxTags: number | null` — hard cap on tag count
- `validateTag: ((tag: string) => boolean) | null` — per-tag validation callback
- `separators: string` — characters that trigger tag addition (default `','`)

### Outputs
- `valueChange: EventEmitter<InoInputTagsTag[]>` — emits on add/remove
- `tagAdd: EventEmitter<InoInputTagsTag>` — emits when a tag is added
- `tagRemove: EventEmitter<InoInputTagsTag>` — emits when a tag is removed
- `search: EventEmitter<string>` — debounced input text (for async suggestion fetch)

### Content children
- `#suggestionTemplate` — custom rendering for one suggestion row
- `#chipTemplate` — custom rendering for one chip

### Types
```typescript
export interface InoInputTagsOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface InoInputTagsTag {
  value: string;
  label: string;
  invalid?: boolean;
}
```

---

## 8. Implementation notes

### Autocomplete reuse
The dropdown + filter + keyboard navigation logic is adapted from `ino-autocomplete`:
- Same `aria-activedescendant` model
- Same `recomputeFiltered()` pattern
- Same `moveActive(delta)` / arrow key handling
- **Different**: no `multiple` mode, no `forceSelection`, no virtual scroll (tag suggestion lists are typically small)

### Tag structure
Unlike `ino-autocomplete`'s `value: string | string[]`, this component's `value` is always `InoInputTagsTag[]` (an array of objects, not strings). Each tag carries:
- `value`: the tag's data value
- `label`: the display text (usually same as `value`, but allows for custom rendering)
- `invalid`: set by `validateTag`, triggers error styling

### Backspace removal
When the input is empty and the user presses Backspace, the last tag is removed and announced via a live region. This is the APG pattern for chip inputs—no custom keyboard combo required.

### Blur behavior
By default (`addOnBlur: true`), blurring the input adds the current text as a tag. Set `addOnBlur: false` if you want blur to discard the typed text instead (matches PrimeNG's default, but our default is `true` because it's more forgiving).

---

## 9. Testing checklist (QA sign-off gate)

Per doc 26 §2, the QA validation subtask on INO-418 signs off on:
- [ ] All 3 themes (light, dark, high-contrast) render correctly in dense + fluid
- [ ] Sizing (sm/md/lg) tested
- [ ] States: default, hover, focus, disabled, readonly, error, at-max, tag-invalid
- [ ] Keyboard: Enter to add, Backspace to remove last, Escape to close, Arrow keys to navigate
- [ ] Screen reader: tag removal announced, error message associated, suggestions navigable
- [ ] Validation: `validateTag` callback marks invalid tags, does not block addition
- [ ] Max tags: input dims and becomes non-interactive when limit reached
- [ ] Duplicates: `allowDuplicates: false` prevents adding duplicates
- [ ] Suggestions: dropdown filters, selectable via click or Enter
- [ ] Contrast: AA in all 3 themes (automated via `check-theme-parity`)
- [ ] Mobile ports: React Native + Flutter implementations tested
