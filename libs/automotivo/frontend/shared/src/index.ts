// Public API del lib `@automotivo-ui-shared`.
// Núcleo de dominio (modelos, marca, store, PDF), catálogo de datos,
// ícono SVG y el "chrome" del sitio (navbar, footer, preloader, cortina).

// core
export * from './lib/core/models';
export * from './lib/core/brand';
export * from './lib/core/pdf.service';
export * from './lib/core/automotivo.store';

// data
export * from './lib/data/catalog';

// ui + chrome
export { IconComponent } from './lib/ui/icon.component';
export { SiteNavComponent } from './lib/layout/site-nav.component';
export { SiteFooterComponent } from './lib/layout/site-footer.component';
export { PreloaderComponent } from './lib/preloader/preloader.component';
export { SceneTransitionComponent } from './lib/transition/scene-transition.component';
