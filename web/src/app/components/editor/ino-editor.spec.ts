import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  InoEditorComponent,
  isSafeHref,
  sanitizeEditorHtml,
} from './ino-editor.component';

function content(fixture: ComponentFixture<InoEditorComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-editor__content')!;
}

function buttons(fixture: ComponentFixture<InoEditorComponent>): HTMLButtonElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.ino-editor__btn')
  );
}

describe('sanitizeEditorHtml', () => {
  it('keeps the allowlisted structure untouched', () => {
    const html = '<p>a</p><ul><li>b</li></ul><pre><code>c</code></pre>';
    expect(sanitizeEditorHtml(html)).toBe(html);
  });

  it('normalizes legacy/foreign tags onto the allowlist (b/i/h1/div)', () => {
    expect(sanitizeEditorHtml('<b>x</b><i>y</i>')).toBe('<strong>x</strong><em>y</em>');
    expect(sanitizeEditorHtml('<h1>t</h1>')).toBe('<h2>t</h2>');
    expect(sanitizeEditorHtml('<div>p</div>')).toBe('<p>p</p>');
  });

  it('drops script/style wholesale, text included', () => {
    expect(sanitizeEditorHtml('<p>a</p><script>alert(1)</script>')).toBe('<p>a</p>');
    expect(sanitizeEditorHtml('<style>.x{color:red}</style><p>a</p>')).toBe('<p>a</p>');
  });

  it('unwraps unknown tags to their children (Word/Docs paste noise)', () => {
    expect(sanitizeEditorHtml('<span style="font-size:99px">hi</span>')).toBe('hi');
    expect(sanitizeEditorHtml('<section><p>kept</p></section>')).toBe('<p>kept</p>');
  });

  it('strips every attribute except a protocol-checked href', () => {
    expect(sanitizeEditorHtml('<p onclick="x()" class="y" style="z">a</p>')).toBe('<p>a</p>');
    expect(sanitizeEditorHtml('<a href="https://x.dev" target="_blank" onmouseover="x()">l</a>'))
      .toBe('<a href="https://x.dev" rel="noopener noreferrer">l</a>');
  });

  it('unwraps links with unsafe protocols instead of keeping them', () => {
    expect(sanitizeEditorHtml('<a href="javascript:alert(1)">l</a>')).toBe('l');
    expect(sanitizeEditorHtml('<a href="data:text/html,x">l</a>')).toBe('l');
  });
});

describe('isSafeHref', () => {
  it('accepts http(s) and mailto, including relative URLs', () => {
    expect(isSafeHref('https://inovixux.com')).toBe(true);
    expect(isSafeHref('http://inovixux.com')).toBe(true);
    expect(isSafeHref('mailto:a@b.c')).toBe(true);
    expect(isSafeHref('/docs/page')).toBe(true);
  });

  it('rejects script-bearing protocols', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('data:text/html,<script>x</script>')).toBe(false);
    expect(isSafeHref('vbscript:x')).toBe(false);
  });
});

describe('InoEditorComponent', () => {
  let fixture: ComponentFixture<InoEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InoEditorComponent] });
    fixture = TestBed.createComponent(InoEditorComponent);
    fixture.detectChanges();
  });

  it('renders the basic preset (5 buttons) and full preset (11 buttons)', () => {
    expect(buttons(fixture).length).toBe(5);
    fixture.componentRef.setInput('preset', 'full');
    fixture.detectChanges();
    expect(buttons(fixture).length).toBe(11);
  });

  it('marks format toggles with aria-pressed and leaves action buttons without it', () => {
    fixture.componentRef.setInput('preset', 'full');
    fixture.detectChanges();
    const all = buttons(fixture);
    const bold = all.find((b) => b.getAttribute('aria-label') === 'Bold')!;
    const link = all.find((b) => b.getAttribute('aria-label') === 'Insert link')!;
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(link.hasAttribute('aria-pressed')).toBe(false);
  });

  it('exposes the APG toolbar contract: role, aria-controls, single tab stop, arrow roving', () => {
    const toolbar = (fixture.nativeElement as HTMLElement).querySelector('[role="toolbar"]')!;
    expect(toolbar.getAttribute('aria-controls')).toBe(content(fixture).id);

    const all = buttons(fixture);
    expect(all.filter((b) => b.tabIndex === 0).length).toBe(1);
    expect(all[0].tabIndex).toBe(0);

    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[1].tabIndex).toBe(0);
    expect(all[0].tabIndex).toBe(-1);

    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[all.length - 1].tabIndex).toBe(0);
  });

  it('exposes the multiline textbox contract with label wiring via aria-labelledby', () => {
    fixture.componentRef.setInput('label', 'Notes');
    fixture.detectChanges();
    const box = content(fixture);
    expect(box.getAttribute('role')).toBe('textbox');
    expect(box.getAttribute('aria-multiline')).toBe('true');
    const labelId = box.getAttribute('aria-labelledby')!;
    expect(document.getElementById(labelId)?.textContent).toContain('Notes');
  });

  it('sanitizes a hostile bound value before it reaches innerHTML', () => {
    fixture.componentRef.setInput(
      'value',
      '<p>ok</p><script>alert(1)</script><a href="javascript:x">l</a>'
    );
    fixture.detectChanges();
    expect(content(fixture).innerHTML).toBe('<p>ok</p>l');
  });

  it('wires error state: aria-invalid, role=alert error line replacing the hint', () => {
    fixture.componentRef.setInput('hint', 'Helpful');
    fixture.componentRef.setInput('error', 'Required');
    fixture.detectChanges();
    const box = content(fixture);
    expect(box.getAttribute('aria-invalid')).toBe('true');
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')!;
    expect(alert.textContent).toBe('Required');
    expect((fixture.nativeElement as HTMLElement).querySelector('.ino-field__hint')).toBeNull();
    expect(box.getAttribute('aria-describedby')).toContain('-error');
  });

  it('readonly keeps the textbox in the tab order but freezes editing and the toolbar', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    const box = content(fixture);
    expect(box.getAttribute('contenteditable')).toBe('false');
    expect(box.getAttribute('aria-readonly')).toBe('true');
    expect(box.tabIndex).toBe(0);
    expect(buttons(fixture).every((b) => b.disabled)).toBe(true);
  });

  it('counts textContent (not markup) and flags the at-limit state on the counter only', () => {
    fixture.componentRef.setInput('maxLength', 5);
    fixture.componentRef.setInput('showCount', true);
    fixture.componentRef.setInput('value', '<strong>hello</strong>');
    fixture.detectChanges();
    const counter = (fixture.nativeElement as HTMLElement).querySelector('.ino-field__counter')!;
    expect(counter.textContent).toBe('5/5');
    expect(counter.classList.contains('ino-field__counter--limit')).toBe(true);
    expect(content(fixture).getAttribute('aria-invalid')).toBeNull();
    expect(content(fixture).getAttribute('aria-describedby')).toContain('-counter');
  });

  it('blocks text-inserting beforeinput at the limit but lets deletions through', () => {
    fixture.componentRef.setInput('maxLength', 5);
    fixture.componentRef.setInput('value', '<p>hello</p>');
    fixture.detectChanges();
    const box = content(fixture);

    const insert = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: 'x',
      bubbles: true,
      cancelable: true,
    });
    box.dispatchEvent(insert);
    expect(insert.defaultPrevented).toBe(true);

    const del = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
      bubbles: true,
      cancelable: true,
    });
    box.dispatchEvent(del);
    expect(del.defaultPrevented).toBe(false);
  });

  it('emits the sanitized DOM on input and survives the banana-in-a-box re-bind', () => {
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
    const box = content(fixture);
    box.innerHTML = '<b>typed</b>';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(emitted).toEqual(['<strong>typed</strong>']);

    // Parent re-binds what we just emitted — the innerHTML write must be skipped (caret safety).
    fixture.componentRef.setInput('value', '<strong>typed</strong>');
    fixture.detectChanges();
    expect(box.innerHTML).toBe('<b>typed</b>');
  });
});
