import { Injectable, signal } from '@angular/core';

export type InoTheme = 'dark' | 'light' | 'high-contrast';

const STORAGE_KEY = 'ino-theme';

// Cycle order for toggle(). Adding a 4th theme later is a one-line addition
// here plus its [data-theme="..."] block in tokens.css — see
// docs/brand/09-design-system-standards.md §8 "Adding a new theme".
const THEME_ORDER: readonly InoTheme[] = ['dark', 'light', 'high-contrast'];

/**
 * Runtime theme toggle for the design-system app. Dark is the token
 * contract's default (no attribute needed, see tokens.css §2); this
 * service only ever adds/removes `data-theme="..."` on <html> (any
 * non-dark value in THEME_ORDER), never inlines a color.
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

  /** Cycles dark → light → high-contrast → dark. */
  toggle(): void {
    const nextIndex = (THEME_ORDER.indexOf(this.theme()) + 1) % THEME_ORDER.length;
    this.set(THEME_ORDER[nextIndex]);
  }

  set(theme: InoTheme): void {
    this.theme.set(theme);

    if (typeof document !== 'undefined') {
      // Explicit dark must suppress the OS-light CSS fallback too.
      document.documentElement.setAttribute('data-theme', theme);
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
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' || attr === 'high-contrast' ? attr : 'dark';
  }
}
