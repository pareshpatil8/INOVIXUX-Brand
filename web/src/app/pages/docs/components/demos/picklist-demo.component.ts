import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoPickListComponent, InoPickListOption } from '../../../../components/picklist/ino-picklist.component';

const SEED_SOURCE: InoPickListOption[] = [
  { label: 'Aadhaar verification', value: 'aadhaar' },
  { label: 'GSTIN lookup', value: 'gstin' },
  { label: 'Bank statement parse', value: 'bank-statement' },
  { label: 'Director KYC (locked)', value: 'director-kyc', disabled: true },
  { label: 'UPI mandate check', value: 'upi-mandate' },
];

const SEED_TARGET: InoPickListOption[] = [{ label: 'PAN validation', value: 'pan' }];

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-picklist` (INO-456). Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`) — the generic props-driven grid has no concept of two
 * paired array inputs (`source`/`target`), so it cannot render this component meaningfully.
 */
@Component({
  selector: 'app-picklist-demo',
  standalone: true,
  imports: [CommonModule, InoPickListComponent],
  templateUrl: './picklist-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickListDemoComponent {
  protected comfortableSource: InoPickListOption[] = SEED_SOURCE.map((o) => ({ ...o }));
  protected comfortableTarget: InoPickListOption[] = SEED_TARGET.map((o) => ({ ...o }));
  protected comfortableSourceSelection: string[] = [];
  protected comfortableTargetSelection: string[] = [];

  protected compactSource: InoPickListOption[] = SEED_SOURCE.map((o) => ({ ...o }));
  protected compactTarget: InoPickListOption[] = SEED_TARGET.map((o) => ({ ...o }));
  protected compactSourceSelection: string[] = [];
  protected compactTargetSelection: string[] = [];

  protected readonly disabledSource: InoPickListOption[] = SEED_SOURCE.map((o) => ({ ...o }));
  protected readonly disabledTarget: InoPickListOption[] = SEED_TARGET.map((o) => ({ ...o }));
}
