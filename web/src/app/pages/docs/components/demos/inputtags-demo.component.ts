import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoInputTagsComponent,
  InoInputTagsOption,
  InoInputTagsTag,
} from '../../../../components/inputtags/ino-inputtags.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-inputtags` (INO-531, fixing INO-419
 * QA gaps). Mounted in place of the generic props-driven grid on `/docs/components/inputtags` via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) — the generic renderer's `defaultValueFor()` forces every
 * string `@Input` to `''` and every boolean to `false`, contradicting this component's real
 * defaults (`separators=','`, `addOnBlur=true`) and making comma-to-add and blur-to-add both
 * silently broken in the default demo. This demo supplies explicit defaults, real autocomplete
 * suggestions, maxTags at-max state, validateTag producing invalid chips, error state, and sizing
 * variants (sm/lg) that the generic Sizing row renderer cannot produce (it requires a "primary"
 * enum input alongside `size`).
 */
@Component({
  selector: 'app-inputtags-demo',
  standalone: true,
  imports: [CommonModule, InoInputTagsComponent],
  templateUrl: './inputtags-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputTagsDemoComponent {
  protected readonly suggestions: InoInputTagsOption[] = [
    { label: 'Angular', value: 'angular' },
    { label: 'React', value: 'react' },
    { label: 'Vue', value: 'vue' },
    { label: 'Svelte', value: 'svelte' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'Python', value: 'python' },
    { label: 'Rust', value: 'rust' },
    { label: 'Go', value: 'go' },
  ];

  // Default behavior — correct defaults (separators=',', addOnBlur=true)
  protected defaultValue: InoInputTagsTag[] = [
    { value: 'angular', label: 'angular' },
    { value: 'typescript', label: 'typescript' },
  ];

  // Suggestions autocomplete
  protected autocompleteValue: InoInputTagsTag[] = [
    { value: 'react', label: 'react' },
  ];

  // maxTags at-max state (limit 3)
  protected maxTagsValue: InoInputTagsTag[] = [
    { value: 'vue', label: 'vue' },
    { value: 'svelte', label: 'svelte' },
    { value: 'python', label: 'python' },
  ];

  // validateTag producing invalid chips
  protected validatedValue: InoInputTagsTag[] = [
    { value: 'validtag', label: 'validtag', invalid: false },
    { value: 'INVALID', label: 'INVALID', invalid: true },
    { value: 'another', label: 'another', invalid: false },
  ];

  // Error state
  protected errorValue: InoInputTagsTag[] = [];

  // Sizing
  protected sizingSmallValue: InoInputTagsTag[] = [
    { value: 'sm', label: 'sm' },
  ];
  protected sizingLargeValue: InoInputTagsTag[] = [
    { value: 'lg', label: 'lg' },
  ];

  // Disabled state
  protected disabledValue: InoInputTagsTag[] = [
    { value: 'disabled', label: 'disabled' },
  ];

  // Readonly state
  protected readonlyValue: InoInputTagsTag[] = [
    { value: 'readonly', label: 'readonly' },
  ];

  protected validateTagFn = (tag: string): boolean => {
    // Reject tags that are all uppercase
    return tag !== tag.toUpperCase() || tag.length <= 1;
  };
}
