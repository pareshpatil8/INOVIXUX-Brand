import { ChangeDetectionStrategy, Component, Type, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  ApiProp,
  ComponentDocsDataService,
  ManifestComponent,
  ManifestInput,
} from './component-docs-data.service';
import { ThemeService, InoTheme } from '../../../services/theme.service';
import { COMPONENT_REGISTRY } from './generated/component-registry';
import { CUSTOM_DEMOS } from './custom-demos';

/** One rendered live-example instance: a human label plus the resolved `[ngComponentOutletInputs]`
 * bag passed to the real component. */
interface LiveExample {
  label: string;
  inputs: Record<string, unknown>;
}

const MAX_EXAMPLES = 8;

/** Boolean `@Input()` names treated as §2.2 "States" (docs 26 §2) rather than ordinary flags —
 * demoed individually, flipped to `true`, so disabled/invalid/loading/etc. aren't silently
 * absent from the generic renderer just because they're not enum-valued. */
const STATE_INPUT_NAMES = [
  'disabled',
  'invalid',
  'readonly',
  'loading',
  'required',
  'checked',
  'indeterminate',
  'expanded',
  'active',
  'open',
  'selected',
  'error',
];

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

  /** Hand-authored §2-contract demo for this slug, if one exists (`./custom-demos.ts`) — takes
   *  over the "Live example" section from the generic per-`@Input` grid below. */
  protected readonly customDemoType = computed<Type<unknown> | null>(() => {
    const component = this.component();
    if (!component) return null;
    return CUSTOM_DEMOS[component.slug] ?? null;
  });

  protected readonly primaryExamples = computed<LiveExample[]>(() => this.examples().primary);
  protected readonly sizeExamples = computed<LiveExample[]>(() => this.examples().sizeRow);
  protected readonly stateExamples = computed<LiveExample[]>(() => this.examples().stateRow);

  /** Doc 26 §2 row 3 (Sizing): density is a global `[data-density]` token axis, not a
   * per-component `@Input()` (confirmed: no component declares a `dense`/`density` input —
   * see `web/src/tokens.css` §10), so it can't be detected from the manifest the way
   * `sizeExamples`/`stateExamples` are. Render it unconditionally against the first primary
   * example's inputs instead. */
  protected readonly densityBaseInputs = computed<Record<string, unknown>>(
    () => this.examples().primary[0]?.inputs ?? {},
  );

  private readonly examples = computed<{ primary: LiveExample[]; sizeRow: LiveExample[]; stateRow: LiveExample[] }>(() => {
    const component = this.component();
    if (!component) return { primary: [], sizeRow: [], stateRow: [] };

    const inputs = component.inputs;
    const baseInputs: Record<string, unknown> = {};
    for (const input of inputs) {
      baseInputs[input.name] = defaultValueFor(input);
    }

    const stateInputs = inputs.filter(
      (i) => i.type === 'boolean' && STATE_INPUT_NAMES.includes(i.name),
    );
    const stateRow: LiveExample[] = stateInputs.map((stateInput) => ({
      label: `${stateInput.name}="true"`,
      inputs: { ...baseInputs, [stateInput.name]: true },
    }));

    // INO-736: `size` is deliberately excluded from primary-axis candidacy. It has a dedicated
    // Size row (doc 26 §2 row 3) immediately below, and now that the manifest resolves its
    // imported `InoControlSize` alias it is the *first* input with values on most components —
    // left in, it would make the primary grid three size boxes on ~40 pages and suppress the Size
    // row entirely. `<ino-label>` was already in that state (its `InoLabelSize` is declared
    // locally, so it resolved before this change) and is corrected by the same exclusion.
    const primaryInput = inputs.find((i) => i.name !== 'size' && i.values && i.values.length > 0);
    const primaryValues = primaryInput?.values?.slice(0, MAX_EXAMPLES) ?? [];
    const primary: LiveExample[] = primaryInput
      ? primaryValues.map((value) => ({
          label: `${primaryInput.name}="${value}"`,
          inputs: { ...baseInputs, [primaryInput.name]: value },
        }))
      : [{ label: 'default', inputs: baseInputs }];

    // The size row pins the primary axis to its first value so the three boxes differ only by
    // size. With no primary axis it renders against the plain defaults.
    const sizeInput = inputs.find((i) => i.name === 'size' && i.values && i.values.length > 0);
    const sizeRow: LiveExample[] = sizeInput
      ? sizeInput.values!.slice(0, MAX_EXAMPLES).map((value) => ({
          label: `size="${value}"`,
          inputs: {
            ...baseInputs,
            ...(primaryInput ? { [primaryInput.name]: primaryValues[0] } : {}),
            [sizeInput.name]: value,
          },
        }))
      : [];

    return { primary, sizeRow, stateRow };
  });

  protected inputValuesLabel(input: ManifestInput): string {
    return input.values && input.values.length ? input.values.join(' | ') : '—';
  }

  /** INO-736 §4: the Props table's Type column prints the *declared* type, so an alias like
   * `InoControlSize` tells the reader nothing about its members. The extract has carried the
   * resolved union since INO-731 — surface it under the type name. Returns null when there is
   * nothing to add: no resolved values, or an inline union whose `type` already spells them out. */
  protected propValuesLabel(prop: ApiProp): string | null {
    if (!prop.values?.length || prop.type.includes("'")) return null;
    return prop.values.map((value) => `'${value}'`).join(' | ');
  }

  /** Component class name for the import statement (e.g. `InoButtonComponent`). */
  protected readonly componentClassName = computed<string>(() => {
    const component = this.component();
    return component?.className ?? '';
  });

  /** Import path for the component (derived from sourcePath). */
  protected readonly componentImportPath = computed<string>(() => {
    const component = this.component();
    if (!component?.sourcePath) return '';
    // Convert web/src/app/components/button/ino-button.component.ts to @app/components/button
    const match = /web\/src\/app\/(.+)\/[^/]+\.component\.ts/.exec(component.sourcePath);
    return match ? `@app/${match[1]}` : '';
  });

  /** Full import statement for display and copying. */
  protected readonly importStatement = computed<string>(() => {
    const className = this.componentClassName();
    const importPath = this.componentImportPath();
    return `import { ${className} } from '${importPath}';`;
  });

  /** Copy the import statement to clipboard. */
  protected copyImport(): void {
    navigator.clipboard.writeText(this.importStatement()).catch((err) => {
      console.error('Failed to copy import statement:', err);
    });
  }

  /** Component-specific design tokens with live values from the current theme. Returns null if
   * the component uses only global tokens. */
  protected readonly componentTokens = computed<Array<{ name: string; value: string; isColor: boolean }> | null>(() => {
    // For now, return null — theming section will show the fallback message.
    // A follow-up can wire this to read computed CSS variables scoped to the component.
    return null;
  });
}
