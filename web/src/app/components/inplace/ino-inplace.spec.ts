import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoInplaceComponent } from './ino-inplace.component';
import { INO_INPLACE_TEMPLATES } from './ino-inplace.templates';

@Component({
  standalone: true,
  imports: [InoInplaceComponent, ...INO_INPLACE_TEMPLATES],
  template: `
    <ino-inplace
      [editing]="editing"
      (editingChange)="editing = $event"
      [disabled]="disabled"
      [readonly]="readonly"
      [closeOnBlur]="closeOnBlur"
    >
      <ng-template inoInplaceDisplay>Jane Doe</ng-template>
      <ng-template inoInplaceEdit>
        <input class="edit-first" value="Jane" />
        <input class="edit-second" value="Doe" />
        <textarea class="edit-notes"></textarea>
      </ng-template>
    </ino-inplace>
  `,
})
class TestHostComponent {
  editing = false;
  disabled = false;
  readonly = false;
  closeOnBlur = true;
}

function trigger(fixture: ComponentFixture<TestHostComponent>): HTMLButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-inplace__trigger');
}

function editor(fixture: ComponentFixture<TestHostComponent>): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-inplace__editor');
}

describe('InoInplaceComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the display slot through a native button and never mounts the edit slot up front', () => {
    const btn = trigger(fixture);
    expect(btn).toBeTruthy();
    expect(btn!.tagName).toBe('BUTTON');
    expect(btn!.textContent).toContain('Jane Doe');
    expect(editor(fixture)).toBeNull();
  });

  it('opens the editor on click, mounts the edit template lazily, and focuses the first field', () => {
    trigger(fixture)!.click();
    fixture.detectChanges();

    expect(trigger(fixture)).toBeNull();
    const ed = editor(fixture);
    expect(ed).toBeTruthy();
    const first = ed!.querySelector<HTMLInputElement>('.edit-first');
    expect(first).toBeTruthy();
    expect(document.activeElement).toBe(first);
    expect(host.editing).toBe(true);
  });

  it('closes on Enter in a non-textarea field and returns focus to the trigger', () => {
    trigger(fixture)!.click();
    fixture.detectChanges();

    const first = editor(fixture)!.querySelector<HTMLInputElement>('.edit-first')!;
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(host.editing).toBe(false);
    expect(editor(fixture)).toBeNull();
    expect(document.activeElement).toBe(trigger(fixture));
  });

  it('does not close on Enter inside a textarea', () => {
    trigger(fixture)!.click();
    fixture.detectChanges();

    const notes = editor(fixture)!.querySelector<HTMLTextAreaElement>('.edit-notes')!;
    notes.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(host.editing).toBe(true);
    expect(editor(fixture)).toBeTruthy();
  });

  it('closes when focus leaves the editor subtree entirely (closeOnBlur)', () => {
    trigger(fixture)!.click();
    fixture.detectChanges();

    const ed = editor(fixture)!;
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    ed.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outside }));
    fixture.detectChanges();

    expect(host.editing).toBe(false);
    outside.remove();
  });

  it('does not close when focus moves between two fields inside the editor', () => {
    trigger(fixture)!.click();
    fixture.detectChanges();

    const ed = editor(fixture)!;
    const second = ed.querySelector<HTMLInputElement>('.edit-second')!;
    ed.dispatchEvent(new FocusEvent('focusout', { relatedTarget: second }));
    fixture.detectChanges();

    expect(host.editing).toBe(true);
    expect(editor(fixture)).toBeTruthy();
  });

  it('ignores blur when closeOnBlur is false', () => {
    host.closeOnBlur = false;
    fixture.detectChanges();
    trigger(fixture)!.click();
    fixture.detectChanges();

    const ed = editor(fixture)!;
    ed.dispatchEvent(new FocusEvent('focusout', { relatedTarget: null }));
    fixture.detectChanges();

    expect(host.editing).toBe(true);
  });

  it('blocks open() while disabled, with the trigger natively disabled', () => {
    // Configure-then-render: a plain field write after the initial `detectChanges()` does not
    // reliably re-propagate into a child `@Input` on this harness, so `disabled` is set before
    // the first render instead of mutated on the shared `fixture` from `beforeEach`.
    const localFixture = TestBed.createComponent(TestHostComponent);
    localFixture.componentInstance.disabled = true;
    localFixture.detectChanges();

    const btn = trigger(localFixture)!;
    expect(btn.disabled).toBe(true);
    btn.click();
    localFixture.detectChanges();

    expect(localFixture.componentInstance.editing).toBe(false);
  });

  it('blocks open() while readonly, without disabling or dimming the trigger', () => {
    const localFixture = TestBed.createComponent(TestHostComponent);
    localFixture.componentInstance.readonly = true;
    localFixture.detectChanges();

    const btn = trigger(localFixture)!;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('aria-readonly')).toBe('true');
    btn.click();
    localFixture.detectChanges();

    expect(localFixture.componentInstance.editing).toBe(false);
  });

  it('labels the trigger for assistive technology via ariaLabel', () => {
    const btn = trigger(fixture)!;
    expect(btn.getAttribute('aria-label')).toBe('Edit');
  });
});
