import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoHeroComponent } from '../../../../components/hero/ino-hero.component';
import { InoButtonComponent } from '../../../../components/button/ino-button.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-hero` (INO-374, doc 26 §6 C5 —
 * marketing-only components with no docs page at all). Mounted in place of the generic
 * props-driven grid on `/docs/components/hero` via `CUSTOM_DEMOS` (`../custom-demos.ts`) so the
 * projected-content slot (the whole point of this shell component) is actually exercised.
 */
@Component({
  selector: 'app-hero-demo',
  standalone: true,
  imports: [CommonModule, InoHeroComponent, InoButtonComponent],
  templateUrl: './hero-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroDemoComponent {}
