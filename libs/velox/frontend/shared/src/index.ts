// Public API del lib `@velox-ui-shared`.

// Layout / chrome de la app
export { Nav } from './lib/layout/nav/nav';
export { Footer } from './lib/layout/footer/footer';

// Showcase cinemático (scroll-driven frame animation)
export { VideoShowcase } from './lib/showcase/video-showcase';

// Smooth scroll de página (Lenis + ticker de GSAP)
export { SmoothScroll } from './lib/smooth-scroll/smooth-scroll.service';

// Reveal on scroll
export { RevealDirective } from './lib/reveal/reveal.directive';
export { RevealOnScroll } from './lib/reveal/reveal-on-scroll.service';

// Datos de contenido
export {
  NAV_LINKS,
  HERO_STATS,
  FEATURES,
  PRESS_LOGOS,
  FOOTER_COLS,
  FOOTER_LEGAL,
} from './lib/data/site';
export type {
  Feature,
  FeatureIcon,
  HeroStat,
  FooterColumn,
} from './lib/data/site';
