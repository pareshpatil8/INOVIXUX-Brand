import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoPasswordComponent,
  INO_PASSWORD_DEFAULT_POLICY_RULES,
} from '../../../../components/password/ino-password.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-password` (INO-691, fixing INO-407 QA
 * gaps). Mounted in place of the generic props-driven grid on `/docs/components/password` via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) — the generic renderer forces `showStrengthMeter` to
 * `false` (boolean `defaultValueFor()` ignores declared `@Input` defaults), can never render the
 * policy hint panel (`policyRules` defaults to `[]`), never renders a Size axis (`size` is a
 * type-alias input), and never demonstrates label/hint/error text (all forced to `''`). This demo
 * supplies explicit defaults matching the component's documented contract, strength meter
 * progression, policy hint panel with real rules, error state, and sizing variants (sm/lg) that the
 * generic Sizing row renderer cannot produce.
 */
@Component({
  selector: 'app-password-demo',
  standalone: true,
  imports: [CommonModule, InoPasswordComponent],
  templateUrl: './password-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordDemoComponent {
  protected readonly policyRules = INO_PASSWORD_DEFAULT_POLICY_RULES;

  // Default — showStrengthMeter=true (component's real default), with a realistic label
  protected defaultValue = '';

  // Strength meter progression — values showing different strength scores
  protected weakValue = 'weak';
  protected fairValue = 'Fair123';
  protected goodValue = 'Good@Pass1';
  protected strongValue = 'Strong@Pass123';

  // Policy rules demo — INO_PASSWORD_DEFAULT_POLICY_RULES with a mix of met/unmet
  protected policyValue = 'partial';

  // Error state
  protected errorValue = '';

  // Sizing
  protected sizingSmallValue = '';
  protected sizingLargeValue = '';

  // States
  protected disabledValue = 'disabled';
  protected readonlyValue = 'readonly';
  protected requiredValue = '';

  // Labels
  protected hintValue = '';
  protected longLabelValue = '';
  protected rtlValue = '';
}
