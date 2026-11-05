import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoImageComponent } from './ino-image.component';

function trigger(fixture: ComponentFixture<InoImageComponent>): HTMLButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-image__trigger');
}

function img(fixture: ComponentFixture<InoImageComponent>): HTMLImageElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-image__img');
}

function lightboxPanel(fixture: ComponentFixture<InoImageComponent>): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-image__lightbox-panel');
}

function pressKey(fixture: ComponentFixture<InoImageComponent>, key: string, shiftKey = false): void {
  lightboxPanel(fixture)!.dispatchEvent(
    new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
  );
  fixture.detectChanges();
}

describe('InoImageComponent', () => {
  let fixture: ComponentFixture<InoImageComponent>;
  let component: InoImageComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InoImageComponent] });
    fixture = TestBed.createComponent(InoImageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Guards against a leaked scroll lock from a test that opened the lightbox without closing it.
    document.body.style.overflow = '';
  });

  it('starts in the loading state while src is set and the image has not fired (load)', () => {
    fixture.componentRef.setInput('src', 'photo.jpg');
    fixture.componentRef.setInput('alt', 'A photo');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).getAttribute('data-state')).toBe('loading');

    img(fixture)!.dispatchEvent(new Event('load'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).getAttribute('data-state')).toBe('default');
  });

  it('switches to error-fallback on (error) and renders the fallback slot', () => {
    fixture.componentRef.setInput('src', 'broken.jpg');
    fixture.componentRef.setInput('alt', 'A photo');
    fixture.detectChanges();

    img(fixture)!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('data-state')).toBe('error-fallback');
    const fallback = host.querySelector('.ino-image__fallback');
    expect(fallback).not.toBeNull();
    expect(fallback!.getAttribute('aria-label')).toBe('A photo');
  });

  it('resets a stale error/loaded flag when src changes (ngOnChanges)', () => {
    fixture.componentRef.setInput('src', 'broken.jpg');
    fixture.detectChanges();
    img(fixture)!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).getAttribute('data-state')).toBe('error-fallback');

    fixture.componentRef.setInput('src', 'next.jpg');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).getAttribute('data-state')).toBe('loading');
  });

  it('labels the trigger button from alt and falls back to a generic name when alt is empty', () => {
    fixture.componentRef.setInput('src', 'photo.jpg');
    fixture.componentRef.setInput('alt', 'Team photo');
    fixture.detectChanges();
    expect(trigger(fixture)!.getAttribute('aria-label')).toBe('Open full-size preview: Team photo');

    fixture.componentRef.setInput('alt', '');
    fixture.detectChanges();
    expect(trigger(fixture)!.getAttribute('aria-label')).toBe('Open full-size preview: image');
  });

  it('does not render a clickable trigger when previewable is false, src is empty, or the image failed', () => {
    fixture.componentRef.setInput('src', 'photo.jpg');
    fixture.componentRef.setInput('previewable', false);
    fixture.detectChanges();
    expect(trigger(fixture)).toBeNull();

    fixture.componentRef.setInput('previewable', true);
    fixture.componentRef.setInput('src', '');
    fixture.detectChanges();
    expect(trigger(fixture)).toBeNull();

    fixture.componentRef.setInput('src', 'broken.jpg');
    fixture.detectChanges();
    img(fixture)!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(trigger(fixture)).toBeNull();
  });

  it('opens the lightbox as a labelled dialog on click and emits opened/closed, locking/releasing body scroll', () => {
    fixture.componentRef.setInput('src', 'photo.jpg');
    fixture.componentRef.setInput('alt', 'A photo');
    fixture.detectChanges();

    const opened = vi.fn();
    const closed = vi.fn();
    component.opened.subscribe(opened);
    component.closed.subscribe(closed);

    trigger(fixture)!.click();
    fixture.detectChanges();

    const panel = lightboxPanel(fixture)!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-label')).toBe('A photo');
    expect(opened).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('hidden');

    pressKey(fixture, 'Escape');
    expect(lightboxPanel(fixture)).toBeNull();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('');
  });

  it('zooms in 0.5 steps up to 4x, flips to the zoomed state, and 0 resets zoom and rotation', () => {
    fixture.componentRef.setInput('src', 'photo.jpg');
    fixture.detectChanges();
    trigger(fixture)!.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).getAttribute('data-state')).not.toBe('zoomed');

    for (let i = 0; i < 10; i++) {
      pressKey(fixture, '+');
    }
    // 1x -> 4x in 0.5 steps is 6 presses; the remaining presses clamp at the ceiling.
    expect((fixture.nativeElement as HTMLElement).getAttribute('data-state')).toBe('zoomed');
    expect(lightboxPanel(fixture)!.classList.contains('ino-image__lightbox-panel--zoomed')).toBe(true);

    pressKey(fixture, 'r');
    pressKey(fixture, '0');
    expect((fixture.nativeElement as HTMLElement).getAttribute('data-state')).not.toBe('zoomed');
    expect(lightboxPanel(fixture)!.classList.contains('ino-image__lightbox-panel--zoomed')).toBe(false);
  });

  it('rotates clockwise with r and counter-clockwise with Shift+r, wrapping at 360°', () => {
    fixture.componentRef.setInput('src', 'photo.jpg');
    fixture.detectChanges();
    trigger(fixture)!.click();
    fixture.detectChanges();

    pressKey(fixture, 'r');
    expect(component['rotation']()).toBe(90);
    pressKey(fixture, 'R', true);
    expect(component['rotation']()).toBe(0);
    pressKey(fixture, 'R', true);
    expect(component['rotation']()).toBe(270);
  });

  it('applies the sized frame and object-fit only when width/height are set', () => {
    fixture.componentRef.setInput('src', 'photo.jpg');
    fixture.detectChanges();
    const frame = (fixture.nativeElement as HTMLElement).querySelector('.ino-image__frame')!;
    expect(frame.classList.contains('ino-image__frame--sized')).toBe(false);

    fixture.componentRef.setInput('width', '320px');
    fixture.componentRef.setInput('fit', 'contain');
    fixture.detectChanges();
    expect(frame.classList.contains('ino-image__frame--sized')).toBe(true);
    expect((frame as HTMLElement).style.inlineSize).toBe('320px');
  });

  it('releases the scroll lock on destroy if the component is torn down mid-preview', () => {
    fixture.componentRef.setInput('src', 'photo.jpg');
    fixture.detectChanges();
    trigger(fixture)!.click();
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });
});
