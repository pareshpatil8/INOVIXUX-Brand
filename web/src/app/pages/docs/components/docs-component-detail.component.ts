import { ChangeDetectionStrategy, Component, Type, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  ComponentDocsDataService,
  ManifestComponent,
  ManifestInput,
} from './component-docs-data.service';
import { ThemeService, InoTheme } from '../../../services/theme.service';
import { COMPONENT_REGISTRY } from './generated/component-registry';

/** One rendered live-example instance: a human label plus the resolved `[ngComponentOutletInputs]`
 * bag passed to the real component. */
interface LiveExample {
  label: string;
  inputs: Record<string, unknown>;
}

const MAX_EXAMPLES = 8;

/** Best-effort default for any manifest input not already pinned by the example generator below —
 * intentionally generic (INO-317 scope: a props-table-driven renderer, not hand-authored sample
 * data for all 38+ components). */
function defaultValueFor(input: ManifestInput): unknown {
  const type = input.type.trim();
  if (type.includes('[]')) return [];
  if (type === 'boolean') return false;
  if (type === 'string') return '';
  return null;
}

/**
 * `/docs/components/:slug` — INO-317 per-component detail page: props/API table generated from
 * the manifest, a theme switcher reusing `ThemeService`, a best-effort live example mounted via
 * `NgComponentOutlet`/`ngComponentOutletInputs` against the real component class (from the
 * generated `COMPONENT_REGISTRY`), and the component doc's Accessibility contract / Deliberate
 * omissions sections (from `component-docs-extract.json`).
 */
@Component({
  selector: 'app-docs-component-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './docs-component-detail.component.html',
  styleUrl: './docs-component-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsComponentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(ComponentDocsDataService);
  protected readonly themeService = inject(ThemeService);

  protected readonly themes: InoTheme[] = ['dark', 'light', 'high-contrast'];

  private readonly paramMap = toSignal(this.route.paramMap);

  private readonly manifest = toSignal(this.dataService.getManifest());
  private readonly docsExtract = toSignal(this.dataService.getDocsExtract());

  protected readonly component = computed<ManifestComponent | null>(() => {
    const slug = this.paramMap()?.get('slug');
    const components = this.manifest()?.components ?? [];
    return components.find((c) => c.slug === slug) ?? null;
  });

  protected readonly docExtract = computed(() => {
    const slug = this.paramMap()?.get('slug');
    if (!slug) return null;
    return this.docsExtract()?.components[slug] ?? null;
  });

  protected readonly liveComponentType = computed<Type<unknown> | null>(() => {
    const component = this.component();
    if (!component) return null;
    return COMPONENT_REGISTRY[component.slug] ?? null;
  });

  protected readonly primaryExamples = computed<LiveExample[]>(() => this.examples().primary);
  protected readonly sizeExamples = computed<LiveExample[]>(() => this.examples().sizeRow);

  private readonly examples = computed<{ primary: LiveExample[]; sizeRow: LiveExample[] }>(() => {
    const component = this.component();
    if (!component) return { primary: [], sizeRow: [] };

    const inputs = component.inputs;
    const baseInputs: Record<string, unknown> = {};
    for (const input of inputs) {
      baseInputs[input.name] = defaultValueFor(input);
    }

    const primaryInput = inputs.find((i) => i.values && i.values.length > 0);
    if (!primaryInput) {
      return { primary: [{ label: 'default', inputs: baseInputs }], sizeRow: [] };
    }

    const primaryValues = primaryInput.values!.slice(0, MAX_EXAMPLES);
    const primary = primaryValues.map((value) => ({
      label: `${primaryInput.name}="${value}"`,
      inputs: { ...baseInputs, [primaryInput.name]: value },
    }));

    const sizeInput = inputs.find(
      (i) => i.name === 'size' && i.values && i.values.length > 0 && i.name !== primaryInput.name,
    );
    let sizeRow: LiveExample[] = [];
    if (sizeInput) {
      sizeRow = sizeInput.values!.slice(0, MAX_EXAMPLES).map((value) => ({
        label: `size="${value}"`,
        inputs: { ...baseInputs, [primaryInput.name]: primaryValues[0], [sizeInput.name]: value },
      }));
    }

    return { primary, sizeRow };
  });

  protected inputValuesLabel(input: ManifestInput): string {
    return input.values && input.values.length ? input.values.join(' | ') : '—';
  }
}
