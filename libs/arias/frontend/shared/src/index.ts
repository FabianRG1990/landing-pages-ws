// Layout / chrome de la app
export { SiteBackground } from './lib/layout/site-background/site-background';
export { FloatingNav } from './lib/layout/floating-nav/floating-nav';
export { Veil } from './lib/layout/veil/veil';
export { Preloader } from './lib/layout/preloader/preloader';
export { TweaksPanel } from './lib/layout/tweaks-panel/tweaks-panel';

// Directivas
export { RevealDirective } from './lib/directives/reveal.directive';

// Transiciones de página (cortina sincronizada con el router)
export { PageTransition } from './lib/transitions/page-transition.service';
export { pageTransitionGuard } from './lib/transitions/page-transition.guard';
export { RevealOnScroll } from './lib/transitions/reveal-on-scroll.service';

// Datos compartidos
export { NAV_ITEMS, CONTACT } from './lib/data/nav';
export type { NavItem } from './lib/data/nav';
