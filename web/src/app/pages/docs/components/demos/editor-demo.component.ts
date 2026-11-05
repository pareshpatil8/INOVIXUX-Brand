import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoEditorComponent } from '../../../../components/editor/ino-editor.component';

/**
 * Hand-authored §2 Component Publish Contract demo for `ino-editor`. The generic `@Input`-driven
 * renderer can't exercise this component: `preset` is a type-alias union the generic renderer
 * never binds, `size` is the known type-alias-`size` gap (see `custom-demos.ts`'s head comment),
 * and the §5 row's signature behaviors — sanitized paste, char limit/at-limit, format-toggle
 * announcements — are interaction-driven. Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`).
 */
@Component({
  selector: 'app-editor-demo',
  standalone: true,
  imports: [CommonModule, InoEditorComponent],
  templateUrl: './editor-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorDemoComponent {
  // Variants — toolbar presets
  protected basicValue = '<p>The <strong>basic</strong> preset: inline styles and lists.</p>';
  protected fullValue =
    '<h2>Release note</h2><p>The <strong>full</strong> preset adds headings, a ' +
    '<a href="https://inovixux.com" rel="noopener noreferrer">link</a> and code:</p>' +
    '<pre>npm run check:ds</pre>';

  // States
  protected defaultValue = '<p>Editable content.</p>';
  protected disabledValue = '<p>Disabled — not focusable.</p>';
  protected readonlyValue =
    '<p>Readonly — still in the tab order, selectable and copyable; toolbar frozen.</p>';
  protected requiredValue = '';
  protected invalidValue = '<p>Too short.</p>';
  protected atLimitValue = '<p>Exactly forty characters of plain text....</p>';

  // Sizing
  protected smValue = '';
  protected defaultSizeValue = '';
  protected lgValue = '';

  // Density
  protected denseValue = '';
  protected fluidValue = '';

  // Labels
  protected labelledValue = '';
  protected errorValue = '';
  protected ariaOnlyValue = '';

  // Char limit
  protected limitValue = '<p>Format freely — only text spends the budget.</p>';

  // RTL
  protected rtlValue = '<p>محرر النصوص — القوائم والعناوين تعمل في الاتجاهين.</p>';
}
