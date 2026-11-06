import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoChipComponent } from '../../../../components/chip/ino-chip.component';
import { InoAvatarComponent } from '../../../../components/avatar/ino-avatar.component';

interface DemoChip {
  id: number;
  label: string;
}

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-chip` (INO-462). Mounted in place of
 * the generic props-driven grid on `/docs/components/chip` via `CUSTOM_DEMOS`
 * (`../custom-demos.ts`) — the generic renderer cannot exercise projected `[icon]`/`[avatar]`
 * content, the live removable-chip-list behavior, or the `interactive`+`pressable` toggle-chip
 * pattern, all of which are this component's actual showcase surface (same reasoning
 * `inputtags-demo` already documents for its own custom demo).
 */
@Component({
  selector: 'app-chip-demo',
  standalone: true,
  imports: [CommonModule, InoChipComponent, InoAvatarComponent],
  templateUrl: './chip-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipDemoComponent {
  // Removable — a real backing list, filtered on (remove), same pattern inputtags-demo uses for
  // its [(value)] tags.
  protected removableChips: DemoChip[] = [
    { id: 1, label: 'Angular' },
    { id: 2, label: 'TypeScript' },
    { id: 3, label: 'RxJS' },
  ];

  // Interactive + pressable — filter-chip toggle group, independent pressed state per chip.
  protected filters: Record<string, boolean> = {
    open: true,
    closed: false,
    archived: false,
  };

  protected clickCount = 0;

  protected onRemove(id: number): void {
    this.removableChips = this.removableChips.filter((c) => c.id !== id);
  }

  protected onToggleFilter(key: string, pressed: boolean): void {
    this.filters[key] = pressed;
  }

  protected onChipClick(): void {
    this.clickCount++;
  }
}
