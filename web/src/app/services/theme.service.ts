import { Injectable, signal } from '@angular/core';

export type InoTheme = 'dark' | 'light';

const STORAGE_KEY = 'ino-theme';

/**
 * Runtime theme toggle for the design-system app. Dark is the token
 * contract's default (no attribute needed, see tokens.css §2); this
 * service only ever adds/removes `data-theme="light"` on <html>.
 *
 * First-paint theme selection (localStorage → prefers-color-scheme →
 * dark) happens in a small blocking script in index.html, BEFORE Angular
 * bootstraps, so there is never a flash of the wrong theme while this
 * service's DI graph spins up. This service reads whatever that script
 * already set as its initial value and takes over from there for the
 * in-app toggle. See docs/brand/02-design-tokens/angular-theme-contract.md §5.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<InoTheme>(this.readInitial());

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: InoTheme): void {
    this.theme.set(theme);

    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage disabled (private browsing / locked-down regulator machine
      // per the brief) — theme still applies for this session, it just
      // won't persist across reloads. Never let this throw into the UI.
    }
  }

  private readInitial(): InoTheme {
    if (typeof document === 'undefined') {
      return 'dark';
    }
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
}
