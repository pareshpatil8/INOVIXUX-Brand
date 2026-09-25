import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DeepLinkService } from './deep-link/deep-link.service';

/**
 * Root component — just a `<router-outlet>`. Unlike `web/`'s `App` (which owns persistent
 * nav/footer chrome for every route), this app's chrome is conditional: the sign-in stack has
 * none, the tab/stack screens get it from `AppShellComponent` (a child route, not this root) —
 * see `app.routes.ts`.
 *
 * Also where the `appUrlOpen` listener gets registered (INO-112, §6.6): it has to happen once,
 * on a component that's always alive for the life of the app, before any deep link can arrive.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App {
  constructor() {
    void inject(DeepLinkService).init();
  }
}
