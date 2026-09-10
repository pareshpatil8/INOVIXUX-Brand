import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoCardComponent } from '@web-app/components/card/ino-card.component';

interface HomeListItem {
  id: string;
  title: string;
  subtitle: string;
}

/**
 * List template (`13-mobile-app-patterns.md` §2, inventory row 5 — Home/dashboard). Vertically
 * stacked `ino-card` (`padding="sm"`, `interactive`) rows, per the template spec. Same template
 * covers row 6 (generic list — this component's own row composition, reused as-is elsewhere) and
 * row 8 (search/filter — `SearchComponent`, reachable via the header action below).
 *
 * Rows are dummy data — real data wiring is backend/product work, out of this design-system
 * track's scope (same note the React Native track's HomeScreen carries).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, InoCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly items: HomeListItem[] = [
    { id: '1', title: 'Acme Logistics LLC', subtitle: 'Submitted 2 days ago' },
    { id: '2', title: 'Northwind Trading Co.', subtitle: 'Submitted 4 days ago' },
    { id: '3', title: 'Blue Harbor Freight', subtitle: 'Submitted 1 week ago' },
  ];
}
