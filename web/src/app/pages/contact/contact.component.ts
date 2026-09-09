import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoHeroComponent } from '../../components/hero/ino-hero.component';
import { InoCardComponent } from '../../components/card/ino-card.component';
import { InoInputComponent } from '../../components/input/ino-input.component';
import { InoSelectComponent, InoSelectOption } from '../../components/select/ino-select.component';
import { InoButtonComponent } from '../../components/button/ino-button.component';
import { InoToastContainerComponent } from '../../components/toast-container/ino-toast-container.component';
import { ToastService } from '../../services/toast.service';

/**
 * `/contact` — the last page in the approved sitemap (`08-website-sitemap.md` §1). Reuses the
 * exact form-control set built for `/docs/design-system` (INO-83) rather than inventing new
 * markup: `ino-input` × name/email/company, `ino-select` for the reason, a plain native
 * `<textarea>` (no `ino-textarea` component exists yet, so this stays a bare token-styled control
 * rather than a fake wrapper), `ino-button` to submit.
 *
 * No backend exists yet, so submit is client-side only — it validates, then confirms via
 * `ToastService` and resets the form. Swap in a real endpoint when one exists; don't block the
 * page on that per the INO-14 non-commercial hold (this is a contact form, not a purchase flow,
 * so no disclaimer block is required here — see `legal/disclosures` for where that lives).
 */
@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    InoHeroComponent,
    InoCardComponent,
    InoInputComponent,
    InoSelectComponent,
    InoButtonComponent,
    InoToastContainerComponent,
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  private readonly toastService = inject(ToastService);

  protected readonly reasonOptions: InoSelectOption[] = [
    { label: 'General inquiry', value: 'general' },
    { label: 'Partnership', value: 'partnership' },
    { label: 'Careers', value: 'careers' },
    { label: 'Press', value: 'press' },
  ];

  protected name = '';
  protected email = '';
  protected company = '';
  protected reason = 'general';
  protected message = '';

  protected nameError = '';
  protected emailError = '';
  protected messageError = '';

  protected submitted = false;

  protected onMessageInput(event: Event): void {
    this.message = (event.target as HTMLTextAreaElement).value;
  }

  protected submit(): void {
    this.nameError = this.name.trim() ? '' : 'Tell us your name.';
    this.emailError = /.+@.+\..+/.test(this.email) ? '' : 'Enter a valid email.';
    this.messageError = this.message.trim() ? '' : 'Add a message so we know why you\'re writing.';

    if (this.nameError || this.emailError || this.messageError) {
      return;
    }

    this.toastService.show({
      status: 'success',
      heading: 'Message sent',
      message: "We'll get back to you at " + this.email + '.',
    });

    this.submitted = true;
    this.name = '';
    this.email = '';
    this.company = '';
    this.reason = 'general';
    this.message = '';
  }
}
