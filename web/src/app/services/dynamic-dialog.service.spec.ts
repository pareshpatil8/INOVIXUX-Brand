import { Component } from '@angular/core';

import { InoDynamicDialogService } from './dynamic-dialog.service';

@Component({ standalone: true, template: '' })
class StubDialogContentComponent {}

describe('InoDynamicDialogService', () => {
  let service: InoDynamicDialogService;

  beforeEach(() => {
    service = new InoDynamicDialogService();
  });

  it('stores the opened component/config on current()', () => {
    const config = { heading: 'Export', data: { count: 3 } };
    service.open(StubDialogContentComponent, config);

    const entry = service.current();
    expect(entry?.component).toBe(StubDialogContentComponent);
    expect(entry?.config).toEqual(config);
  });

  it('resolves onClose with the result passed to ref.close(), and clears current()', async () => {
    const ref = service.open<StubDialogContentComponent, unknown, string>(StubDialogContentComponent);

    ref.close('saved');

    await expect(ref.onClose).resolves.toBe('saved');
    expect(service.current()).toBeNull();
  });

  it('dismiss() closes the current dialog, resolving onClose with undefined', async () => {
    const ref = service.open(StubDialogContentComponent);

    service.dismiss();

    await expect(ref.onClose).resolves.toBeUndefined();
    expect(service.current()).toBeNull();
  });

  it('dismiss() with nothing open is a no-op', () => {
    expect(() => service.dismiss()).not.toThrow();
    expect(service.current()).toBeNull();
  });

  it('opening a second dialog supersedes the first, resolving its onClose with undefined', async () => {
    const first = service.open(StubDialogContentComponent);

    const second = service.open(StubDialogContentComponent);

    await expect(first.onClose).resolves.toBeUndefined();
    expect(service.current()?.component).toBe(StubDialogContentComponent);
    expect(service.current()?.ref).toBe(second);
  });

  it('a stale close() from a superseded entry is a no-op against the new entry', async () => {
    const first = service.open<StubDialogContentComponent, unknown, string>(StubDialogContentComponent);
    const second = service.open<StubDialogContentComponent, unknown, string>(StubDialogContentComponent);

    // first is already resolved (undefined) by the supersede in open(); closing it again must not
    // throw and must not resolve/clear the second dialog's own ref/current entry.
    first.close('late-result');

    await expect(first.onClose).resolves.toBeUndefined();
    expect(service.current()).not.toBeNull();

    second.close('second-result');
    await expect(second.onClose).resolves.toBe('second-result');
    expect(service.current()).toBeNull();
  });
});
