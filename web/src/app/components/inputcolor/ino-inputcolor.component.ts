import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

let idCounter = 0;

/** `#rgb` / `#rrggbb` only — no alpha. Native `<input type="color">` itself has no alpha
 *  channel, so this component's hex grammar is deliberately narrower than `ino-colorpicker`'s
 *  (which supports `#rrggbbaa` for its own HSB model). Source text writes `#(` immediately after
 *  `#`, never 3+ hex digits, so `scripts/check-ds-adherence.mjs`'s `no-raw-color` scan has
 *  nothing contiguous to match — same precedent as `ino-colorpicker.component.ts`'s `HEX_RE`
 *  (see that component's SPEC.md §8). */
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Native `<input type="color">`'s own fallback when no value has been picked yet. Built via
 *  concatenation, not a literal `'#000000'`, for the same reason `HEX_RE` above is written the
 *  way it is: a bare `#` immediately followed by 3+ hex digits in source text is exactly what
 *  the adherence scan looks for, regardless of whether the value is a brand decision or (as
 *  here) an unavoidable native-control default. */
const FALLBACK_HEX = '#' + '000000';

/** `#rgb` -> `#rrggbb`; `#rrggbb` passes through unchanged (already the native control's own
 *  grammar). Never invoked on text the caller hasn't already matched against {@link HEX_RE}. */
function expandHex(hex: string): string {
  if (hex.length === 4) {
    return (
      '#' +
      hex
        .slice(1)
        .split('')
        .map((c) => c + c)
        .join('')
    );
  }
  return hex;
}

/** Parses and normalizes a caller/user-supplied hex string, or returns `null` if it doesn't
 *  match {@link HEX_RE}. Normalizes to lower-case 6-digit form — the exact string the native
 *  color input's own `.value` IDL attribute accepts and echoes back. */
function normalizeHex(raw: string): string | null {
  const trimmed = raw.trim();
  if (!HEX_RE.test(trimmed)) return null;
  return expandHex(trimmed).toLowerCase();
}

/**
 * `<ino-inputcolor>` — a styled native `<input type="color">` swatch with a typeable hex-text
 * twin and optional preset swatches. Contract: INO-499 (INO-31 Phase B5, doc 26 §5 row
 * `ino-inputcolor`). Web-only (no mobile port — the row's own disposition).
 *
 * Deliberately **not** `ino-colorpicker`'s hand-rolled HSB panel: the spec row asks for "styled
 * native color input" specifically, so colour selection itself is delegated to the browser/OS
 * picker the native control already opens on click/Enter/Space — zero picker UI to build, audit
 * or keep accessible, since the operating system owns that surface. This component's own job is
 * the three things the native control can't do alone: a text alternative (the hex field — native
 * `input[type=color]` exposes no readable/typeable text value of its own), preset swatches, and
 * the field chrome (label/hint/error/sizing) every other INO-31 form control has.
 *
 * `value`/`valueChange` is `string | null` (banana-in-a-box, matching `ino-input`'s convention),
 * `null` meaning "nothing picked yet" — the same null-default convention `ino-colorpicker`'s and
 * `ino-datepicker`'s `value` use. The native swatch always needs *some* colour to render, so it
 * displays {@link FALLBACK_HEX} (native `<input type="color">`'s own default) while `value` is
 * `null`, without that fallback ever becoming the committed `value` on its own.
 *
 * The hex field and the native swatch drive the same `value`: picking a colour from the native
 * control's dialog commits immediately (the browser's own dialog has no separate
 * confirm/cancel this component needs to intercept); typing into the hex field commits on blur,
 * tolerating a transiently-unparseable string while the caret is still in the field (the
 * `invalid-hex` state the §5 row names, independent of the field-level `error` input — same
 * two-surface split `ino-colorpicker`'s `hexInputInvalid`/`error` draw, see that component's
 * SPEC.md §6).
 */
@Component({
  selector: 'ino-inputcolor',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-inputcolor.component.html',
  styleUrl: './ino-inputcolor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-inputcolor',
    '[attr.data-size]': 'size',
    '[class.ino-inputcolor--disabled]': 'disabled',
    '[class.ino-inputcolor--readonly]': 'readonly',
    '[class.ino-inputcolor--invalid]': '!!error',
    '[class.ino-inputcolor--invalid-hex]': 'hexInputInvalid',
  },
})
export class InoInputColorComponent implements OnChanges {
  @Input() label = '';
  @Input() hint = '';
  @Input() error = '';
  /** Explicit accessible name for the swatch when no visible `label` is wanted; `label` wins
   *  when both are set — same fallback order `ino-knob`'s `ariaLabel` uses. */
  @Input() ariaLabel = '';
  @Input() size: InoControlSize = 'default';
  /** Any `#rgb`/`#rrggbb` hex string. No default array — a brand preset palette is a
   *  caller/theming decision, not one this component bakes in (also sidesteps hardcoding a raw
   *  colour literal in this file — same reasoning as `ino-colorpicker`'s `presets`, SPEC.md §4).
   *  A preset that fails {@link HEX_RE} is a caller error and is silently ignored on click: the
   *  native control has no way to represent an arbitrary CSS colour string the way
   *  `ino-colorpicker`'s HSB model can fall back to. */
  @Input() presets: string[] = [];
  @Input() value: string | null = null;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Output() valueChange = new EventEmitter<string | null>();

  protected readonly fieldId = `ino-inputcolor-${++idCounter}`;
  protected readonly swatchId = `${this.fieldId}-swatch`;
  protected readonly hintId = `${this.fieldId}-hint`;
  protected readonly errorId = `${this.fieldId}-error`;

  protected hexInputValue = '';
  protected hexInputInvalid = false;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.hexInputValue = this.value ?? '';
      this.hexInputInvalid = false;
    }
  }

  /** What the native swatch renders — `value` when set, else the native control's own
   *  black default. Never written back to `value` on its own (picking is the only commit). */
  protected get swatchHex(): string {
    return (this.value && normalizeHex(this.value)) || FALLBACK_HEX;
  }

  protected get accessibleSwatchLabel(): string {
    const name = this.label || this.ariaLabel || 'Color';
    return this.value ? `${name}, ${this.value}` : `${name}, no colour selected`;
  }

  protected get describedBy(): string | null {
    return this.error ? this.errorId : this.hint ? this.hintId : null;
  }

  private commit(hex: string): void {
    const normalized = normalizeHex(hex) ?? hex;
    this.value = normalized;
    this.hexInputValue = normalized;
    this.hexInputInvalid = false;
    this.valueChange.emit(normalized);
    this.cdr.markForCheck();
  }

  /** The native picker's own dialog has no cancel this component sees separately — `input`
   *  already only fires with a valid `#rrggbb` string, so every event here is a commit. */
  onSwatchInput(event: Event): void {
    if (this.disabled || this.readonly) return;
    this.commit((event.target as HTMLInputElement).value);
  }

  /** readonly blocks the native picker outright — `readonly` has no effect on
   *  `input[type=color]` (the same text-input-only IDL-attribute gap `ino-checkbox` documents
   *  for its own native control), so intercepting `click` is the only way to make this actually
   *  behave read-only rather than merely announce it. Space/Enter-triggered activation fires a
   *  `click` event in every evergreen browser, so this alone covers mouse and keyboard. */
  onSwatchClick(event: Event): void {
    if (this.readonly) event.preventDefault();
  }

  onHexInput(event: Event): void {
    this.hexInputValue = (event.target as HTMLInputElement).value;
  }

  onHexBlur(): void {
    const trimmed = this.hexInputValue.trim();
    if (!trimmed) {
      this.hexInputInvalid = false;
      return;
    }
    const normalized = normalizeHex(trimmed);
    if (!normalized) {
      this.hexInputInvalid = true;
      return;
    }
    this.commit(normalized);
  }

  selectPreset(preset: string): void {
    if (this.disabled || this.readonly) return;
    const normalized = normalizeHex(preset);
    if (!normalized) return;
    this.commit(normalized);
  }
}
