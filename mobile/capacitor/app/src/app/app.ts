import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component — just a `<router-outlet>`. Unlike `web/`'s `App` (which owns persistent
 * nav/footer chrome for every route), this app's chrome is conditional: the sign-in stack has
 * none, the tab/stack screens get it from `AppShellComponent` (a child route, not this root) —
 * see `app.routes.ts`.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App {}
