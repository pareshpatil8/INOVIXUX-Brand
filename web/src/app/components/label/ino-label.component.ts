import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

export type InoLabelSize = 'sm' | 'default' | 'lg';

/**
 * `<ino-label>` — the reusable form-label leaf, extracted so `ino-input`/`ino-select` and every
 * future Tier-1 form control bind to one audited label instead of each hand-rolling its own
 * `<label for>` markup (which is what `ino-input`/`ino-select` still do pre-extraction — this
 * component does not retrofit them; see SPEC.md §4). Contract:
 * docs/brand/06-angular-components/label.md.
 *
 * `size` maps 1:1 onto `InoControlSize` (`../control-size.ts`) — `label-lg`/`label`/`label-sm`
 * (tokens.css §4b, INO-125/W0-3) — so a form control's own `size` input can drive its label's size
 * for free, the same handoff `form-label-tokens.md` §2 documents.
 *
 * Presentational, non-interactive by design: a `<label for>` is never itself in the tab order and
 * draws no focus ring of its own — clicking it natively moves focus to (or toggles) the control it
 * names, which is that control's own audited state, not this component's. See SPEC.md §1 for why
 * hover/active/focus-visible/loading are deliberately not part of this component's state set.
 */
@Component({
  selector: 'ino-label',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-label.component.html',
  styleUrl: './ino-label.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-label',
    '[attr.data-size]': 'size',
    '[class.ino-label--disabled]': 'disabled',
    '[class.ino-label--invalid]': 'invalid',
    '[class.ino-label--readonly]': 'readonly',
  },
})
export class InoLabelComponent {
  /** Native `for`/`id` association — the accessible-name link to the control this label names. */
  @Input('for') htmlFor = '';
  @Input() size: InoLabelSize = 'default';
  /** Decorative `*` marker only (DoD row 8 / SPEC.md §3) — callers must still set
   *  `aria-required`/"required" wording on the control itself; colour alone never carries meaning. */
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  /** Labels a readonly field — resolves to `--ino-color-label-muted`, the same role
   *  `form-label-tokens.md` §4 names for "labels on a readonly field". */
  @Input({ transform: booleanAttribute }) readonly = false;
}
