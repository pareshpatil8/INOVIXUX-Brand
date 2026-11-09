import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoPanelComponent } from '../../../../components/panel/ino-panel.component';
import { InoButtonComponent } from '../../../../components/button/ino-button.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-panel` (INO-437).
 *
 * `<ino-panel>`'s entire visible surface besides `header` is `<ng-content>` (body) and
 * `[ino-panel-footer]` (footer) — the same generic-renderer gap `<ino-fieldset>`/`<ino-keyfilter>`
 * already hit (`defaultValueFor()` in `../docs-component-detail.component.ts` gives it nothing to
 * project, so the generic renderer would produce a labelled, empty box). Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`), same remediation pattern as those two.
 */
@Component({
  selector: 'app-panel-demo',
  standalone: true,
  imports: [CommonModule, InoPanelComponent, InoButtonComponent],
  templateUrl: './panel-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDemoComponent {
  protected collapsibleOpen = false;
  protected collapsedExample = true;
  protected lastAction = '(none yet)';

  protected onSave(): void {
    this.lastAction = 'Save clicked';
  }

  protected onDiscard(): void {
    this.lastAction = 'Discard clicked';
  }
}
