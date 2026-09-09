import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoButtonComponent } from '../../../components/button/ino-button.component';
import { InoInputComponent } from '../../../components/input/ino-input.component';
import { InoSelectComponent, InoSelectOption } from '../../../components/select/ino-select.component';
import { InoCheckboxComponent } from '../../../components/checkbox/ino-checkbox.component';
import { InoRadioGroupComponent, InoRadioOption } from '../../../components/radio-group/ino-radio-group.component';
import { InoToggleComponent } from '../../../components/toggle/ino-toggle.component';
import { InoModalComponent } from '../../../components/modal/ino-modal.component';
import { InoAlertComponent, InoAlertStatus } from '../../../components/alert/ino-alert.component';
import { InoToastContainerComponent } from '../../../components/toast-container/ino-toast-container.component';
import { ToastService } from '../../../services/toast.service';

const TOAST_MESSAGE: Record<InoAlertStatus, string> = {
  success: 'Changes saved.',
  warning: 'This action needs a second reviewer.',
  danger: 'Could not reach the verification service.',
};

/**
 * `/docs/design-system` — INO-83 showcase for the core interactive component set (buttons, form
 * controls, modal, toast/alert/banner). Structural components (nav, hero, cards, tiers) already
 * live on the homepage (`pages/home/`) — this page doesn't re-demo those, it links out to them,
 * so the two showcases don't drift into duplicate/competing copies of the same component.
 *
 * Mounts its own `<ino-toast-container>` for the toast demo below rather than one shared instance
 * at the app shell — `ToastService` is `providedIn: 'root'` either way, so a real app only needs
 * one container mounted near `app-root`; this page-local one keeps the INO-83 demo self-contained
 * without touching the app shell (owned by the concurrent INO-84 routing work).
 */
@Component({
  selector: 'app-docs-design-system',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    InoButtonComponent,
    InoInputComponent,
    InoSelectComponent,
    InoCheckboxComponent,
    InoRadioGroupComponent,
    InoToggleComponent,
    InoModalComponent,
    InoAlertComponent,
    InoToastContainerComponent,
  ],
  templateUrl: './docs-design-system.component.html',
  styleUrl: './docs-design-system.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsDesignSystemComponent {
  private readonly toastService = inject(ToastService);

  protected buttonLoading = false;
  protected modalOpen = false;

  protected inputValue = '';
  protected inputError = '';

  protected readonly selectOptions: InoSelectOption[] = [
    { label: 'Standard', value: 'standard' },
    { label: 'Enterprise', value: 'enterprise' },
  ];
  protected selectValue = '';

  protected checkboxChecked = false;

  protected readonly radioOptions: InoRadioOption[] = [
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
  ];
  protected radioValue = 'email';

  protected toggleChecked = true;

  protected openModal(): void {
    this.modalOpen = true;
  }

  protected onModalOpenChange(open: boolean): void {
    this.modalOpen = open;
  }

  protected simulateLoading(): void {
    if (this.buttonLoading) {
      return;
    }
    this.buttonLoading = true;
    setTimeout(() => (this.buttonLoading = false), 1600);
  }

  protected validateInput(): void {
    this.inputError = this.inputValue.trim() ? '' : 'This field is required.';
  }

  protected showToast(status: InoAlertStatus): void {
    this.toastService.show({ status, message: TOAST_MESSAGE[status] });
  }
}
