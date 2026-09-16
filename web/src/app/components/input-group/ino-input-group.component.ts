import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

/**
 * `<ino-input-group>` — the general prefix/suffix ADDON mechanism for form controls (INO-139,
 * INO-31 T-17). Distinct from `<ino-icon-field>` (T-16): IconField is a lightweight icon-only
 * wrapper; InputGroup is the classic "glue separate interactive elements to a control" pattern
 * (Bootstrap's `.input-group`, PrimeNG's `InputGroup`/`InputGroupAddon`) — text labels, buttons,
 * checkboxes/radios, or several of any of those, on either side of a control, presented as one
 * visually-bordered unit.
 *
 * Usage:
 * ```html
 * <ino-input-group>
 *   <span groupAddonStart>$</span>
 *   <ino-input placeholder="0.00" />
 *   <span groupAddonEnd>.00</span>
 * </ino-input-group>
 *
 * <ino-input-group>
 *   <input groupAddonStart type="checkbox" aria-label="Select row" />
 *   <ino-input placeholder="Company name" />
 * </ino-input-group>
 *
 * <ino-input-group>
 *   <ino-input placeholder="Search" />
 *   <button groupAddonEnd type="button" ino-button variant="ghost">Clear</button>
 *   <button groupAddonEnd type="button" ino-button variant="primary">Search</button>
 * </ino-input-group>
 * ```
 *
 * `[groupAddonStart]` / `[groupAddonEnd]` are plain attribute selectors on `<ng-content>` — not
 * sub-components — so any real element (a `<span>` of text, a native `<button>`/`ino-button`, a
 * native `<input type="checkbox">`/`<input type="radio">`, a `<select>`) can be dropped in. The
 * projected control itself goes in the DEFAULT slot (no attribute). Angular projects EVERY element
 * that matches a given `<ng-content select>` into that one outlet, in template order — so "more
 * than one addon on the same side" (multi-addon groups: two buttons, or a select + text prefix)
 * falls out of the same two slots with no extra API; nothing distinguishes "one addon" from "many"
 * beyond how many elements the caller marks with the same attribute.
 *
 * Layout is the same 3-column CSS Grid `<ino-icon-field>` uses (`auto minmax(0, 1fr) auto`), for
 * the identical structural reason documented in that component: this repo bans `::ng-deep` (no
 * sanctioned override mechanism yet), and under Angular's Emulated view encapsulation a selector
 * authored in THIS stylesheet can never match a projected element — it carries the CONSUMER
 * template's scoping attribute, not this component's. That rules out reaching into a projected
 * addon to strip its own border-radius/border the way Bootstrap's `.input-group` (all sibling CSS
 * in one stylesheet) or PrimeNG's `InputGroupAddon` (all siblings in one library) can. See SPEC.md
 * §1 for the full reasoning and why this component deliberately does NOT attempt Bootstrap's
 * corner-stripping/border-collapsing trick.
 *
 * What this component CAN do without reaching into projected content — because CSS custom
 * property and inherited-property (`color`, `font-*`) resolution follows the real DOM tree and is
 * completely unaffected by Emulated encapsulation's selector-matching restriction — is:
 *   1. Draw ONE shared border/radius/background frame on its own `:host`, visually matching
 *      `ino-input`'s own border treatment (same `--ino-color-border` / `--ino-radius-md` /
 *      `--ino-color-surface-sunken` tokens) so the group reads as a natural superset of a bare
 *      input's own frame, not a mismatched box (DoD row 5).
 *   2. Recolor that shared frame on `:focus-within` (the projected control has focus) and via an
 *      `invalid` `@Input` (caller-mirrored, same pattern as `disabled` below) — mirroring
 *      `ino-icon-field`'s `:focus-within` color-echo pattern, applied to a real border this time
 *      instead of icon color, per SPEC.md §5.
 *   3. Give plain projected TEXT addons (e.g. `<span groupAddonStart>$</span>`) the right
 *      typography for free: `color`/`font-family`/`font-size` set on this component's own
 *      `.ino-input-group__addon-*` wrapper are INHERITED properties, so a projected text node or
 *      plain `<span>` picks them up automatically (no selector needed) unless the addon is itself
 *      a styled interactive element (`ino-button`, `<input>`) that sets its own explicit color —
 *      those simply keep looking like themselves, which is correct: "button/checkbox/radio addons
 *      keep their own native semantics — the group just supplies layout."
 *
 * `disabled` / `readonly` / `invalid` / `loading` are caller-mirrored flags (this wrapper has no
 * native control of its own to read any of those states from) — same shape as
 * `<ino-icon-field>`'s `disabled`. Callers set the matching state on the wrapped control too;
 * this component only affects the shared frame's presentation and `aria-*` reflection on the
 * wrapper for AT that walks it.
 *
 * `size` re-points the Wave 0 `--ino-control-*` aliases (INO-124) this component reads
 * (`--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-gap`,
 * `--ino-control-font-size`) — density (`[data-density="dense"|"fluid"]`) falls out for free
 * because those aliases are themselves re-resolved per density in tokens.css §12, same as every
 * other Wave-1/2 component; no density branch of its own here.
 *
 * Accessibility: the host carries `role="group"` ONLY when a caller supplies `label` (an
 * `@Input`, reflected as `aria-label`) — a bare grouping role with no accessible name is
 * announced as "group" with nothing to distinguish it, which is worse than no role at all, and
 * the projected control almost always already carries its own `<label for>`/accessible name that
 * a group-level label would just duplicate. `label` exists for the rarer case where the GROUP as
 * a whole (not the individual control) needs naming for AT — e.g. a "select row" checkbox +
 * company-name input read together. Addon `<button>`s are real `<button>` elements the caller
 * writes directly (this component renders none of its own), so they keep native keyboard
 * operability, `:focus-visible`, and semantics with zero extra work here.
 */
@Component({
  selector: 'ino-input-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-input-group.component.html',
  styleUrl: './ino-input-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-input-group',
    '[class.ino-input-group--sm]': "size === 'sm'",
    '[class.ino-input-group--lg]': "size === 'lg'",
    '[attr.role]': 'label ? "group" : null',
    '[attr.aria-label]': 'label || null',
    '[attr.data-disabled]': 'disabled || null',
    '[attr.data-readonly]': 'readonly || null',
    '[attr.data-invalid]': 'invalid || null',
    '[attr.data-busy]': 'loading || null',
    '[attr.aria-disabled]': 'disabled || null',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoInputGroupComponent {
  @Input() size: InoControlSize = 'default';

  /**
   * Optional accessible name for the GROUP as a whole (reflected as `aria-label` + `role="group"`
   * — the role is only added when this is set, see the class doc comment). Leave unset when the
   * projected control already carries its own label; that is the common case and this default
   * avoids ever duplicating it.
   */
  @Input() label = '';

  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) loading = false;
}
