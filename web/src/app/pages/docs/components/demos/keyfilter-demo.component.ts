import { ChangeDetectionStrategy, Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoCheckboxComponent } from '../../../../components/checkbox/ino-checkbox.component';
import { InoInputComponent } from '../../../../components/input/ino-input.component';
import { InoKeyfilterComponent } from '../../../../components/keyfilter/ino-keyfilter.component';
import { InoKeyfilterDirective } from '../../../../components/keyfilter/ino-keyfilter.directive';
import { InoKeyfilterPreset } from '../../../../components/keyfilter/keyfilter-presets';

interface KeyfilterField {
  readonly id: string;
  readonly label: string;
  readonly preset: InoKeyfilterPreset;
  /** Only read when `preset === 'regex'`. */
  readonly pattern: string;
  readonly allows: string;
  readonly inputMode: string;
  readonly placeholder: string;
}

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-keyfilter` (INO-693, QA rejection on
 * INO-421 — the live-example row was empty on the shipped page).
 *
 * The generic `@Input`-driven renderer cannot demo this component *at all*, and not for the
 * reasons it falls short elsewhere: it mounts components through `*ngComponentOutlet` with
 * `inputs` only, so it can never supply projected content — and `<ino-keyfilter>`'s entire
 * template is `<ng-content></ng-content>`. With nothing projected it renders literally nothing.
 * (`<ino-focus-trap>`, the other behavior-only primitive, renders its own sentinel DOM and so
 * survives the generic renderer; keyfilter structurally needs a real field inside it.)
 *
 * Every field below is a real `<input>` (or `<ino-input>`) with live filtering: type a letter
 * into a numeric field, or paste `12a34`, and the rejection is both announced through the shared
 * `aria-live` region and flashed on the field. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-keyfilter-demo',
  standalone: true,
  imports: [
    CommonModule,
    InoCheckboxComponent,
    InoInputComponent,
    InoKeyfilterComponent,
    InoKeyfilterDirective,
  ],
  templateUrl: './keyfilter-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyfilterDemoComponent implements OnDestroy {
  /** Matches the `.is-rejected` flash animation's own length (`--ino-motion-duration-slow`), so a
   *  second rejection re-triggers the animation from the start rather than landing mid-flash. */
  private static readonly FLASH_MS = 480;

  /** Variants — one field per preset. `regex` is the escape hatch: `preset="regex"` hands
   *  per-character testing over to `pattern`. */
  protected readonly fields: readonly KeyfilterField[] = [
    {
      id: 'int',
      label: 'Quantity',
      preset: 'int',
      pattern: '',
      allows: 'Digits, plus one leading minus.',
      inputMode: 'numeric',
      placeholder: '-42',
    },
    {
      id: 'num',
      label: 'Amount',
      preset: 'num',
      pattern: '',
      allows: 'Digits, one leading minus, one decimal point.',
      inputMode: 'decimal',
      placeholder: '1234.56',
    },
    {
      id: 'alpha',
      label: 'Account holder',
      preset: 'alpha',
      pattern: '',
      allows: 'ASCII letters only.',
      inputMode: 'text',
      placeholder: 'Ada',
    },
    {
      id: 'alphanum',
      label: 'Reference code',
      preset: 'alphanum',
      pattern: '',
      allows: 'ASCII letters and digits.',
      inputMode: 'text',
      placeholder: 'INV2026A',
    },
    {
      id: 'regex',
      label: 'Hex colour',
      preset: 'regex',
      pattern: '[a-f0-9]',
      allows: 'Custom pattern — [a-f0-9].',
      inputMode: 'text',
      placeholder: 'a1b2c3',
    },
  ];

  /** Drives the `validateOnPaste` input on every field in the Variants row, so the two paste
   *  dispositions can be compared on the same field without reloading the page. */
  protected readonly validateOnPaste = signal(true);

  /** Last rejected text per field id — the visible half of the `inoKeyfilterReject` feedback. */
  protected readonly rejections = signal<Record<string, string>>({});

  /** Field id currently flashing, cleared on a timer so the next rejection restarts the flash. */
  protected readonly flashing = signal<string | null>(null);

  /** Single polite live region for the whole demo. One shared region, not one per field: five
   *  live regions on one page is exactly the over-announcement the component itself declines to
   *  ship (the directive announces nothing by default — see the Accessibility contract). */
  protected readonly announcement = signal('');

  protected directiveFormValue = '';
  protected denseValue = '';
  protected fluidValue = '';

  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  protected onReject(field: { id: string; label: string }, rejected: string): void {
    this.rejections.update((map) => ({ ...map, [field.id]: rejected }));
    this.announcement.set(
      rejected.length === 1
        ? `${field.label}: ${rejected} blocked`
        : `${field.label}: pasted text ${rejected} contained blocked characters`,
    );
    this.flashing.set(field.id);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(
      () => this.flashing.set(null),
      KeyfilterDemoComponent.FLASH_MS,
    );
  }

  ngOnDestroy(): void {
    clearTimeout(this.flashTimer);
  }
}
