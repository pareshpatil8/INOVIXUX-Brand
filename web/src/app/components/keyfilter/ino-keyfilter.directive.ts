import { Directive, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { InoKeyfilterContext, InoKeyfilterPreset, createKeyfilterTest } from './keyfilter-presets';

/**
 * `[inoKeyfilter]` — blocks keystrokes that don't match a preset (`int` / `num` / `alpha` /
 * `alphanum`) or a custom `pattern`, on the host `<input>`/`<textarea>` it's attached to. Contract:
 * INO-420 (INO-31 Phase B1, doc 26 §2/§5). Parity benchmark: PrimeNG's `pKeyFilter` directive —
 * PrimeNG is a benchmark, not a runtime dependency; nothing here imports it.
 *
 * A **behaviour-only primitive**, same category as `[inoFocusTrap]` (`../focus-trap/`): it renders
 * nothing of its own and has no visual states, sizing, or label API — doc 26 §5's row for this
 * component records Variants/States/Sizing/Labels as `n/a (directive)` for exactly that reason.
 * Unlike `<ino-inputmask>`, a keystroke the `keydown` path allows always lands unchanged — it
 * either lands as typed or doesn't land at all (the paste path is the one exception; see
 * `onPaste` and SPEC.md §3, which does write the field's value). Callers who need
 * masking/formatting want `<ino-inputmask>` instead; this is for a plain `<ino-input>` that just
 * needs to refuse the wrong character class (amount fields, numeric IDs, name fields).
 *
 * **Must-not-block-IME/AT contract (doc 26 §5 a11y row).** Filtering happens *only* in the
 * `keydown` handler, and only for a single printable character with no modifier held — and that
 * handler returns immediately whenever `event.isComposing` (or the legacy `keyCode === 229`
 * some browsers/WebViews still use instead) is true. An IME composing non-Latin text is never
 * tested against the (inherently Latin/numeric) preset regexes, so composition is never
 * interrupted and the composed result is never retroactively stripped — see SPEC.md §2 for why
 * there is deliberately no `input`-event resync filter, unlike `<ino-inputmask>`'s. Non-printable
 * and modifier-combo keys (Tab, Backspace, Delete, arrows, Home/End, Enter, Ctrl/Cmd/Alt
 * shortcuts — copy, paste, undo, select-all, screen-reader command keys) are never intercepted,
 * so assistive technology retains every key it needs.
 */
@Directive({
  selector: '[inoKeyfilter]',
  standalone: true,
  host: {
    '(keydown)': 'onKeydown($event)',
    '(paste)': 'onPaste($event)',
  },
})
export class InoKeyfilterDirective {
  /** Named preset; ignored (in favor of `pattern`) when set to `'regex'`. */
  @Input('inoKeyfilter') preset: InoKeyfilterPreset = 'int';
  /** Custom per-character pattern, used only when `preset === 'regex'`. Tested one character at a
   *  time, same as every built-in preset — no anchors needed. */
  @Input() pattern: string | RegExp = '';
  /** When a paste contains disallowed characters: strip them and insert the rest (default), or
   *  reject the whole paste when `false`. Either way `inoKeyfilterReject` fires once. */
  @Input({ transform: booleanAttribute }) validateOnPaste = true;
  /** Fires with the rejected character (keydown) or the full rejected clipboard text (paste).
   *  Nothing is announced to assistive technology by default — see SPEC.md §3 for why, and for
   *  the `aria-live` pattern a caller can wire to this output if it wants one. */
  @Output() readonly inoKeyfilterReject = new EventEmitter<string>();

  private get test(): (ch: string, ctx: InoKeyfilterContext) => boolean {
    return createKeyfilterTest(this.preset, this.pattern);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length !== 1) return;

    const input = event.target as HTMLInputElement;
    // Same base-value construction `onPaste` uses below: when the keystroke replaces a
    // non-empty selection, the selected text is about to disappear, so the position-sensitive
    // rules (leading `-`, single `.`) must evaluate against the value with that selection
    // already cut out — not the full pre-edit value, which still contains text that will never
    // exist once this key lands.
    const selStart = input.selectionStart ?? input.value.length;
    const selEnd = input.selectionEnd ?? selStart;
    const ctx: InoKeyfilterContext = {
      value: input.value.slice(0, selStart) + input.value.slice(selEnd),
      selectionStart: selStart,
    };
    if (!this.test(event.key, ctx)) {
      event.preventDefault();
      this.inoKeyfilterReject.emit(event.key);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text) return;

    const input = event.target as HTMLInputElement;
    const selStart = input.selectionStart ?? input.value.length;
    const selEnd = input.selectionEnd ?? selStart;
    const baseValue = input.value.slice(0, selStart) + input.value.slice(selEnd);

    let value = baseValue;
    let pos = selStart;
    let filtered = '';
    for (const ch of text) {
      if (this.test(ch, { value, selectionStart: pos })) {
        value = value.slice(0, pos) + ch + value.slice(pos);
        filtered += ch;
        pos++;
      }
    }

    if (filtered === text) return; // everything pasted was already allowed — let native paste run

    event.preventDefault();
    this.inoKeyfilterReject.emit(text);
    if (!this.validateOnPaste || !filtered) return;

    input.value = baseValue.slice(0, selStart) + filtered + baseValue.slice(selStart);
    const caret = selStart + filtered.length;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
