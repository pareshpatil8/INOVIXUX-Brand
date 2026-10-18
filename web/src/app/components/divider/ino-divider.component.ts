import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type InoDividerOrientation = 'horizontal' | 'vertical';
export type InoDividerThickness = 'hairline' | 'thick';

/**
 * `<ino-divider>` — a line that groups or separates content, WAI-ARIA `separator` pattern
 * (`role="separator"`, PrimeNG `Divider` parity benchmark). Doc 26 §5 row: horizontal/vertical,
 * optional centered label, thickness tokens, no interactive states (`St: n/a`).
 *
 * `orientation` drives layout (horizontal = full inline-size line; vertical = full block-size
 * line, meant for flex/grid siblings) and `[attr.aria-orientation]` — omitted for `horizontal`
 * since that is `separator`'s implicit APG default, the same "only write the non-default
 * attribute" convention `ino-toggle-button`'s `ariaLabel` uses.
 *
 * `label` renders centered text inline with the line (horizontal only — see SPEC.md §1); the
 * host keeps `role="separator"` either way, text content included, rather than switching to
 * `role="group"` for the labelled case — see SPEC.md §2.
 *
 * `thickness` reads the shared `--ino-border-width-{hairline,thick}` tokens (tokens.css §6b,
 * added with this component) rather than a bespoke divider-only value — the component's only
 * sizing axis per doc 26 §5. Not density-dependent: see SPEC.md §3.
 *
 * Contract: web/src/app/components/divider/SPEC.md.
 */
@Component({
  selector: 'ino-divider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-divider.component.html',
  styleUrl: './ino-divider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-divider',
    role: 'separator',
    '[attr.aria-orientation]': "orientation === 'vertical' ? 'vertical' : null",
    '[attr.data-orientation]': 'orientation',
    '[attr.data-thickness]': 'thickness',
    '[class.ino-divider--labelled]': 'label',
  },
})
export class InoDividerComponent {
  @Input() orientation: InoDividerOrientation = 'horizontal';
  @Input() thickness: InoDividerThickness = 'hairline';
  @Input() label = '';
}
