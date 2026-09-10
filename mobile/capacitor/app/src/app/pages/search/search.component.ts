import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { InoCardComponent } from '@web-app/components/card/ino-card.component';
import { InoInputComponent } from '@web-app/components/input/ino-input.component';

import { InoEmptyStateComponent } from '../../components/empty-state/ino-empty-state.component';

interface SearchResult {
  id: string;
  title: string;
  meta: string;
}

/**
 * List template + a form-control header (`13-mobile-app-patterns.md` §2, inventory row 8 —
 * Search/filter). Per `15-mobile-screen-inventory.md` row 8, deliberately not a new template: an
 * `ino-input[type=search]` on top of the same list-row composition Home uses. Pushed, usually
 * from a List's header action — reachable here from Home's search icon (`home.component.html`).
 */
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterLink, InoCardComponent, InoInputComponent, InoEmptyStateComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly all: SearchResult[] = [
    { id: '1', title: 'Acme Logistics LLC', meta: 'Updated today' },
    { id: '2', title: 'Northwind Trading Co.', meta: 'Updated yesterday' },
    { id: '3', title: 'Blue Harbor Freight', meta: 'Updated 3 days ago' },
  ];

  protected query = '';

  constructor(private readonly router: Router) {}

  protected get results(): SearchResult[] {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      return this.all;
    }
    return this.all.filter((item) => item.title.toLowerCase().includes(q));
  }

  protected get emptyBody(): string {
    return `Nothing matches "${this.query}".`;
  }

  protected back(): void {
    this.router.navigateByUrl('/home');
  }
}
