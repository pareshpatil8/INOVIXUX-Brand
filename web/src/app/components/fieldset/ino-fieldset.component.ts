import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-fieldset>` — native `<fieldset>`/`<legend>` grouping wrapper for related form fields
 * (e.g. an address block, a KYB document-upload section), with an optional collapse/expand
 * disclosure on the legend. Parity benchmark: PrimeNG `Fieldset`. Spec seed: doc 26 §5 —
 * "legend + optional toggle", `collapsed` as the one new state.
 *
 * `collapsible` adds a `<button>` inside the `<legend>` (WAI-ARIA APG disclosure pattern:
 * `aria-expanded` + `aria-controls` pointing at the content region) instead of making the whole
 * component always-toggleable — most fieldsets (an address block) are pure grouping with no
 * disclosure at all. When `false` (default), the legend renders as plain text and `collapsed` is
 * inert.
 *
 * `size` ('sm' | 'md' | 'lg', default 'md') scales only the content region's own padding —
 * doc 26's row literally says "padding scales", not the full control-size height/font/icon/gap
 * set `ino-button`/`ino-input` read, because a fieldset has no single-line control height of its
 * own. Reads `--ino-control-padding-inline-roomy(-sm|-lg)` (control-size-scale.md §3's same
 * density-aware alias `ino-card`'s header/footer bars already use), so `[data-density]` composes
 * for free with no branch in this component. See SPEC.md §2.
 *
 * Native `<fieldset disabled>` cascades to every real descendant form control for free
 * (`disabled` input mirrors that onto the host attribute rather than reimplementing it).
 * `readonly` has no native fieldset meaning, so it is scoped to this component's own toggle
 * affordance only — the same "behavior-only, no corresponding ARIA attribute" treatment
 * `<ino-radio>`'s readonly uses, because `aria-readonly` is not a supported state on the
 * `group` role `<fieldset>` implicitly carries (unlike `radiogroup`, which `<ino-radio-group>`
 * explicitly opts into). See SPEC.md §3.
 *
 * `error` renders a message below the content (same shape as `<ino-radio-group>`'s `error`)
 * and wires `aria-describedby`/`aria-invalid` on the `<fieldset>` — both are global ARIA
 * properties, valid on `group`. `loading` dims the content and shows a centered spinner
 * (`aria-busy`), matching `<ino-card>`'s "keep content mounted, don't unmount it" treatment.
 * `empty` is deliberately not carried — see SPEC.md §4.
 */
@Component({
  selector: 'ino-fieldset',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-fieldset.component.html',
  styleUrl: './ino-fieldset.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoFieldsetComponent {
  @Input() legend = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input({ transform: booleanAttribute }) collapsible = false;
  @Input({ transform: booleanAttribute }) collapsed = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input() error = '';

  @Output() collapsedChange = new EventEmitter<boolean>();

  protected readonly contentId = `ino-fieldset-content-${++idCounter}`;
  protected readonly errorId = `ino-fieldset-error-${idCounter}`;

  onToggle(): void {
    if (this.disabled || this.readonly) {
      return;
    }
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }
}
