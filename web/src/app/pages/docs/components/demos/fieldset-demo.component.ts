import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoFieldsetComponent } from '../../../../components/fieldset/ino-fieldset.component';
import { InoInputComponent } from '../../../../components/input/ino-input.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-fieldset` (INO-439). The generic
 * `@Input`-driven renderer (`../docs-component-detail.component.ts`) mounts a live example via
 * `*ngComponentOutlet` with `[inputs]` only — it can never project content. `<ino-fieldset>`'s
 * entire visible surface besides the legend *is* projected content (the grouped fields), so the
 * generic renderer would produce a labelled empty box for every example, the same gap INO-731
 * (cascade-select) and INO-746 (select-button) hit. Mounted via `CUSTOM_DEMOS`
 * (`../custom-demos.ts`).
 *
 * Every instance below groups real `<ino-input>` fields rather than placeholder `<div>`s, so the
 * native `[disabled]` cascade (SPEC.md §4) and the collapse/expand disclosure are both visible
 * doing something real, not just toggling an empty shell.
 */
@Component({
  selector: 'app-fieldset-demo',
  standalone: true,
  imports: [CommonModule, InoFieldsetComponent, InoInputComponent],
  templateUrl: './fieldset-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldsetDemoComponent {
  // Variants
  protected street = '';
  protected city = '';
  protected collapsibleOpen = false;

  // States
  protected collapsedExample = true;

  /** Invalid clears the moment both fields are filled, so the error channel can be watched
   *  arriving and leaving rather than only in its permanently-broken form. */
  protected invalidStreet = '';
  protected invalidCity = '';

  protected get sectionError(): string {
    return this.invalidStreet && this.invalidCity ? '' : 'Complete both fields to continue';
  }

  // Sizing
  protected smValue = '';
  protected mdValue = '';
  protected lgValue = '';

  // Density
  protected denseValue = '';
  protected fluidValue = '';

  // Labels / RTL
  protected rtlStreet = '';
  protected rtlCity = '';
}
