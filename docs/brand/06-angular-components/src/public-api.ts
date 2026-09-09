// Barrel export — mirrors what an `@inovixux/design-system` Angular library's
// public-api.ts would look like once this is promoted into a real buildable
// library inside the KYB app's workspace (or its own publishable package).

export * from './directives/count-up.directive';

export * from './components/nav/ino-nav.component';
export * from './components/card/ino-card.component';
export * from './components/hero/ino-hero.component';
export * from './components/feature-grid/ino-feature-grid.component';
export * from './components/metric-panel/ino-metric-panel.component';
export * from './components/tier-card/ino-tier-card.component';
export * from './components/footer/ino-footer.component';

// INO-83 — core interactive components (buttons, forms, modal, toast)
export * from './components/button/ino-button.component';
export * from './components/input/ino-input.component';
export * from './components/select/ino-select.component';
export * from './components/checkbox/ino-checkbox.component';
export * from './components/radio-group/ino-radio-group.component';
export * from './components/toggle/ino-toggle.component';
export * from './components/modal/ino-modal.component';
export * from './components/alert/ino-alert.component';
export * from './components/toast-container/ino-toast-container.component';
export * from './services/toast.service';
