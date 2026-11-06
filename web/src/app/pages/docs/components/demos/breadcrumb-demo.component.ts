import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoBreadcrumbComponent,
  InoBreadcrumbItem,
} from '../../../../components/breadcrumb/ino-breadcrumb.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-breadcrumb` (INO-429).
 *
 * `items: InoBreadcrumbItem[]` hits the same generic-renderer gap `ino-select-button` and
 * `ino-cascade-select` already hit: `defaultValueFor()` in `../docs-component-detail.component.ts`
 * gives it `[]`, and this component's entire visible surface is driven by that array — the
 * generic renderer would produce a labelled, empty `<nav>` in every section. Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`), same remediation pattern as INO-746/INO-731/INO-707.
 *
 * `href` values point at real routes inside this docs app (`/docs/components`,
 * `/docs/components/:slug`) rather than placeholder strings — clicking a navigable crumb in these
 * demos performs a real in-app navigation, which is the point of demonstrating router integration
 * live rather than describing it in prose.
 */
@Component({
  selector: 'app-breadcrumb-demo',
  standalone: true,
  imports: [CommonModule, InoBreadcrumbComponent],
  templateUrl: './breadcrumb-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbDemoComponent {
  /** Plain trail — router integration, no icons. */
  protected readonly plainTrail: InoBreadcrumbItem[] = [
    { label: 'Docs', href: '/docs' },
    { label: 'Components', href: '/docs/components' },
    { label: 'Breadcrumb' },
  ];

  /** With icons — every crumb including the current page. */
  protected readonly iconTrail: InoBreadcrumbItem[] = [
    { label: 'Docs', href: '/docs', icon: '⌂' },
    { label: 'Components', href: '/docs/components', icon: '▦' },
    { label: 'Select button', href: '/docs/components/select-button', icon: '◎' },
    { label: 'Readonly state', icon: '●' },
  ];

  /** One disabled ancestor — a step the viewer cannot navigate back to (e.g. a completed,
   *  now-locked wizard step). */
  protected readonly withDisabledAncestor: InoBreadcrumbItem[] = [
    { label: 'Account', href: '/docs' },
    { label: 'Identity verification (locked)', disabled: true },
    { label: 'Funding source', href: '/docs/components' },
    { label: 'Review' },
  ];

  /** Readonly — the whole trail, for a print/report-style display. */
  protected readonly readonlyTrail: InoBreadcrumbItem[] = [
    { label: 'Reports', href: '/docs' },
    { label: 'Q3 settlement', href: '/docs/components' },
    { label: 'Exception detail' },
  ];

  /** Long trail — collapses behind the ellipsis once `maxVisible` is set below its length. */
  protected readonly longTrail: InoBreadcrumbItem[] = [
    { label: 'Docs', href: '/docs' },
    { label: 'Components', href: '/docs/components' },
    { label: 'Form controls', href: '/docs/components' },
    { label: 'Select controls', href: '/docs/components' },
    { label: 'Select button', href: '/docs/components/select-button' },
    { label: 'Readonly variant' },
  ];

  /** A long individual label, to show wrapping/truncation behavior rather than a trail that
   *  overflows its container unpredictably. */
  protected readonly longLabelTrail: InoBreadcrumbItem[] = [
    { label: 'Docs', href: '/docs' },
    { label: 'A settlement rule that references a very long originating counterparty name' },
  ];

  protected readonly rtlTrail: InoBreadcrumbItem[] = [
    { label: 'المستندات', href: '/docs' },
    { label: 'المكونات', href: '/docs/components' },
    { label: 'مسار التنقل' },
  ];

  protected lastClicked = '(none yet)';

  protected onItemClick(item: InoBreadcrumbItem): void {
    this.lastClicked = item.label;
  }
}
