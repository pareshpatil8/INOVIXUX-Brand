import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

let idCounter = 0;

export type InoInputVariant = 'outline' | 'filled';

/**
 * `<ino-input>` — labeled single-line text control. Contract: INO-83 (split from INO-31 §8 build
 * order #1), uplifted under INO-157 (INO-31 U-2) with the size API, `filled` variant, and explicit
 * invalid/readonly/loading states. Plain `@Input() value` / `@Output() valueChange`
 * (banana-in-a-box), not a `ControlValueAccessor` — matches this repo's existing convention (no
 * Reactive/Template-driven Forms module is wired up anywhere yet); revisit as a CVA once a real
 * form actually needs one.
 *
 * Icon slots are deliberately **not** an `@Input() icon` on this component — the sanctioned
 * mechanism is wrapping with `<ino-icon-field>` (T-16, built under INO-318) for a leading/trailing
 * icon, or `<ino-input-group>` (T-17, built under INO-318) for a prefix/suffix addon. Baking icon
 * markup into every Tier-1 form control would mean re-auditing icon padding/positioning per
 * component; see SPEC.md §1.
 *
 * WCAG 2.2: label is a real `<label for>`, not a placeholder-only control; error state sets
 * `aria-invalid` and wires the error text in via `aria-describedby` (hint text the same way when
 * there's no error) so a screen reader announces it on focus, not just visually via red border.
 * `readonly` uses the native `readonly` attribute (not `disabled`) so the control stays focusable
 * and its value stays announced/selectable/copyable — see SPEC.md §2. `loading` mirrors
 * `ino-button`'s contract: an inert spinner plus `aria-busy`, and the control is made
 * non-editable (native `readonly`) for the duration without removing focusability or the value
 * from the DOM.
 */
@Component({
  selector: 'ino-input',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-input.component.html',
  styleUrl: './ino-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-input',
    '[attr.data-size]': 'size',
    '[class.ino-input--filled]': "variant === 'filled'",
    '[class.ino-input--loading]': 'loading',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoInputComponent {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' = 'text';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input() variant: InoInputVariant = 'outline';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;

  @Output() valueChange = new EventEmitter<string>();

  protected readonly inputId = `ino-input-${++idCounter}`;
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly errorId = `${this.inputId}-error`;

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.valueChange.emit(value);
  }
}
