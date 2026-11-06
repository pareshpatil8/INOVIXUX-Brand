import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InoTerminalComponent } from './ino-terminal.component';

describe('InoTerminalComponent', () => {
  let component: InoTerminalComponent;
  let fixture: ComponentFixture<InoTerminalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoTerminalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InoTerminalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create, empty scrollback by default', () => {
    expect(component).toBeTruthy();
    expect(component.lines).toEqual([]);
  });

  it('seeds welcomeMessage as system lines at init', () => {
    const f = TestBed.createComponent(InoTerminalComponent);
    f.componentInstance.welcomeMessage = ['Welcome', 'Type help for commands'];
    f.detectChanges();
    expect(f.componentInstance.lines).toEqual([
      { type: 'system', text: 'Welcome' },
      { type: 'system', text: 'Type help for commands' },
    ]);
  });

  it('log region carries role=log and aria-live=polite', () => {
    const log: HTMLElement = fixture.nativeElement.querySelector('.ino-terminal__log');
    expect(log.getAttribute('role')).toBe('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(log.getAttribute('aria-label')).toBe('Terminal output');
  });

  it('input carries textbox semantics and the aria-label contract', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.ino-terminal__input');
    expect(input.type).toBe('text');
    expect(input.getAttribute('aria-label')).toBe('Terminal command input');
  });

  it('Enter echoes the command, emits commandSubmit, and clears the input', () => {
    const emitted: string[] = [];
    component.commandSubmit.subscribe((v: string) => emitted.push(v));

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.ino-terminal__input');
    input.value = 'help';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(emitted).toEqual(['help']);
    expect(component.inputValue).toBe('');
    expect(component.lines).toEqual([{ type: 'input', text: 'help' }]);
  });

  it('does not emit or echo on empty/whitespace-only input', () => {
    const emitted: string[] = [];
    component.commandSubmit.subscribe((v: string) => emitted.push(v));

    component.inputValue = '   ';
    component.submit();

    expect(emitted).toEqual([]);
    expect(component.lines).toEqual([]);
  });

  it('writeOutput appends output/error/system lines', () => {
    component.writeOutput('plain output');
    component.writeOutput('boom', 'error');
    component.writeOutput(['line a', 'line b'], 'system');
    fixture.detectChanges();

    expect(component.lines).toEqual([
      { type: 'output', text: 'plain output' },
      { type: 'error', text: 'boom' },
      { type: 'system', text: 'line a' },
      { type: 'system', text: 'line b' },
    ]);

    const errorLine: HTMLElement = fixture.nativeElement.querySelector(
      '.ino-terminal__line[data-line-type="error"]'
    );
    expect(errorLine).toBeTruthy();
  });

  it('clear() empties the scrollback without restoring the welcome message', () => {
    component.welcomeMessage = ['banner'];
    component.lines = [{ type: 'system', text: 'banner' }, { type: 'input', text: 'ls' }];
    component.clear();
    expect(component.lines).toEqual([]);
  });

  it('ArrowUp/ArrowDown recall history without touching scrollback', () => {
    component.inputValue = 'first';
    component.submit();
    component.inputValue = 'second';
    component.submit();
    expect(component.lines.length).toBe(2);

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.ino-terminal__input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(component.inputValue).toBe('second');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(component.inputValue).toBe('first');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(component.inputValue).toBe('second');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(component.inputValue).toBe('');
    expect(component.lines.length).toBe(2);
  });

  it('ArrowUp preserves an in-progress draft and restores it past the newest entry', () => {
    component.inputValue = 'ls';
    component.submit();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.ino-terminal__input');
    input.value = 'unsent draft';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(component.inputValue).toBe('ls');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(component.inputValue).toBe('unsent draft');
  });

  it('busy disables submission and hides the input in favor of the busy row', () => {
    // setInput, not direct assignment — the component is OnPush, so a bare property write
    // after initial render never marks the view dirty (see knob/speeddial specs).
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ino-terminal__input')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ino-terminal__busy-row')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.ino-terminal__sr-status').textContent).toContain(
      'Running'
    );

    const emitted: string[] = [];
    component.commandSubmit.subscribe((v: string) => emitted.push(v));
    component.inputValue = 'anything';
    component.submit();
    expect(emitted).toEqual([]);
  });

  it('disabled sets native disabled on the input and blocks submission', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.ino-terminal__input');
    expect(input.disabled).toBe(true);

    component.inputValue = 'anything';
    component.submit();
    expect(component.lines).toEqual([]);
  });

  it('readonly removes the input row entirely', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ino-terminal__input-row')).toBeNull();
  });

  it('focused state tracks input focus/blur', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.ino-terminal__input');
    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(component.focused).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.ino-terminal').classList.contains('ino-terminal--focused')
    ).toBe(true);

    input.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(component.focused).toBe(false);
  });

  it('clicking the log focuses the input when there is no active selection', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.ino-terminal__input');
    const focusSpy = vi.spyOn(input, 'focus');

    const log: HTMLElement = fixture.nativeElement.querySelector('.ino-terminal__log');
    log.dispatchEvent(new Event('click'));

    expect(focusSpy).toHaveBeenCalled();
  });
});
