import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Ordered low → high severity, `info` (W0-6/INO-128) is the non-alarming fourth register —
 *  same closed union shape as `InoAlertStatus`, renamed to the RAG vocabulary this component
 *  actually serves (a risk flag is never "success"/"warning"/"danger", it is low/medium/high). */
export type InoTagSeverity = 'info' | 'low' | 'medium' | 'high';
export type InoTagSize = 'sm' | 'default' | 'lg';

const SEVERITY_LABEL: Record<InoTagSeverity, string> = {
  info: 'Info',
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};

/**
 * `<ino-tag>` — the shared RAG-risk-flag chip, extracted out of `ino-metric-panel` (INO-143) so
 * table cells, filter bars and detail headers can all render the same audited severity chip
 * instead of re-deriving one from raw color. Contract: docs/brand/06-angular-components/tag.md.
 *
 * `severity` is a closed 4-member union, not a raw color `@Input`, for the same reason as
 * `ino-alert`'s `status`: resolving it to a token pair happens entirely in this component's SCSS
 * (`--ino-color-risk-{low,medium,high}-fill/-on-fill/-dot` for the three RAG levels,
 * `--ino-color-info/-on-info` for the fourth). `high`/`medium`/`low` reuse the RAG tokens
 * `ino-metric-panel` already used (tokens.css §3); `info` reuses the alert/toast `info` pair added
 * in W0-6 rather than inventing a fourth risk-* token — tokens.css is frozen after Wave 0, and
 * every value this component needs already exists.
 *
 * Presentational and non-interactive by design, matching the PrimeNG `Tag` benchmark (no built-in
 * dismiss/click — that is `Chip`, a different, not-yet-built component). See SPEC.md §1 for why
 * `hover`/`active`/`focus-visible`/`readonly` are deliberately not part of this component's state
 * set rather than silently missing from it.
 *
 * `dot` renders the RAG level as a bare status dot (the `ino-metric-panel` row form) with the
 * severity label moved to a screen-reader-only node, so the accessible name survives even when the
 * visual form carries no text — see SPEC.md §2.
 */
@Component({
  selector: 'ino-tag',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-tag.component.html',
  styleUrl: './ino-tag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-tag',
    '[attr.data-severity]': 'severity',
    '[attr.data-size]': 'size',
    '[class.ino-tag--rounded]': 'rounded',
    '[class.ino-tag--dot]': 'dot',
    '[class.ino-tag--disabled]': 'disabled',
    '[class.ino-tag--loading]': 'loading',
    '[attr.aria-busy]': 'loading || null',
    '[attr.aria-disabled]': 'disabled || null',
  },
})
export class InoTagComponent {
  @Input() severity: InoTagSeverity = 'info';
  @Input() size: InoTagSize = 'default';
  @Input() value = '';
  @Input({ transform: booleanAttribute }) rounded = false;
  @Input({ transform: booleanAttribute }) dot = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;

  protected readonly severityLabel = SEVERITY_LABEL;
}
