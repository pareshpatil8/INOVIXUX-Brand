/**
 * India-stack mask presets (doc 26 §5 Phase B1 row — "India-stack mask presets shipped as
 * tokens"). A typed constants module, the same "tokens live in a shared TS file, not duplicated
 * per call site" convention `InoControlSize`/`INO_CONTROL_SIZES` (`../control-size.ts`) already
 * established — these aren't CSS custom properties (a mask pattern isn't a themeable value), so
 * they ship as a plain data module both the web component and the RN/Flutter ports import from
 * their own platform-native copy (see SPEC.md §5 for the port-parity note).
 */
export type InoInputMaskPreset = 'pan' | 'gstin' | 'ifsc' | 'phone' | 'date';

export interface InoInputMaskPresetDef {
  mask: string;
  placeholderChar?: string;
  /** Shown as a demo hint on the docs page; not read by the component itself. */
  example: string;
}

export const INO_INPUTMASK_PRESETS: Record<InoInputMaskPreset, InoInputMaskPresetDef> = {
  // 5 letters + 4 digits + 1 letter — e.g. ABCDE1234F.
  pan: { mask: 'AAAAA9999A', example: 'ABCDE1234F' },
  // 2-digit state code + 10-char PAN + 1-digit entity code + literal 'Z' + 1 alnum checksum.
  gstin: { mask: '99AAAAA9999A9Z*', example: '22ABCDE1234F1Z5' },
  // 4 letters + literal '0' (reserved for future use by RBI) + 6 alnum branch code.
  ifsc: { mask: 'AAAA0******', example: 'HDFC0001234' },
  // India mobile number with country-code prefix; '\9\1' escapes the literal digits '9' and '1'
  // in "+91" so they aren't mistaken for the `9` digit-slot token.
  phone: { mask: '+\\91 99999 99999', example: '+91 98765 43210' },
  // DD/MM/YYYY.
  date: { mask: '99/99/9999', example: '31/01/2026' },
};
