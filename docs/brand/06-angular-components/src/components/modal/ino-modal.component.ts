import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoCardComponent } from '../card/ino-card.component';

let modalIdCounter = 0;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * `<ino-modal>` — dialog / bottom-sheet shell. Contract: INO-83, per
 * 02-design-tokens/angular-theme-contract.md §4 ("spartan/ui provides behavior only") — no
 * spartan/ui dependency has actually been adopted into this repo yet, so focus-trap/Escape/
 * backdrop-close are hand-rolled here against the WAI-ARIA APG dialog pattern directly; swapping
 * in spartan/ui's primitive later should only touch this file, not its consumers, per that
 * section's "primitive-library upgrade should never require a re-theme" rule.
 *
 * Composes `<ino-card variant="overlay">` for the panel (`--ino-elevation-2`,
 * `--ino-color-surface-raised`) plus its own scrim div bound to `--ino-color-overlay-scrim`,
 * exactly the token pairing named in the issue — this component does not invent new surface/
 * elevation values.
 *
 * Two-way binding contract: use `[(open)]="flag"` from the caller. Escape/backdrop-click/the
 * built-in close button all flip `open` to `false` locally *and* emit `openChange`/`closed`; if
 * the caller only does a one-way `[open]="flag"` without also handling `openChange`, the next
 * change-detection pass will re-open the modal from the stale parent value — same contract as
 * any other Angular two-way-bindable component (e.g. `mat-dialog`-style open flags).
 *
 * Focus behavior: captures `document.activeElement` on open, moves focus to the first focusable
 * element inside the panel, traps `Tab`/`Shift+Tab` within it, and restores focus to the
 * previously-focused element on close — the WCAG 2.2 / WAI-ARIA modal dialog requirement, not an
 * enhancement.
 */
@Component({
  selector: 'ino-modal',
  standalone: true,
  imports: [CommonModule, InoCardComponent],
  templateUrl: './ino-modal.component.html',
  styleUrl: './ino-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoModalComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() heading = '';
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;

  @Output() closed = new EventEmitter<void>();
  @Output() openChange = new EventEmitter<boolean>();

  @ViewChild('panel') private panelRef?: ElementRef<HTMLElement>;

  protected readonly headingId = `ino-modal-heading-${++modalIdCounter}`;
  private previouslyFocused: HTMLElement | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      this.syncOpenState();
    }
  }

  ngOnDestroy(): void {
    if (this.open && typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.closeOnEscape) {
        event.stopPropagation();
        this.requestClose();
      }
      return;
    }

    if (event.key === 'Tab') {
      const items = this.focusableElements();
      if (!items.length) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.requestClose();
    }
  }

  requestClose(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.openChange.emit(false);
    this.closed.emit();
    this.syncOpenState();
  }

  private syncOpenState(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.open) {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      queueMicrotask(() => this.focusFirst());
    } else {
      document.body.style.overflow = '';
      this.previouslyFocused?.focus();
      this.previouslyFocused = null;
    }
  }

  private focusableElements(): HTMLElement[] {
    if (!this.panelRef) {
      return [];
    }
    return Array.from(this.panelRef.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null,
    );
  }

  private focusFirst(): void {
    const [first] = this.focusableElements();
    (first ?? this.panelRef?.nativeElement)?.focus();
  }
}
