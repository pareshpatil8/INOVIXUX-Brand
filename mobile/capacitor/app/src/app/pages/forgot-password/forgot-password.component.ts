import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { InoCardComponent } from '@web-app/components/card/ino-card.component';
import { InoInputComponent } from '@web-app/components/input/ino-input.component';
import { InoButtonComponent } from '@web-app/components/button/ino-button.component';

/**
 * Auth / onboarding template (`13-mobile-app-patterns.md` §2, inventory row 4 —
 * Forgot/reset password). Stack push from `SignInComponent` (`app.routes.ts`), not a tab. Same
 * single-column shell / 44px targets / display-sm headline contract as sign-in.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, InoCardComponent, InoInputComponent, InoButtonComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly router = inject(Router);

  protected email = '';
  protected sent = false;

  protected onSubmit(): void {
    // No auth backend wired (product/backend work, out of this design-system track's scope,
    // same note sign-in.component.ts carries) — just flips to the confirmation copy.
    this.sent = true;
  }

  protected backToSignIn(): void {
    this.router.navigateByUrl('/sign-in');
  }
}
