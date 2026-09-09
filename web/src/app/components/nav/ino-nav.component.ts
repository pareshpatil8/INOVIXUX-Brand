import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../services/theme.service';

export interface InoNavLink {
  label: string;
  href: string;
}

/**
 * `<ino-nav>` — top-level site/app navigation shell.
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3.
 *
 * Logo is projected via `<ng-content select="[logo]">` on purpose — the nav shell doesn't
 * know or care what mark renders there, so a mark swap (Verified Line → Aperture Mark →
 * Ledger Seal) never touches this component.
 *
 * Owns the dark/light toggle directly (injects ThemeService itself, no Input/Output
 * plumbing) since nav is the one place both modes need this control on every page.
 *
 * `links[].href` is an in-app route path (rendered via `routerLink`, INO-84) — not an
 * arbitrary external URL.
 */
@Component({
  selector: 'ino-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './ino-nav.component.html',
  styleUrl: './ino-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoNavComponent {
  @Input() links: InoNavLink[] = [];
  @Input() ctaLabel = 'Request access';

  @Output() ctaClick = new EventEmitter<void>();

  private readonly themeService = inject(ThemeService);
  protected readonly theme = this.themeService.theme;

  onCtaClick(): void {
    this.ctaClick.emit();
  }

  onThemeToggle(): void {
    this.themeService.toggle();
  }
}
