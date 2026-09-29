import { Type } from '@angular/core';

import { CheckboxPresentabilityDemoComponent } from './demos/checkbox-presentability-demo.component';
import { RadioPresentabilityDemoComponent } from './demos/radio-presentability-demo.component';
import { DatepickerTimeDemoComponent } from './demos/datepicker-time-demo.component';
import { FeatureGridDemoComponent } from './demos/feature-grid-demo.component';
import { FooterDemoComponent } from './demos/footer-demo.component';
import { HeroDemoComponent } from './demos/hero-demo.component';
import { MetricPanelDemoComponent } from './demos/metric-panel-demo.component';
import { TierCardDemoComponent } from './demos/tier-card-demo.component';

/**
 * Slug -> hand-authored demo component, for components whose §2 Component Publish Contract
 * coverage (docs 26 §2 — variants, states, sizing, density, labels, group validation, dense-table
 * usage) can't be produced by `docs-component-detail.component.ts`'s generic single-axis
 * `@Input`-driven grid. Checked before the generic renderer in the detail page template; every
 * other slug falls through to that renderer unchanged.
 *
 * Hand-authored, unlike `./generated/component-registry.ts` — add an entry here only when a
 * component's demo genuinely needs bespoke composition (a group + validation + table usage), not
 * as a default for every new component.
 */
export const CUSTOM_DEMOS: Record<string, Type<unknown>> = {
  'radio-group': RadioPresentabilityDemoComponent,
  'checkbox': CheckboxPresentabilityDemoComponent,
  'datepicker': DatepickerTimeDemoComponent,
  'feature-grid': FeatureGridDemoComponent,
  'footer': FooterDemoComponent,
  'hero': HeroDemoComponent,
  'metric-panel': MetricPanelDemoComponent,
  'tier-card': TierCardDemoComponent,
};
