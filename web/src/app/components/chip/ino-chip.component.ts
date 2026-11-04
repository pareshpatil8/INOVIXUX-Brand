import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

/**
 * `<ino-chip>` — INO-462 (INO-31 Phase B4). Parity benchmark: PrimeNG 22.1.1 `Chip` — named as
 * "not-yet-built" in `ino-tag`'s own header comment, and the standalone promotion of the chip
 * idiom `ino-inputtags` already uses for its per-tag markup (doc 26 §5: "removable = button-in-
 * group contract (shares inputtags spec)"). Contract: SPEC.md, full write-up:
 * `docs/brand/06-angular-components/chip.md`.
 *
 * Static (a `<span>`, like `ino-tag`) or interactive (a `<button>`, `aria-pressed` toggle pattern
 * like `ino-toggle-button`), optionally `removable`. A `<button>` cannot contain another
 * `<button>`, so when `interactive && removable` the main button and the remove button are
 * rendered as siblings inside a `role="group"` wrapper — never nested. See SPEC.md §1.
 *
 * `removing` is a self-contained exit transition (not an `animate.leave` the consumer has to
 * wire up): clicking remove flips `removing`, announces "Removing {label}" via a live region,
 * then emits `remove` once the exit animation ends (or immediately under
 * `prefers-reduced-motion: reduce`, since `animationend` never fires for an animation that never
 * started). See SPEC.md §2 and §8.
 */
@Component({
  selector: 'ino-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-chip.component.html',
  styleUrl: './ino-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-chip-host',
    '[attr.data-size]': 'size',
    '[class.ino-chip-host--removable]': 'removable',
    '[class.ino-chip-host--removing]': 'removing',
    '[class.ino-chip-host--disabled]': 'disabled',
    '[class.ino-chip-host--readonly]': 'readonly',
  },
})
export class InoChipComponent {
  @Input() label = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) interactive = false;
  @Input({ transform: booleanAttribute }) removable = false;
  /** Only meaningful when `interactive`. See SPEC.md §7. */
  @Input({ transform: booleanAttribute }) pressable = false;
  @Input({ transform: booleanAttribute }) pressed = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Output() readonly chipClick = new EventEmitter<void>();
  @Output() readonly pressedChange = new EventEmitter<boolean>();
  @Output() readonly remove = new EventEmitter<void>();

  protected removing = false;

  protected get ariaPressedValue(): 'true' | 'false' | null {
    return this.interactive && this.pressable ? String(this.pressed) as 'true' | 'false' : null;
  }

  onChipClick(): void {
    if (this.disabled || this.readonly || this.removing || !this.interactive) {
      return;
    }
    if (this.pressable) {
      this.pressed = !this.pressed;
      this.pressedChange.emit(this.pressed);
    }
    this.chipClick.emit();
  }

  onRemoveClick(event: Event): void {
    event.stopPropagation();
    this.startRemoving();
  }

  /** Delete/Backspace on the main chip element — mirrors `ino-inputtags`' Backspace-removes-last
   *  pattern, applied per-chip. See SPEC.md §5. */
  onMainKeyDown(event: KeyboardEvent): void {
    if (!this.removable || this.disabled || this.readonly || this.removing) {
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.startRemoving();
    }
  }

  private startRemoving(): void {
    if (this.disabled || this.readonly || this.removing || !this.removable) {
      return;
    }
    this.removing = true;

    if (this.prefersReducedMotion()) {
      this.remove.emit();
      return;
    }
  }

  protected onRemoveAnimationEnd(): void {
    if (this.removing) {
      this.remove.emit();
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
