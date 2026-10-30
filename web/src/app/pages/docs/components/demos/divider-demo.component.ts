import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoDividerComponent } from '../../../../components/divider/ino-divider.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-divider` (INO-789, fixing the
 * INO-442 QA rejection). The generic `@Input`-driven renderer only demos the one enum-valued
 * input it recognizes by exact name (`size` — this component has no such input; its sizing axis
 * is `thickness`), so it never rendered a "Size axis" section, and it defaults every string
 * `@Input` to `''`, so `label` never rendered either — both are real, documented variants
 * (SPEC.md §1, §3) with zero live coverage. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 *
 * Density is deliberately not demoed here — SPEC.md §3 documents `thickness` as not
 * density-dependent by design, so a density-axis section would misrepresent the contract rather
 * than fill a gap.
 */
@Component({
  selector: 'app-divider-demo',
  standalone: true,
  imports: [CommonModule, InoDividerComponent],
  templateUrl: './divider-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerDemoComponent {}
