import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoButtonComponent } from '../../../../components/button/ino-button.component';
import { InoAutofocusComponent } from '../../../../components/autofocus/ino-autofocus.component';
import { InoAutofocusDirective } from '../../../../components/autofocus/ino-autofocus.directive';
import { InoFocusTrapDirective } from '../../../../components/focus-trap/ino-focus-trap.directive';
import { InoInputComponent } from '../../../../components/input/ino-input.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `[inoAutofocus]` / `<ino-autofocus>`
 * (INO-466). Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`), the same mechanism
 * `[inoKeyfilter]`'s demo uses and for the identical reason: the generic `*ngComponentOutlet`
 * renderer mounts components with `@Input`s only and cannot project content, and this directive
 * has nothing to demonstrate without a real focusable element to attach to.
 *
 * Four live sections: the two forms, the route-change `inoAutofocusTrigger` mechanism (doc 26 §5's
 * "interplay with route change" requirement), an explicit target selector, and the
 * `[inoFocusTrap]` interplay rule (SPEC.md §3) — a trap present anywhere above the field makes this
 * directive a no-op, demonstrated by toggling the trap on and off around the same field.
 */
@Component({
  selector: 'app-autofocus-demo',
  standalone: true,
  imports: [
    CommonModule,
    InoAutofocusComponent,
    InoAutofocusDirective,
    InoButtonComponent,
    InoFocusTrapDirective,
    InoInputComponent,
  ],
  templateUrl: './autofocus-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutofocusDemoComponent {
  /** Element-form value, wrapped by `<ino-autofocus>` in the "two forms" row. */
  protected elementFormValue = '';

  /** Directive-form value, carrying `[inoAutofocus]` directly in the same row. */
  protected directiveFormValue = '';

  /** Bumped by "Simulate navigation" — the `inoAutofocusTrigger` binding re-runs focus placement
   *  on every change after the first, standing in for a `Router.events` `NavigationEnd` id. */
  protected readonly navCount = signal(0);
  protected routedValue = '';

  /** Drives which field `inoAutofocusTarget` resolves to within the shared container below. */
  protected readonly targetSelector = signal('#target-second');
  protected targetFirstValue = '';
  protected targetSecondValue = '';

  /** Toggles the ancestor `[inoFocusTrap]` the interplay row wraps its field in. */
  protected readonly trapPresent = signal(true);
  protected trapInterplayValue = '';

  protected simulateNavigation(): void {
    this.navCount.update((n) => n + 1);
  }
}
