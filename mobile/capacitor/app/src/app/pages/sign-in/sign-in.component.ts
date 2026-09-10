import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { InoCardComponent } from '@web-app/components/card/ino-card.component';
import { InoInputComponent } from '@web-app/components/input/ino-input.component';
import { InoButtonComponent } from '@web-app/components/button/ino-button.component';

/**
 * Auth/onboarding template (`13-mobile-app-patterns.md` §2, inventory row 3 — Sign in/Sign up).
 * Single-column `ino-card` form shell, large (`--ino-target-comfortable`) tap targets throughout,
 * `--ino-type-display-size-sm` headline — same template rows 2 (`OnboardingComponent`) and 4
 * (`ForgotPasswordComponent`) reuse.
 *
 * Every component here (`InoCard`, `InoInput`, `InoButton`) is imported directly from `web/` via
 * the `@web-app/*` path alias — no re-implementation, per INO-88's scope.
 */
@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, RouterLink, InoCardComponent, InoInputComponent, InoButtonComponent],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  protected email = '';
  protected password = '';

  constructor(private readonly router: Router) {}

  protected onSubmit(): void {
    // No auth backend wired (product/backend work, out of this design-system track's scope) —
    // navigates straight to the tab shell so the rest of the screen inventory is reachable.
    this.router.navigateByUrl('/home');
  }
}
