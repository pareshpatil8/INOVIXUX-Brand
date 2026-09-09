import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-input>` — labeled single-line text control. Contract: INO-83 (split from INO-31 §8 build
 * order #1). Plain `@Input() value` / `@Output() valueChange` (banana-in-a-box), not a
 * `ControlValueAccessor` — matches this repo's existing convention (no Reactive/Template-driven
 * Forms module is wired up anywhere yet); revisit as a CVA once a real form actually needs one.
 *
 * WCAG 2.2: label is a real `<label for>`, not a placeholder-only control; error state sets
 * `aria-invalid` and wires the error text in via `aria-describedby` (hint text the same way when
 * there's no error) so a screen reader announces it on focus, not just visually via red border.
 * Control height is `--ino-target-comfortable` per 09-design-system-standards.md §4/§5.
 */
@Component({
  selector: 'ino-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-input.component.html',
  styleUrl: './ino-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoInputComponent {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' = 'text';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() required = false;
  @Input() disabled = false;

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
