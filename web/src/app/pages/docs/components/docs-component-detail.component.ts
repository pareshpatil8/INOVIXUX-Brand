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

/** The manifest records each `@Input()`'s declared default as the literal source text (`"'Yes'"`,
 * `"true"`, `"0.5"`, `"null"`, `"() => null"`). Decode the literal forms; return `notLiteral` for
 * anything else (calls, identifiers, object/array literals, `null`/`undefined`) so the caller falls
 * back to its own type default rather than guessing. */
const notLiteral = Symbol('not-a-literal-default');

/** No usable default could be derived for this input. INO-748: the renderer must then leave the
 * key *out* of the `[ngComponentOutletInputs]` bag rather than binding `null` — binding runs the
 * setter, and `@Input({transform: numberAttribute}) maxTags: number | null = null` turns `null`
 * into `NaN` (`numberAttribute`'s fallback), clobbering the class default. Omitting the key never
 * invokes the setter, so the component keeps whatever it declared. */
const noDefault = Symbol('no-derivable-default');

function parseLiteralDefault(raw: string): unknown {
  const text = raw.trim();
  if (/^'.*'$/s.test(text) || /^".*"$/s.test(text) || /^`[^`${}]*`$/s.test(text)) {
    return text.slice(1, -1);
  }
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return notLiteral;
}

/** `Foo<Bar[]> | null` → `Foo | null`. Nested generic arguments say nothing about what the input
 * itself holds, so the type tests below must not see them. */
function stripGenericArgs(type: string): string {
  let out = type;
  let previous: string;
  do {
    previous = out;
    out = out.replace(/<[^<>]*>/g, '');
  } while (out !== previous);
  return out;
}

/** A parsed literal is only usable if the input's declared type can actually hold it — a `null`
 * default on a `string` input, or a numeric default on a union of string literals, must not
 * override the type default below. Arrays keep `[]`: the manifest never carries sample data. */
function isAssignableTo(value: unknown, input: ManifestInput): boolean {
  const type = input.type.trim();
  // INO-748: an alias-typed enum names the alias (`InoAlertStatus`), not its members, so the
  // textual tests below can't see that `'success'` is one of them — every such input lost its
  // documented default and rendered against `null`. INO-736 already resolves each alias to its
  // members in the manifest's `values`; ask that first.
  if (typeof value === 'string' && input.values?.includes(value)) return true;
  if (stripGenericArgs(type).includes('[]') || type.includes('Array<')) return false;
  switch (typeof value) {
    case 'string':
      return type === 'string' || type.includes('string') || type.includes("'");
    case 'boolean':
      return type === 'boolean' || type.includes('boolean');
    case 'number':
      return type === 'number' || type.includes('number');
    default:
      return false;
  }
}

/** Best-effort default for any manifest input not already pinned by the example generator below —
 * intentionally generic (INO-317 scope: a props-table-driven renderer, not hand-authored sample
 * data for all 38+ components).
 *
 * INO-709 limit 1: this used to return `''` for every `string` input, `false` for every boolean and
 * `null` for everything else, discarding the default the manifest already carries. A component
 * whose template gates its label on `*ngIf="someStringInput"` then rendered an unlabeled control,
 * which is six of the B1 QA rejections (INO-401/407/409/419/421/413). Prefer the documented default
 * when it is a literal the type can hold; otherwise omit the input entirely (`noDefault`) so the
 * component's own class default stands. */
function defaultValueFor(input: ManifestInput): unknown {
  const type = input.type.trim();
  if (input.default != null) {
    const parsed = parseLiteralDefault(input.default);
    if (parsed !== notLiteral && isAssignableTo(parsed, input)) return parsed;
  }
  // Only a top-level array type gets `[]`. A substring match also hit array types nested in a
  // generic argument — `TemplateRef<{ $implicit: InoMeterSegment[] }> | null` was handed `[]`,
  // which is truthy, so `ino-meter-group`'s `*ngIf="legendTemplate"` passed an array to
  // `ngTemplateOutlet` and the docs page threw `createEmbeddedViewImpl is not a function` on load.
  if (stripGenericArgs(type).includes('[]')) return [];
  if (type === 'boolean') return false;
  if (type === 'string') return '';
  return noDefault;
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
      const value = defaultValueFor(input);
      if (value !== noDefault) baseInputs[input.name] = value;
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
