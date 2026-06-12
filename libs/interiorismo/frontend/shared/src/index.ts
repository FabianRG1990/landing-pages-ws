// Layout / chrome de la app
export { GrainOverlay } from './lib/layout/grain/grain-overlay';
export { FloatingNav } from './lib/layout/floating-nav/floating-nav';
export { Footer } from './lib/layout/footer/footer';
export { Veil } from './lib/layout/veil/veil';
export { Preloader } from './lib/layout/preloader/preloader';

// Directivas
export { RevealDirective } from './lib/directives/reveal.directive';
export { MagneticDirective } from './lib/directives/magnetic.directive';

// Transiciones de página (cortina sincronizada con el router)
export { PageTransition } from './lib/transitions/page-transition.service';
export { pageTransitionGuard } from './lib/transitions/page-transition.guard';
export { RevealOnScroll } from './lib/transitions/reveal-on-scroll.service';
export { IntroGate } from './lib/transitions/intro-gate.service';

// Showcase scroll-driven (caché de frames del canvas)
export { FrameCache } from './lib/showcase/frame-cache.service';

// Datos compartidos
export { NAV_ITEMS, CONTACT } from './lib/data/nav';
export type { NavItem } from './lib/data/nav';
