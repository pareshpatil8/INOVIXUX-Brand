import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InoKeyfilterDirective } from './ino-keyfilter.directive';

/**
 * `<ino-keyfilter>` — element form of `[inoKeyfilter]`, for the docs portal's manifest-driven
 * live example (`scripts/generate-design-system-manifest.mjs` only walks `*.component.ts`,
 * same reason `<ino-focus-trap>` exists alongside `[inoFocusTrap]`).
 *
 * Applied via `hostDirectives`, so there is exactly one implementation and no wrapper node: the
 * directive's `(keydown)`/`(paste)` host listeners attach to this component's own host, and
 * `<ng-content>` projects the real `<input>`/`<textarea>`. Keydown and paste both bubble, so the
 * directive's `event.target` is still the projected field, not this host — the wrapper changes
 * nothing about the filtering contract.
 *
 * Prefer the directive when you already own the field element — attach `[inoKeyfilter]` directly
 * to your `<ino-input>` or `<input>` rather than adding a wrapper node for no reason.
 *
 * Renders no visual output of its own. See `SPEC.md` for the full Definition-of-Done disposition.
 */
@Component({
  selector: 'ino-keyfilter',
  standalone: true,
  templateUrl: './ino-keyfilter.component.html',
  styleUrl: './ino-keyfilter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: InoKeyfilterDirective,
      inputs: ['inoKeyfilter: preset', 'pattern', 'validateOnPaste'],
      outputs: ['inoKeyfilterReject'],
    },
  ],
})
export class InoKeyfilterComponent {}
