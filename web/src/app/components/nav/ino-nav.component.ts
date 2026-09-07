import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

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
 */
@Component({
  selector: 'ino-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-nav.component.html',
  styleUrl: './ino-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoNavComponent {
  @Input() links: InoNavLink[] = [];
  @Input() ctaLabel = 'Request access';

  @Output() ctaClick = new EventEmitter<void>();

  onCtaClick(): void {
    this.ctaClick.emit();
  }
}
