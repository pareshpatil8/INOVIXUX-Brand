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
import { FieldsetDemoComponent } from './demos/fieldset-demo.component';
import { ToolbarDemoComponent } from './demos/toolbar-demo.component';
import { BreadcrumbDemoComponent } from './demos/breadcrumb-demo.component';
import { PanelDemoComponent } from './demos/panel-demo.component';
import { PanelMenuDemoComponent } from './demos/panel-menu-demo.component';
import { DynamicDialogDemoComponent } from './demos/dynamic-dialog-demo.component';
import { MenuDemoComponent } from './demos/menu-demo.component';
import { DividerDemoComponent } from './demos/divider-demo.component';
import { AccordionDemoComponent } from './demos/accordion-demo.component';
import { CommandMenuDemoComponent } from './demos/command-menu-demo.component';
import { SplitterDemoComponent } from './demos/splitter-demo.component';
import { ContextMenuDemoComponent } from './demos/context-menu-demo.component';
import { OrderListDemoComponent } from './demos/orderlist-demo.component';
import { PickListDemoComponent } from './demos/picklist-demo.component';
import { TreeTableDemoComponent } from './demos/treetable-demo.component';
import { BadgeDemoComponent } from './demos/badge-demo.component';
import { DataViewDemoComponent } from './demos/dataview-demo.component';
import { AutofocusDemoComponent } from './demos/autofocus-demo.component';
import { TreeDemoComponent } from './demos/tree-demo.component';
import { AvatarDemoComponent } from './demos/avatar-demo.component';
import { AvatarGroupDemoComponent } from './demos/avatar-group-demo.component';
import { ChipDemoComponent } from './demos/chip-demo.component';
import { ImageDemoComponent } from './demos/image-demo.component';
import { SpeedDialDemoComponent } from './demos/speeddial-demo.component';
import { CarouselDemoComponent } from './demos/carousel-demo.component';
import { ColorpickerDemoComponent } from './demos/colorpicker-demo.component';
import { GalleriaDemoComponent } from './demos/galleria-demo.component';
import { TerminalDemoComponent } from './demos/terminal-demo.component';
import { KnobDemoComponent } from './demos/knob-demo.component';
import { InputColorDemoComponent } from './demos/inputcolor-demo.component';
import { EditorDemoComponent } from './demos/editor-demo.component';

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
  // The component is entirely slot-based content projection (`ng-content select="[slot='...']"`);
  // the generic renderer mounts via `*ngComponentOutlet` with `inputs` only and cannot project
  // content at all, so it would render an empty, unlabeled toolbar container with no visible
  // elements. Three slots (start/center/end), two density modes, and keyboard navigation (arrow
  // keys move focus) all require hand-authored examples with actual button/title/action content.
  'toolbar': ToolbarDemoComponent,
  // The whole visible surface besides the legend is projected content (grouped fields); the
  // generic renderer mounts via `*ngComponentOutlet` with `inputs` only and cannot project
  // content, so every example would render a labelled empty box. See `SPEC.md` for the full
  // state/sizing contract this demo exercises.
  'fieldset': FieldsetDemoComponent,
  // `items: InoBreadcrumbItem[]` hits the same `defaultValueFor()` gap `select-button`/
  // `cascade-select` hit (empty array default), and the whole visible surface is driven by that
  // array — the generic renderer would produce a labelled, empty `<nav>` in every section.
  'breadcrumb': BreadcrumbDemoComponent,
  // The whole visible surface besides `header` is projected content (body + `[ino-panel-footer]`);
  // same gap `fieldset`/`keyfilter` hit — the generic renderer mounts via `*ngComponentOutlet`
  // with `inputs` only and cannot project content, so every example would render a labelled empty
  // box. See `panel/SPEC.md` for the full state/sizing contract this demo exercises.
  'panel': PanelDemoComponent,
  // `items: InoPanelMenuItem[]` is the same recursive-array gap `breadcrumb`/`cascade-select` hit
  // (empty array default), and the whole visible surface — every accordion panel and nested group
  // — is driven by that array. See `panel-menu/SPEC.md` for the full state/sizing contract this
  // demo exercises.
  'panel-menu': PanelMenuDemoComponent,
  // `<ino-dynamic-dialog>` has zero `@Input`s — it is a slot driven entirely by
  // `InoDynamicDialogService`, not a component the generic `*ngComponentOutlet`-with-inputs
  // renderer can demonstrate anything through. See `dynamic-dialog-demo.component.ts`.
  'dynamic-dialog': DynamicDialogDemoComponent,
  // `items: InoMenuItem[]` is the same recursive-array gap `breadcrumb`/`panel-menu` hit (empty
  // array default), and the whole visible surface — flat list, grouped sections, nested submenu
  // — is driven by that array. See `menu/SPEC.md` for the full state/sizing contract this demo
  // exercises.
  'menu': MenuDemoComponent,
  // `size` is the generic renderer's only recognized sizing-axis name; `thickness` isn't it, so
  // no "Size axis" section ever rendered (INO-789, fixing the INO-442 QA rejection). Same
  // `defaultValueFor()` gap as `slider`/`password` forces `label` to `''`, so the labelled form
  // (SPEC.md §1) had zero live coverage either.
  'divider': DividerDemoComponent,
  // The whole visible surface besides `header` is projected content (tab body); same gap
  // `panel`/`fieldset` hit — the generic renderer mounts via `*ngComponentOutlet` with `inputs`
  // only and cannot project content, so every example would render labelled empty accordion shells.
  // Additionally, the two-component architecture (container + tab) requires hand-authored composition
  // to demonstrate single/multiple expand, icon position, nested accordions, and keyboard navigation
  // per the APG accordion pattern. See `accordion/SPEC.md` for the full state/sizing contract.
  'accordion': AccordionDemoComponent,
  // `groups`/`recentItems: InoCommandMenuGroup[]/InoCommandMenuItem[]` hit the same
  // `defaultValueFor()` empty-array gap `menu`/`breadcrumb` hit, and `open` defaults to `false` —
  // the generic renderer would mount a permanently-closed, empty palette with nothing to
  // demonstrate in any section. See `command-menu-demo.component.ts`.
  'command-menu': CommandMenuDemoComponent,
  // Same gap `panel`/`fieldset`/`accordion`/`toolbar` all hit: the whole visible surface is
  // content-projected `<ino-splitter-panel>` children, and the generic renderer mounts via
  // `*ngComponentOutlet` with `[inputs]` only — it can never project content, so every example
  // would render a zero-height empty shell. See `splitter/SPEC.md` for the full contract.
  'splitter': SplitterDemoComponent,
  // The component is directive-driven: `[inoContextMenu]` attaches to a separate trigger element
  // and handles the right-click binding. The generic `*ngComponentOutlet`-with-inputs renderer can
  // instantiate the component but cannot apply the directive to a host template, so `items` stays
  // `[]` and `visible` stays `false` → a permanently-closed, empty menu with no right-click target.
  'context-menu': ContextMenuDemoComponent,
  // `options`/`value` (order + selection) can't be seeded by the generic renderer's
  // `defaultValueFor()` (empty array), and the move-button/reorder flow needs real data plus
  // two-way wiring of `optionsChange`/`valueChange` to be exercisable at all. See
  // `orderlist/SPEC.md`.
  'orderlist': OrderListDemoComponent,
  // Two paired array inputs (`source`/`target`) plus two selection arrays — the generic
  // single-axis `@Input` grid has no concept of a component with two independently-bound list
  // inputs. See `picklist/SPEC.md`.
  'picklist': PickListDemoComponent,
  // `data: InoTreeTableNode[]` is the same recursive-array gap `menu`/`breadcrumb`/`panel-menu` hit
  // (empty array default), and the whole visible surface — tree structure, expand/collapse, frozen
  // columns, 2D navigation — is driven by that array. Additionally, implements WAI-ARIA treegrid
  // pattern (role=treegrid) requiring keyboard navigation examples. See `treetable/SPEC.md`.
  'treetable': TreeTableDemoComponent,
  // Three variants with fundamentally different semantics and a11y contracts (INO-460): `dot`
  // (decorative vs informative with ariaLabel), `count` (with 99+ overflow and required ariaLabel),
  // `status` (labeled with severity colors). Additionally, the positioned-on-child vs standalone
  // modes, the sm/md sizing matrix, and the severity color palette all require hand-authored
  // composition to demonstrate live. See `badge/SPEC.md` for the full contract.
  'badge': BadgeDemoComponent,
  // `value: readonly unknown[]` hits the same `defaultValueFor()` empty-array gap `menu`/
  // `breadcrumb`/`panel-menu` hit, and the item rendering itself is two `ng-template` structural
  // directives (`inoDataViewListItem`/`inoDataViewGridItem`) — the generic `*ngComponentOutlet`-
  // with-inputs renderer can never project template content, so every example would render a
  // labelled, permanently-empty list. See `dataview/SPEC.md` for the full state/sizing contract.
  'dataview': DataViewDemoComponent,
  // Behaviour-only directive: its whole template is `<ng-content>`, so the generic renderer mounts
  // it and shows nothing at all — the same disposition `keyfilter` records. The demo has to compose
  // real focusable targets to show placement, `inoAutofocusDelay` and the opt-out. See
  // `autofocus/SPEC.md` §2.
  'autofocus': AutofocusDemoComponent,
  // `nodes: InoTreeNode[]` is the same recursive-array gap `treetable`/`menu`/`panel-menu`/
  // `breadcrumb`/`cascade-select` hit (empty array default), and the whole visible surface —
  // tree structure, expand/collapse, basic/checkbox selection, lazy loading, filter — is driven by
  // that array. See `tree/SPEC.md` for the full state/sizing contract.
  'tree': TreeDemoComponent,
  // `image`/`initials` are plain strings with no enum `values`, so the generic renderer would only
  // ever show empty circles — the same "generic demo ships empty" gap `badge`/`dataview` hit. See
  // `avatar/SPEC.md` for the full content-form/state/sizing contract.
  'avatar': AvatarDemoComponent,
  // `avatars: InoAvatarGroupItem[]` hits the same array-input gap `treetable`/`tree`/`menu` hit
  // (empty array default) — the whole visible surface (overlap, surplus count) is driven by that
  // array. See `avatar/SPEC.md` §5 for the full contract.
  'avatar-group': AvatarGroupDemoComponent,
  // Generic renderer mounts via `*ngComponentOutlet` with `inputs` only and can never project the
  // `[icon]`/`[avatar]` content slots or exercise the live removable-chip-list / interactive
  // toggle-chip behavior — the same content-projection gap `keyfilter` hit. See `chip/SPEC.md`.
  'chip': ChipDemoComponent,
  // `src`/`alt` are plain strings with no enum `values`, and the loading/error-fallback/zoomed
  // states plus the lightbox itself need deliberately-triggered conditions (a broken URL, an
  // opened dialog) the generic single-axis renderer can't produce. See `image/SPEC.md`.
  'image': ImageDemoComponent,
  // `items: InoSpeedDialItem[]` hits the array-input gap (empty array default → the dial opens
  // onto an empty menu), and the layout axes (type × direction × radius × mask) need composed
  // examples with expansion room the single-axis grid cannot stage. See `speeddial/SPEC.md`.
  'speeddial': SpeedDialDemoComponent,
  // The whole component is built from content-projected `<ino-carousel-item>` children (same gap
  // `toolbar`/`accordion`/`splitter` hit), and the N-visible/step sliding window, circular wrap,
  // autoplay opt-in, and size-driven item gap all need composed examples the single-axis
  // `@Input` grid cannot stage. See `carousel/SPEC.md` for the full contract.
  'carousel': CarouselDemoComponent,
  // The whole component is built from content-projected `<ino-galleria-item>` children (same gap
  // as `carousel`/`toolbar`/`accordion`), and the thumbnail strip, fullscreen dialog, autoplay,
  // captions, loading state, and density variants all need composed examples the single-axis
  // `@Input` grid cannot stage. See `galleria/SPEC.md` for the full contract.
  'galleria': GalleriaDemoComponent,
  // `value: string | null` is free-form, not an enum `STATE_INPUT_NAMES` can drive; `presets` is
  // an array input (same empty-default gap `treetable`/`tree`/`avatar-group` hit), and the
  // inline/popover structural variant plus the drag/keyboard SB-panel and hue/alpha bars need
  // composed, deliberately-triggered examples the single-axis grid cannot stage. See
  // `colorpicker/SPEC.md` for the full contract.
  'colorpicker': ColorpickerDemoComponent,
  // `welcomeMessage: string[]` and `commandSubmit` event plus multiple input states (busy,
  // disabled, readonly) need composed examples with real command handling and state transitions.
  // The terminal is a presentation shell with consumer-driven interaction, not a reactive
  // `@Input`-driven renderer target. See `terminal/SPEC.md` for the full contract.
  'terminal': TerminalDemoComponent,
  // `size` is a type-alias union (`InoKnobSize`) the generic renderer's sizing axis doesn't pick
  // up (same gap as `slider`), `valueTemplate` is never bound by the single-axis grid, and the
  // §5 row's dragging/at-bounds states are interaction-driven. See `knob/SPEC.md` for the full
  // contract.
  'knob': KnobDemoComponent,
  // `value: string | null` is free-form, not an enum `STATE_INPUT_NAMES` can drive;
  // `presets` is an array input (same empty-default gap `colorpicker`/`treetable`/`tree` hit),
  // and `invalid-hex` (the §5 row's named state) is interaction-driven — typing an unparseable
  // string into the hex field — not something a static `@Input` binding can stage. See
  // `inputcolor/SPEC.md` for the full contract.
  'inputcolor': InputColorDemoComponent,
  // `preset` is a type-alias union the generic renderer never binds, `size` is the known
  // type-alias-`size` gap (same as `slider`), and the §5 row's signature behaviors — sanitized
  // paste, char limit/at-limit, format-toggle announcements — are interaction-driven. See
  // `editor/SPEC.md` for the full contract.
  'editor': EditorDemoComponent,
};
