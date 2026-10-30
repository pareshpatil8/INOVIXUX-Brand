import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-panel>` — plain titled container with an optional collapse/expand disclosure and a
 * footer slot: portal section chrome, a KYB finding group, a settings block. Parity benchmark:
 * PrimeNG `Panel` ("a container component with an optional content toggle feature"). Spec seed:
 * doc 26 §5 — "plain titled container; collapsible; footer slot", `collapsed` as the one new
 * state. See SPEC.md.
 *
 * `collapsible` adds a `<button>` across the whole header bar (WAI-ARIA APG disclosure pattern:
 * `aria-expanded` + `aria-controls` pointing at the content region), the same toggle-only-on-
 * request shape `<ino-fieldset>` uses — most panels (a settings block) are static grouping with
 * no disclosure at all. When `false` (default), `header` renders as plain text and `collapsed`
 * is inert.
 *
 * `size` ('sm' | 'md' | 'lg', default 'md') scales the header/body/footer bars' shared
 * `--ino-control-padding-inline-roomy(-sm|-lg)` alias uniformly — doc 26's row says "padding
 * scales" as a single axis, unlike `<ino-card>`'s two independent `padding`/`size` knobs (see
 * SPEC.md §1). Reading the bare alias means `[data-density]` composes for free, no branch here.
 *
 * `disabled` dims the whole panel (opacity) and locks the collapse toggle; `readonly` locks only
 * the toggle, leaving the chrome fully legible — same "behavior-only, no corresponding ARIA
 * attribute" treatment `<ino-fieldset>`'s `readonly` uses (`region` has no readonly semantic any
 * more than `group` does). `loading` dims the body and shows a centered spinner (`aria-busy`),
 * matching `<ino-card>`/`<ino-fieldset>`'s "keep content mounted, don't unmount it" treatment.
 * `invalid`/`error` and `empty` are deliberately not carried — see SPEC.md §2.
 */
@Component({
  selector: 'ino-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-panel.component.html',
  styleUrl: './ino-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoPanelComponent {
  @Input() header = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input({ transform: booleanAttribute }) collapsible = false;
  @Input({ transform: booleanAttribute }) collapsed = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;

  @Output() collapsedChange = new EventEmitter<boolean>();

  protected readonly contentId = `ino-panel-content-${++idCounter}`;
  protected readonly headerId = `ino-panel-header-${idCounter}`;

  onToggle(): void {
    if (this.disabled || this.readonly) {
      return;
    }
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }
}
