import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';

import { resolveDeepLink, toRouterUrl } from './deep-link.contract';

/**
 * §6.6's Capacitor row: `@capacitor/app`'s `appUrlOpen` listener → `Router.navigateByUrl`. Thin
 * by design — `deep-link.contract.ts` decides *where* a link goes; this only decides *when* and
 * hands the result to the router, so the grammar stays testable without Angular or a native
 * runtime.
 *
 * Cold start (`getLaunchUrl`) and warm start (`appUrlOpen`) both funnel through `open()` so the
 * §6.6 behaviour doesn't fork into two implementations that can drift apart.
 */
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private readonly router = inject(Router);

  async init(): Promise<void> {
    CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      void this.open(url);
    });

    const launch = await CapacitorApp.getLaunchUrl();
    if (launch?.url) await this.open(launch.url);
  }

  /**
   * §6.6: "a deep link must synthesize its parent chain" — Detail → Home → exit, never
   * Detail → exit. Angular's router has no native stack-navigator concept, so the chain is
   * synthesized as browser-history entries: the first hop replaces the current entry (a cold
   * start shouldn't leave onboarding behind in history), every intermediate hop pushes a new one,
   * and the final navigation carries the query string onto the real target.
   */
  private async open(url: string): Promise<void> {
    const link = resolveDeepLink(url);
    const last = link.stack.length - 1;
    for (const [index, path] of link.stack.entries()) {
      const target = index === last ? toRouterUrl(link) : path;
      await this.router.navigateByUrl(target, { replaceUrl: index === 0 });
    }
  }
}
