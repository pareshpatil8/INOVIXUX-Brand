import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoSplitterComponent } from '../../../../components/splitter/ino-splitter.component';
import { InoSplitterPanelComponent } from '../../../../components/splitter/ino-splitter-panel.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-splitter` (INO-445).
 *
 * Same generic-renderer gap `ino-panel`/`ino-fieldset`/`ino-accordion`/`ino-toolbar` all hit: the
 * whole visible surface is content-projected `<ino-splitter-panel>` children, and the generic
 * renderer mounts a registry entry via `*ngComponentOutlet` with `[inputs]` only — it can never
 * project content, so every example there would render an empty, zero-height shell. Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-splitter-demo',
  standalone: true,
  imports: [CommonModule, InoSplitterComponent, InoSplitterPanelComponent],
  templateUrl: './splitter-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitterDemoComponent {
  protected lastSizes: number[] | null = null;
  protected lastCollapsed: { index: number; collapsed: boolean } | null = null;

  protected onSizesChange(sizes: number[]): void {
    this.lastSizes = sizes.map((s) => Math.round(s));
  }

  protected onPanelCollapsedChange(event: { index: number; collapsed: boolean }): void {
    this.lastCollapsed = event;
  }
}
