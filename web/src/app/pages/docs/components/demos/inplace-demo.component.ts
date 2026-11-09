import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { InoInplaceComponent } from '../../../../components/inplace/ino-inplace.component';
import { INO_INPLACE_TEMPLATES } from '../../../../components/inplace/ino-inplace.templates';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-inplace`. The generic `@Input`-driven
 * renderer has no way to project `ng-template` display/edit slot content (the same content-
 * projection gap `dataview`'s own comment in `custom-demos.ts` records for a different component)
 * — the generic renderer would mount an `<ino-inplace>` with nothing in either slot. This demo
 * supplies real display/edit template pairs so the open/close swap, lazy mounting, Enter/blur
 * close, and the disabled/readonly/multi-field-blur edge cases can all be exercised and
 * screenshotted. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-inplace-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, InoInplaceComponent, ...INO_INPLACE_TEMPLATES],
  templateUrl: './inplace-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InplaceDemoComponent {
  // Variants / structure — basic text swap
  protected basicEditing = false;
  protected name = 'Jane Doe';

  // Lazy content — a counter in the edit template proves it remounts fresh every open
  protected lazyEditing = false;
  protected mountCount = 0;
  protected onLazyEditingChange(editing: boolean): void {
    this.lazyEditing = editing;
    if (editing) this.mountCount++;
  }

  // Multi-field edit template — blur between fields must not close
  protected multiEditing = false;
  protected firstName = 'Jane';
  protected lastName = 'Doe';

  // Multi-line edit template — Enter must not close
  protected notesEditing = false;
  protected notes = 'Line one\nLine two';

  // States
  protected disabledEditing = false;
  protected readonlyEditing = false;

  // Labels — ariaLabel-only, no visible label wrapper (the component has none)
  protected priceEditing = false;
  protected price = '$42.00';
}
