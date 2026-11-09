import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoAccordionComponent } from '../../../../components/accordion/ino-accordion.component';
import { InoAccordionTabComponent } from '../../../../components/accordion/ino-accordion-tab.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-accordion` (INO-435).
 *
 * Demonstrates all variants (single/multiple expand, icon position, nested), states
 * (expanded, disabled-panel, hover, focus, active, disabled, loading), and sizing
 * (compact/comfortable) per the spec row in doc 26 §5 and SPEC.md.
 *
 * Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`), same pattern as breadcrumb/select-button.
 */
@Component({
  selector: 'app-accordion-demo',
  standalone: true,
  imports: [CommonModule, InoAccordionComponent, InoAccordionTabComponent],
  templateUrl: './accordion-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionDemoComponent {
  /** Track which tab was last toggled for the event demo */
  protected lastToggled = '(none yet)';

  protected onTabToggle(index: number): void {
    this.lastToggled = `Tab ${index + 1}`;
  }
}
