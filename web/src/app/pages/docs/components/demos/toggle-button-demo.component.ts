import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoToggleButtonComponent } from '../../../../components/toggle-button/ino-toggle-button.component';

interface FlaggedRow {
  readonly id: string;
  readonly invoice: string;
  readonly amount: string;
}

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-toggle-button` (INO-707, QA rejection
 * on INO-413 — every live-example instance on the shipped page rendered as a completely empty,
 * unlabeled button). Three separate limits in the generic `@Input`-driven renderer
 * (`../docs-component-detail.component.ts`) stack up on this component:
 *
 * 1. `defaultValueFor()` returns `''` for every `string`-typed input rather than the manifest's
 *    documented default, so `onLabel`/`offLabel` (`'Yes'`/`'No'`) arrive empty and the template's
 *    `*ngIf="currentLabel"` then drops the label element entirely — an unlabeled button.
 * 2. `size: InoControlSize` is a type alias, so the manifest extractor records
 *    `"values": null` for that row; the renderer's size-axis path only fires for a literal union
 *    it can enumerate, so no sm/default/lg row was produced at all.
 * 3. `pressed` is absent from `STATE_INPUT_NAMES`, so the one state that defines this component —
 *    the pressed face — was never exercised in any generated example.
 *
 * Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`), same remediation as INO-409 (slider) and
 * INO-401 (autocomplete). Labels, icons and copy mirror the static preview
 * (`docs/brand/06-angular-components/previews/toggle-button.html`) so the two stay recognisably
 * the same component.
 *
 * Every instance below is two-way bound via `[(pressed)]` and nothing in the surrounding prose
 * asserts a particular instance's current state unless that instance genuinely cannot change
 * (disabled / readonly / loading) — a caption that reads "pressed = true" next to a button a
 * reviewer has already clicked is exactly the kind of stale claim a QA pass should not have to
 * second-guess.
 */
@Component({
  selector: 'app-toggle-button-demo',
  standalone: true,
  imports: [CommonModule, InoToggleButtonComponent],
  templateUrl: './toggle-button-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleButtonDemoComponent {
  // Variants — the two faces. Live captions read these back, so they stay truthful after a click.
  protected textFace = false;
  protected iconFace = false;
  protected iconOnlyFace = true;

  // Sizing — each rung shows both faces at once, so the pair is seeded off/on.
  protected smOff = false;
  protected smOn = true;
  protected defaultOff = false;
  protected defaultOn = true;
  protected lgOff = false;
  protected lgOn = true;

  // Density
  protected denseFace = true;
  protected fluidFace = true;

  // Labels
  protected longLabelFace = false;
  protected rtlFace = true;

  /** Invalid state, live: the `error` string clears the moment the terms button is pressed, so the
   *  `aria-invalid` / `aria-describedby` / invalid-ring channel can be watched arriving *and*
   *  leaving rather than only in its permanently-broken form. */
  protected termsAccepted = false;

  protected get termsError(): string {
    return this.termsAccepted ? '' : 'Required before you can continue';
  }

  /** Dense-table usage (§2 contract row) — a toggle button as a row-level flag. Kept at
   *  `size="default"`, which in this page's dense register resolves to exactly the 32px floor the
   *  accessibility contract promises; `size="sm"` would be 28px there, under the minimum target. */
  protected readonly tableRows: readonly FlaggedRow[] = [
    { id: 'inv-2043', invoice: 'INV-2043', amount: '$1,280.00' },
    { id: 'inv-2044', invoice: 'INV-2044', amount: '$94.50' },
    { id: 'inv-2045', invoice: 'INV-2045', amount: '$12,400.00' },
  ];

  protected readonly flaggedRows = new Set<string>(['inv-2045']);

  protected setFlagged(id: string, flagged: boolean): void {
    if (flagged) {
      this.flaggedRows.add(id);
    } else {
      this.flaggedRows.delete(id);
    }
  }
}
