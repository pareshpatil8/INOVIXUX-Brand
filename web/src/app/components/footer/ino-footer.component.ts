import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface InoFooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

/**
 * `<ino-footer>` — site/app footer, 5-column layout (1.4fr mark column + 4 link columns).
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3. Matches the v5 HTML exactly.
 *
 * `columns[].links[].href` is an in-app route path (rendered via `routerLink`, INO-84).
 */
@Component({
  selector: 'ino-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ino-footer.component.html',
  styleUrl: './ino-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoFooterComponent {
  @Input() columns: InoFooterColumn[] = [];
}
