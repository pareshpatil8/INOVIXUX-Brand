import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Template slots for `<ino-timeline>`, one structural directive per slot — same rationale as
 * `ino-virtual-scroller.templates.ts`: a directive selector is a compile-time-checked contract,
 * unlike PrimeNG's stringly-typed `#template` reference convention.
 */

/** Renders one event's main content. Context: `$implicit` = the event, `index` = its position. */
@Directive({ selector: '[inoTimelineContent]', standalone: true })
export class InoTimelineContentDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Renders one event's opposite-side content (PrimeNG's "opposite" slot — typically a timestamp).
 * Omitted by a consumer, that side of the row stays empty rather than collapsing the grid track,
 * so mixed rows (some events with a timestamp, some without) stay column-aligned.
 */
@Directive({ selector: '[inoTimelineOpposite]', standalone: true })
export class InoTimelineOppositeDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Renders a custom marker in place of the default status dot. Context adds `role` — the resolved
 * `InoTimelineMarkerRole` for this event — so a custom marker (e.g. an icon) can still key off it.
 */
@Directive({ selector: '[inoTimelineMarker]', standalone: true })
export class InoTimelineMarkerDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Every slot directive, for a consumer that wants to import the set in one go. */
export const INO_TIMELINE_TEMPLATES = [
  InoTimelineContentDirective,
  InoTimelineOppositeDirective,
  InoTimelineMarkerDirective,
] as const;
