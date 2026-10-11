# `<ino-inputtags>` — InputTags (Chips)

> Parity benchmark: PrimeNG 22.1.1 `Chips` (`specs/primeng/llms-22.1.1.txt`,
> `https://primeng.dev/chips`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
> here installs it.
>
> Decisions record: `web/src/app/components/inputtags/SPEC.md`.
> Issue: INO-418 (INO-31 Phase B1, Form & input track).

A free-entry tag/chip input with autocomplete suggestions. Users can type arbitrary text and press
Enter/comma/blur to add it as a tag, or pick from a filtered suggestion dropdown. Each tag renders
as a removable chip; Backspace removes the last one when the input is empty. Supports per-tag
validation, max tags limit, and full WCAG 2.2 AA accessibility.

---

## Variants

| Variant | Description | Surface |
|---|---|---|
| Free-entry tags | Type any text, press Enter/comma to add | default behavior |
| With suggestions | Autocomplete dropdown while typing | `[suggestions]="options"` |
| Max tags | Hard cap on number of tags | `[maxTags]="5"` |
| Per-tag validation | Mark individual tags invalid | `[validateTag]="validator"` |
| Allow duplicates | Permit duplicate tag values | `[allowDuplicates]="true"` |
| Add on blur | Add current input text when field loses focus | `[addOnBlur]="true"` (default) |
| Custom separators | Characters that trigger tag addition | `separators=",;"` |

---

## Tag addition behavior

Tags can be added in multiple ways:

| Action | Behavior |
|---|---|
| Press Enter | Adds current input text as a tag |
| Type separator character (`,` by default) | Adds current input text as a tag |
| Blur (if `addOnBlur` is true) | Adds current input text as a tag |
| Select from suggestions dropdown | Click or arrow-down + Enter to add |

**Duplicate handling:** When `allowDuplicates` is false (default), attempting to add a tag that
already exists (by `value`) is silently ignored. Set `allowDuplicates="true"` to permit duplicates.

**Validation:** If `validateTag` callback is provided, it runs on each tag as it's added. Tags that
fail validation are still added (not rejected silently), but marked with `invalid: true` and styled
with error colors + border.

---

## Suggestions (autocomplete)

The component reuses the autocomplete overlay pattern from `<ino-autocomplete>`:
- Typing in the input filters `suggestions` by label (case-insensitive substring match)
- Arrow Up/Down navigate the filtered list
- Enter selects the active suggestion
- Click on a suggestion to select it
- Escape closes the dropdown without adding anything

**No built-in async fetch:** The component does not fetch suggestions itself. If you need
server-side suggestions, listen to the `(search)` output (debounced by 250ms) and update
`[suggestions]` externally:

```typescript
onSearch(query: string): void {
  this.fetchSuggestions(query).subscribe(results => {
    this.suggestions = results;
  });
}
```

---

## Keyboard contract

| Key | Behavior |
|---|---|
| Enter | Add current input as a tag, or select active suggestion if dropdown is open |
| Comma (or custom separator) | Add current input as a tag |
| Backspace | When input is empty, remove the last tag and announce "Removed {tag}" |
| Escape | Close the suggestions dropdown |
| Arrow Down | Navigate to next suggestion (opens dropdown if closed) |
| Arrow Up | Navigate to previous suggestion |
| Tab | Add current input (if `addOnBlur` is true), then blur |

---

## States

| State | Surface | Implementation |
|---|---|---|
| Default | outlined field with chips inside | default |
| Hover | border color changes | `:hover:not(.ino-inputtags__field--disabled)` |
| Focus-visible | accent border + focus ring | `:focus-within` |
| Disabled | 0.6 opacity, `not-allowed` cursor | `[disabled]="true"` |
| Readonly | readonly background, chips not removable | `[readonly]="true"` |
| Invalid/error | danger border, error text below | `error="..."` |
| Empty | when `value.length === 0`, shows full placeholder | auto-applied |
| At-max | input dims, non-interactive when `value.length >= maxTags` | `.ino-inputtags--at-max` host class |
| Tag-invalid | individual chip with error styling | `validateTag` returns false for that tag |

---

## Sizing

`size="sm" | "default" | "lg"` scales:
- Chip height and padding
- Input font size
- Tag label font size

Same pattern as `ino-input` and other form controls. Density (dense/fluid) is controlled by
`--ino-row-min-height` from an ancestor scope.

---

## Accessibility contract

**Role / ARIA:**
- Input: `role="combobox"` with `aria-expanded` tracking dropdown state
- Chip list: `role="list"` with each chip as `role="listitem"`
- Suggestions dropdown: `role="listbox"` with each option as `role="option"`
- `aria-activedescendant` on input points to the active suggestion

**Keyboard support:** See "Keyboard contract" above. All navigation, selection, and removal actions
are keyboard-accessible.

**Screen reader announcements:**
- Tag removal: "Removed {tag label}" announced via `role="status"` live region
- Error message: `aria-describedby` points to error text, `aria-invalid="true"` when `error` is set

**Focus indicators:** Focus ring on input field, visible focus on chip remove buttons (`:focus-visible`).

**WCAG 2.2 AA:**
- Contrast: `--ino-color-primary` / `--ino-color-error` tokens meet AA (gated by `check-theme-parity`)
- All interactive elements keyboard-accessible
- All state changes announced to screen readers

---

## Labels

Full label set from `<ino-label>`:
- `label` — field label (associated via `for` / `id`)
- `required` — red asterisk marker
- `hint` — help text below field
- `error` — error message (replaces hint when present)

---

## Mobile ports

**React Native:** `InoInputTags` component in `mobile/react-native/src/components/InoInputTags.tsx`
**Flutter:** `InoInputTags` widget in `mobile/flutter/lib/widgets/ino_inputtags.dart`

Both ports implement the same tag-add/remove/validate contract with platform-native chips and
accessibility (TalkBack/VoiceOver).

---

## API Surface

### Inputs
- `label: string` — field label
- `value: InoInputTagsTag[]` — array of tags (each: `{value, label, invalid?}`)
- `suggestions: InoInputTagsOption[]` — autocomplete suggestions
- `placeholder: string` — shown when no tags exist (default: `'Add tags…'`)
- `hint: string` — help text
- `error: string` — error message (replaces hint)
- `size: InoControlSize` — `'sm' | 'default' | 'lg'`
- `required: boolean` — shows required marker
- `disabled: boolean` — dims and disables all interaction
- `readonly: boolean` — prevents adding/removing tags
- `allowDuplicates: boolean` — default `false` (adding a duplicate is a silent no-op)
- `addOnBlur: boolean` — default `true` (blur adds current input as a tag)
- `maxTags: number | null` — hard cap on tag count (default `null`)
- `validateTag: ((tag: string) => boolean) | null` — per-tag validation callback
- `separators: string` — characters that trigger tag addition (default `','`)

### Outputs
- `(valueChange)` — emits `InoInputTagsTag[]` on add/remove
- `(tagAdd)` — emits `InoInputTagsTag` when a tag is added
- `(tagRemove)` — emits `InoInputTagsTag` when a tag is removed
- `(search)` — emits `string` (debounced input text, for async suggestion fetch)

### Content children
- `#suggestionTemplate` — custom rendering for one suggestion row (context: `{$implicit: InoInputTagsOption}`)
- `#chipTemplate` — custom rendering for one chip (context: `{$implicit: InoInputTagsTag}`)

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

## Example usage

### Basic free-entry tags
```html
<ino-inputtags
  label="Skills"
  [value]="skills"
  (valueChange)="skills = $event"
  placeholder="Add your skills">
</ino-inputtags>
```

### With suggestions
```html
<ino-inputtags
  label="Programming languages"
  [value]="languages"
  [suggestions]="languageSuggestions"
  (valueChange)="languages = $event"
  (search)="onSearch($event)">
</ino-inputtags>
```

### With validation
```typescript
emailValidator(tag: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tag);
}
```

```html
<ino-inputtags
  label="Email addresses"
  [value]="emails"
  [validateTag]="emailValidator"
  (valueChange)="emails = $event"
  placeholder="Add email addresses">
</ino-inputtags>
```

### Max tags limit
```html
<ino-inputtags
  label="Top 3 priorities"
  [value]="priorities"
  [maxTags]="3"
  (valueChange)="priorities = $event">
</ino-inputtags>
```

---

## Deliberate omissions

- **No grouping:** Suggestions do not support `option.group` (unlike `ino-autocomplete`). The use
  case for grouped tag suggestions is weak.
- **No `forceSelection`:** All typed input can be added as a tag—there is no mode that rejects
  free-text and requires picking from suggestions. Use `validateTag` if you want to mark certain
  tags invalid.
- **No built-in async fetch:** Listen to the `(search)` output and update `[suggestions]`
  externally (same contract as `ino-autocomplete`).

---

## Contrast with PrimeNG Chips

| Feature | PrimeNG Chips | Our `ino-inputtags` |
|---|---|---|
| Free-entry tags | ✓ | ✓ |
| Max tags | `max` prop | `maxTags` prop |
| Duplicates | `allowDuplicate` | `allowDuplicates` |
| Separators | single char | string of chars (`separators=",;"`) |
| Autocomplete | ✗ (no built-in) | ✓ (via `suggestions` input) |
| Per-tag validation | ✗ | ✓ (via `validateTag` callback) |
| Add on blur | `addOnBlur` | same |
| Custom chip rendering | template | `#chipTemplate` |
