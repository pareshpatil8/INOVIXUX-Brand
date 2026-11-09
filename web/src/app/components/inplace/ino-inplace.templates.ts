import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Template slots for `<ino-inplace>`, one structural directive per slot — the same
 * directive-per-slot shape `ino-dataview`/`ino-timeline`/`ino-virtual-scroller` use (see their
 * `.templates.ts` doc comments) rather than PrimeNG's `pTemplate="…"` string-ref convention,
 * which a local `#ref` + `@ContentChild('name')` pair can't check at compile time.
 *
 * Context is `void` for both — the display/edit content is the consumer's own template, not a
 * per-item render; `ino-inplace` has nothing to hand back through the outlet.
 */

/** The content shown while `editing` is `false` — wrapped in the host's clickable trigger. */
@Directive({ selector: '[inoInplaceDisplay]', standalone: true })
export class InoInplaceDisplayDirective {
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

/** The content shown while `editing` is `true`. Mounted only once `editing` flips (SPEC.md §3,
 *  "lazy content") — never instantiated up front and hidden. */
@Directive({ selector: '[inoInplaceEdit]', standalone: true })
export class InoInplaceEditDirective {
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

export const INO_INPLACE_TEMPLATES = [InoInplaceDisplayDirective, InoInplaceEditDirective];
