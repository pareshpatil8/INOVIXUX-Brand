import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InoGalleriaComponent } from './ino-galleria.component';
import { InoGalleriaItemComponent } from './ino-galleria-item.component';

describe('InoGalleriaComponent', () => {
  let component: InoGalleriaComponent;
  let fixture: ComponentFixture<InoGalleriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoGalleriaComponent, InoGalleriaItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InoGalleriaComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with activeIndex 0', () => {
    expect(component['activeIdx']).toBe(0);
  });

  it('should emit activeIndexChange when goTo is called', () => {
    spyOn(component.activeIndexChange, 'emit');
    component['goTo'](1);
    expect(component.activeIndexChange.emit).toHaveBeenCalledWith(1);
  });

  it('should support controlled mode when activeIndex is set', () => {
    component.activeIndex = 2;
    fixture.detectChanges();
    expect(component['isControlled']).toBe(true);
  });

  it('should not support uncontrolled mode when activeIndex is undefined', () => {
    expect(component['isControlled']).toBe(false);
  });

  it('should play autoplay when autoplay is true', () => {
    component.autoplay = true;
    spyOn(component['play'], 'call');
    component.ngAfterContentInit();
    // Verify play was called during init
    expect(component['playing']).toBe(true);
  });

  it('should pause autoplay when reaching the end', (done) => {
    component.autoplayInterval = 50;
    component.autoplay = true;
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
    ];

    component.play();
    component['internalActiveIndex'] = 1;

    setTimeout(() => {
      expect(component['playing']).toBe(false);
      done();
    }, 100);
  });

  it('should toggle fullscreen mode', () => {
    expect(component['fullscreenActive']).toBe(false);
    component.openFullscreen();
    expect(component['fullscreenActive']).toBe(true);
    component.closeFullscreen();
    expect(component['fullscreenActive']).toBe(false);
  });

  it('should close fullscreen on Escape key', () => {
    component.openFullscreen();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    spyOn(event, 'preventDefault');
    component['onFullscreenKeydown'](event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component['fullscreenActive']).toBe(false);
  });

  it('should navigate to next item', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
      { src: 'test3.jpg', alt: 'test3' } as any,
    ];
    spyOn(component.activeIndexChange, 'emit');

    component.next();
    expect(component.activeIndexChange.emit).toHaveBeenCalledWith(1);
  });

  it('should navigate to previous item', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
      { src: 'test3.jpg', alt: 'test3' } as any,
    ];
    component['internalActiveIndex'] = 2;

    spyOn(component.activeIndexChange, 'emit');
    component.prev();
    expect(component.activeIndexChange.emit).toHaveBeenCalledWith(1);
  });

  it('should clamp index to valid range', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
    ];

    const clamped = component['clampIndex'](5);
    expect(clamped).toBe(1);

    const clampedNegative = component['clampIndex'](-1);
    expect(clampedNegative).toBe(0);
  });

  it('should provide correct range label', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
      { src: 'test3.jpg', alt: 'test3' } as any,
    ];
    component['internalActiveIndex'] = 1;

    expect(component.rangeLabel).toBe('Image 2 of 3');
  });

  it('should respect prefers-reduced-motion', () => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as any);

    component.play();
    expect(component['playing']).toBe(false);
  });
});
