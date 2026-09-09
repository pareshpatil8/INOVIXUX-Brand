import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoButtonComponent } from '../../components/button/ino-button.component';

/**
 * Wildcard `**` route (`app.routes.ts`) — the 404 page named in the approved sitemap's build
 * scope (INO-84). Deliberately plain: no hero component, no bento grid — a 404 shouldn't try to
 * sell anything, it should get the visitor back on a real page fast.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, InoButtonComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
