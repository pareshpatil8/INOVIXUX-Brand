import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { InoCardComponent } from '@web-app/components/card/ino-card.component';

/**
 * Detail template (`13-mobile-app-patterns.md` §2, inventory row 7 — item opened from a List).
 * Header (back + title) → `ino-card` sections, `variant="sunken"` for read-only/reference data —
 * per the template spec, stack-pushed from Home (`app.routes.ts`'s `home/:id`).
 */
@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, InoCardComponent],
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly fields = [
    { label: 'Entity name', value: 'Acme Logistics LLC' },
    { label: 'EIN', value: '84-XXXXXXX' },
    { label: 'Status', value: 'Under review' },
    { label: 'Submitted', value: 'Sep 7, 2026' },
  ];

  protected back(): void {
    this.router.navigateByUrl('/home');
  }
}
