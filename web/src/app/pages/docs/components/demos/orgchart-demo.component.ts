import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  InoOrgchartComponent,
  InoOrgChartNode,
} from '../../../../components/orgchart/ino-orgchart.component';

function companyTree(): InoOrgChartNode {
  return {
    label: 'Amara Osei',
    value: 'ceo',
    sublabel: 'CEO',
    children: [
      {
        label: 'Jun Park',
        value: 'cto',
        sublabel: 'CTO',
        children: [
          { label: 'Platform', value: 'platform', sublabel: '8 engineers' },
          { label: 'Web', value: 'web', sublabel: '5 engineers' },
          { label: 'Mobile', value: 'mobile', sublabel: '4 engineers' },
        ],
      },
      {
        label: 'Rosa Alvarez',
        value: 'cfo',
        sublabel: 'CFO',
        children: [{ label: 'Finance ops', value: 'finops', sublabel: '3 analysts' }],
      },
      { label: 'Sam Idowu', value: 'cpo', sublabel: 'CPO' },
    ],
  };
}

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-orgchart`. The generic
 * `@Input`-driven renderer can't exercise this component: `value` is an object tree (the same
 * empty-default gap `tree`/`treetable`/`colorpicker` hit), `selectionMode`/`zoom` are a union and
 * a clamped number the single-axis grid never binds, and the §5 row's signature behaviors —
 * expand/collapse, Arrow traversal, select/deselect — are interaction-driven. Mounted via
 * `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-orgchart-demo',
  standalone: true,
  imports: [CommonModule, InoOrgchartComponent],
  templateUrl: './orgchart-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgchartDemoComponent {
  // Variants — connectors + default node rendering
  protected basicTree = companyTree();

  // Node templates
  protected templatedTree: InoOrgChartNode = {
    label: 'Amara Osei',
    value: 'ceo',
    data: '🏢',
    children: [
      { label: 'Jun Park', value: 'cto', data: '🛠️' },
      { label: 'Rosa Alvarez', value: 'cfo', data: '📊' },
    ],
  };

  // Selection
  protected selectableTree = companyTree();
  protected selected = 'cto';

  // States
  protected loadingTree = companyTree();
  protected disabledTree = companyTree();
  protected disabledNodeTree: InoOrgChartNode = {
    label: 'Amara Osei',
    value: 'ceo',
    sublabel: 'CEO',
    children: [
      { label: 'Vacant', value: 'vacant', sublabel: 'Hiring', disabled: true },
      { label: 'Sam Idowu', value: 'cpo', sublabel: 'CPO' },
    ],
  };
  protected emptyTree: InoOrgChartNode | null = null;

  // Zoom
  protected zoomOutTree = companyTree();
  protected zoomDefaultTree = companyTree();
  protected zoomInTree = companyTree();

  // Density
  protected denseTree = companyTree();
  protected fluidTree = companyTree();

  // Labels
  protected labelledTree = companyTree();
  protected ariaOnlyTree = companyTree();

  // RTL
  protected rtlTree: InoOrgChartNode = {
    label: 'ليلى حداد',
    value: 'ceo',
    sublabel: 'المديرة التنفيذية',
    children: [
      { label: 'عمر ناصر', value: 'cto', sublabel: 'مدير التقنية' },
      { label: 'نور خليل', value: 'cfo', sublabel: 'مديرة المالية' },
      { label: 'سارة عواد', value: 'cpo', sublabel: 'مديرة المنتج' },
    ],
  };
}
