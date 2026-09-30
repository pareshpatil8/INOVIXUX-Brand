import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

let idCounter = 0;

/** A single row in the policy hint panel; `test` decides the met/unmet checkmark state live. */
export interface InoPasswordPolicyRule {
  label: string;
  test: (value: string) => boolean;
}

/** Reference rule set the docs page demos — length 8+, upper+lower, a digit, a symbol. Not applied
 * by default (an unset `policyRules` hides the panel entirely, same opt-in shape `ino-input`'s
 * icon slots use) — a caller opts in by passing this or its own rules. */
export const INO_PASSWORD_DEFAULT_POLICY_RULES: InoPasswordPolicyRule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'Upper and lower case letters', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: 'At least one number', test: (v) => /\d/.test(v) },
  { label: 'At least one symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/** 0-4 score from length + character-class coverage. Deliberately not pluggable (unlike
 * `policyRules`) — the meter is a single built-in heuristic, not a policy statement; the policy
 * hint panel is the customizable surface for actual requirements. */
function scorePassword(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (value.length >= 12) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

/**
 * `<ino-password>` — labeled password control with a reveal toggle, an optional strength meter,
 * and an optional policy hint panel. Contract: INO-406 (INO-31 Phase B1, doc 26 §5 row
 * `ino-password`), promoted from the `<ino-input type="password">` partial (bare input, no
 * reveal/meter/hints) per that row's Notes column.
 *
 * Structure and `@Input`/`@Output` conventions mirror `ino-input` (banana-in-a-box `value`/
 * `valueChange`, not a `ControlValueAccessor` — see that component's doc comment) rather than
 * wrapping it, because the reveal-toggle button lives inside `.ino-field__control-wrap` the same
 * way `ino-select`'s trigger does, which needs the control markup declared directly in this
 * component's own template.
 *
 * WCAG 2.2: the reveal toggle is a real `<button type="button">` with an `aria-label` that flips
 * between "Show password"/"Hide password" and `aria-pressed` reflecting revealed state — never an
 * icon alone. The strength meter sits in an `aria-live="polite"` region so screen reader users
 * hear the strength label update as they type, without interrupting mid-keystroke the way
 * `assertive` would. The caps-lock warning uses `role="status"` (implicit polite live region) so
 * it's announced once when it appears, not re-announced on every keystroke while it stays visible.
 */
@Component({
  selector: 'ino-password',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-password.component.html',
  styleUrl: './ino-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-password',
    '[attr.data-size]': 'size',
  },
})
export class InoPasswordComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  /** Strength meter on/off (doc 26 §5 Variants/Structure). Defaults on — the row names it as the
   * component's headline structural variant, not an opt-in extra. */
  @Input({ transform: booleanAttribute }) showStrengthMeter = true;
  /** Policy hint panel rows. Empty (default) hides the panel — same opt-in shape as `ino-input`'s
   * icon slots; pass `INO_PASSWORD_DEFAULT_POLICY_RULES` or a caller-defined list to show it. */
  @Input() policyRules: InoPasswordPolicyRule[] = [];

  @Output() valueChange = new EventEmitter<string>();

  protected readonly inputId = `ino-password-${++idCounter}`;
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly errorId = `${this.inputId}-error`;
  protected readonly meterId = `${this.inputId}-meter`;
  protected readonly policyId = `${this.inputId}-policy`;

  protected revealed = false;
  protected capsLockOn = false;

  protected readonly meterSegments = [0, 1, 2, 3] as const;

  protected get strengthScore(): 0 | 1 | 2 | 3 | 4 {
    return scorePassword(this.value);
  }

  protected get strengthLabel(): string {
    return STRENGTH_LABELS[this.strengthScore];
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.valueChange.emit(value);
  }

  toggleReveal(): void {
    this.revealed = !this.revealed;
  }

  onKeyEvent(event: KeyboardEvent): void {
    this.capsLockOn = typeof event.getModifierState === 'function' && event.getModifierState('CapsLock');
  }

  onBlur(): void {
    // Caps Lock state is only meaningful while the field is focused and being typed into.
    this.capsLockOn = false;
  }

  isRuleMet(rule: InoPasswordPolicyRule): boolean {
    return rule.test(this.value);
  }
}
