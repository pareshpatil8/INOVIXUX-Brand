import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { InoCardComponent } from '@web-app/components/card/ino-card.component';
import { InoButtonComponent } from '@web-app/components/button/ino-button.component';

interface OnboardingStep {
  headline: string;
  body: string;
}

/**
 * Auth / onboarding template (`13-mobile-app-patterns.md` §2, inventory row 2 — "1–3 steps").
 * Same template family as sign-in/forgot-password: single-column shell,
 * `--ino-type-display-size-sm` headline, `--ino-target-comfortable` (44px) on every control.
 * Pre-tab-bar, own stack — not part of the tab bar's routes (`app.routes.ts`).
 */
@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, InoCardComponent, InoButtonComponent],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent {
  private readonly router = inject(Router);

  protected readonly steps: OnboardingStep[] = [
    {
      headline: 'Verified by design',
      body: 'Every action carries the same verified-node mark you see across INOVIXUX.',
    },
    {
      headline: 'One system, everywhere',
      body: 'The same tokens and components you know from web, native on mobile.',
    },
    {
      headline: 'Dark by default',
      body: 'Follows your system appearance, with a manual override anytime in Settings.',
    },
  ];

  protected index = 0;

  protected get isLastStep(): boolean {
    return this.index === this.steps.length - 1;
  }

  protected next(): void {
    if (this.isLastStep) {
      this.router.navigateByUrl('/sign-in');
      return;
    }
    this.index += 1;
  }

  protected skip(): void {
    this.router.navigateByUrl('/sign-in');
  }
}
