import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  ComponentDocsDataService,
  DispositionItem,
  ManifestComponent,
} from './component-docs-data.service';

const DISPOSITION_ORDER: DispositionItem['disposition'][] = ['Committed', 'Covered', 'Shipped'];

/** "IconField" -> "icon-field", matching manifest `slug` naming (kebab-case source dir name). */
function toSlug(componentName: string): string {
  return componentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

interface DispositionGroup {
  disposition: DispositionItem['disposition'];
  items: DispositionItem[];
}

/**
 * `/docs/components` — INO-317 index of the per-component docs portal (closes finding F-3 from
 * `docs/brand/24-primeng-component-audit-ino-31.md`). Two tables, both driven straight from the
 * generated `/design-system/*.json` blobs, never hand-authored:
 *
 * 1. The 38(+) shipped INOVIXUX components (manifest.json) — one row per component, linking to
 *    its `/docs/components/:slug` detail page.
 * 2. Every PrimeNG component with no dedicated build (component-disposition.json), grouped by
 *    disposition — this is the F-2 itemization made explicit and in writing, closed at 100% by
 *    doc 26 §5 rev 2 (INO-503): `Committed` to a build phase, `Covered` by capability we already
 *    ship, or `Shipped` since the audit snapshot. Nothing is left "open, unassigned".
 *
 * `component-disposition.json` is transcribed from doc 24's Matrix B, a point-in-time audit
 * snapshot. This is a shared build worktree: components can ship (landing a manifest entry)
 * after that snapshot was written but before this page next regenerates the disposition data.
 * `dispositionGroups` cross-checks disposition rows against the live manifest and drops any row
 * whose component has since shipped, rather than showing a component simultaneously as "shipped,
 * linked" and "not built" — see INO-31 finding about `done` status / stale docs not being
 * evidence on their own. That check is why the `Shipped` group is normally empty on the page.
 */
@Component({
  selector: 'app-docs-components-index',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './docs-components-index.component.html',
  styleUrl: './docs-components-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsComponentsIndexComponent {
  private readonly dataService = inject(ComponentDocsDataService);

  private readonly manifest = toSignal(this.dataService.getManifest());
  private readonly disposition = toSignal(this.dataService.getDisposition());

  protected readonly components = computed<ManifestComponent[]>(
    () => this.manifest()?.components ?? [],
  );

  private readonly shippedSlugs = computed<Set<string>>(
    () => new Set(this.components().map((c) => c.slug)),
  );

  protected readonly summary = computed(() => this.disposition()?.summary ?? null);

  protected readonly dispositionGroups = computed<DispositionGroup[]>(() => {
    const items = this.disposition()?.items ?? [];
    const shipped = this.shippedSlugs();
    const notYetShipped = items.filter((item) => !shipped.has(toSlug(item.component)));
    return DISPOSITION_ORDER.map((disposition) => ({
      disposition,
      items: notYetShipped.filter((item) => item.disposition === disposition),
    })).filter((group) => group.items.length > 0);
  });

  protected variantsLabel(component: ManifestComponent): string {
    return component.variants && component.variants.length ? component.variants.join(' | ') : '—';
  }
}
