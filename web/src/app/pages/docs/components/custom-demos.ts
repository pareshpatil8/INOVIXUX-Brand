import { Type } from '@angular/core';

import { CheckboxPresentabilityDemoComponent } from './demos/checkbox-presentability-demo.component';
import { RadioPresentabilityDemoComponent } from './demos/radio-presentability-demo.component';
import { DatepickerTimeDemoComponent } from './demos/datepicker-time-demo.component';
import { FeatureGridDemoComponent } from './demos/feature-grid-demo.component';
import { FooterDemoComponent } from './demos/footer-demo.component';
import { HeroDemoComponent } from './demos/hero-demo.component';
import { MetricPanelDemoComponent } from './demos/metric-panel-demo.component';
import { TierCardDemoComponent } from './demos/tier-card-demo.component';
import { InputNumberDemoComponent } from './demos/inputnumber-demo.component';
import { ListboxDemoComponent } from './demos/listbox-demo.component';
import { InputTagsDemoComponent } from './demos/inputtags-demo.component';
import { TreeSelectDemoComponent } from './demos/treeselect-demo.component';
import { InputMaskDemoComponent } from './demos/inputmask-demo.component';
import { SliderDemoComponent } from './demos/slider-demo.component';
import { AutocompleteDemoComponent } from './demos/autocomplete-demo.component';
import { KeyfilterDemoComponent } from './demos/keyfilter-demo.component';
import { ToggleButtonDemoComponent } from './demos/toggle-button-demo.component';
import { PasswordDemoComponent } from './demos/password-demo.component';
import { CascadeSelectDemoComponent } from './demos/cascade-select-demo.component';
import { SelectButtonDemoComponent } from './demos/select-button-demo.component';

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
  'inputnumber': InputNumberDemoComponent,
  'listbox': ListboxDemoComponent,
  'inputtags': InputTagsDemoComponent,
  'treeselect': TreeSelectDemoComponent,
  'inputmask': InputMaskDemoComponent,
  'slider': SliderDemoComponent,
  'autocomplete': AutocompleteDemoComponent,
  // Not a composition problem like the rest of this map: the generic renderer mounts via
  // `*ngComponentOutlet` with `inputs` only and can never project content, and
  // `<ino-keyfilter>`'s whole template is `<ng-content>` — so it renders nothing at all there.
  'keyfilter': KeyfilterDemoComponent,
  // Three stacked generic-renderer gaps, not a composition problem: `defaultValueFor()` returns
  // `''` for every string input (so `onLabel`/`offLabel` lose their documented `'Yes'`/`'No'`
  // defaults and the label element is `*ngIf`'d away — an empty, unlabeled button), `size` is a
  // type alias the manifest extractor can't enumerate (so no size row was generated), and
  // `pressed` — the state that defines the component — isn't in `STATE_INPUT_NAMES`.
  'toggle-button': ToggleButtonDemoComponent,
  // Four stacked generic-renderer gaps (INO-691, fixing INO-407 QA rejection): `defaultValueFor()`
  // forces `showStrengthMeter` to `false` despite the component's real default being `true`
  // (boolean defaults are ignored entirely), can never render the policy hint panel (`policyRules`
  // defaults to `[]`), never renders a Size axis (`size` is a type-alias input the manifest
  // extractor can't enumerate), and never demonstrates label/hint/error text (all string inputs
  // forced to `''`).
  'password': PasswordDemoComponent,
  // The whole component is a tree walk (INO-731, fixing INO-423): `defaultValueFor()` gives
  // `options` an empty `[]`, so the generic renderer had nothing to drill into — no breadcrumb, no
  // `open-level` state, no `aria-activedescendant`, and (because `error` is string-typed, not in
  // the boolean-only `STATE_INPUT_NAMES` filter) no invalid example either.
  'cascade-select': CascadeSelectDemoComponent,
  // The component's whole visible surface is `*ngFor="let option of options"` (INO-746, fixing
  // INO-411): `defaultValueFor()` gives `options` an empty `[]`, so every section of the page —
  // live example, density axis, size axis, states — rendered a labelled empty `<div>` with zero
  // `<ino-select-button-option>` elements in it. Behind that, `size` is a type-alias input the
  // manifest extractor can't enumerate (no size row), and `multiple` — the input that picks
  // between the radiogroup and checkbox-group patterns, i.e. the two variants — isn't in
  // `STATE_INPUT_NAMES`.
  'select-button': SelectButtonDemoComponent,
};
