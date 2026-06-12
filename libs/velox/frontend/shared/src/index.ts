// Public API del lib `@velox-ui-shared`.

// Layout / chrome de la app
export { Nav } from './lib/layout/nav/nav';
export { Footer } from './lib/layout/footer/footer';

// Preloader de página + señal de "experiencia lista"
export { Preloader } from './lib/preloader/preloader';
export { ExperienceReady } from './lib/preloader/experience-ready.service';

// Showcase cinemático (scroll-driven frame animation)
export { VideoShowcase } from './lib/showcase/video-showcase';

// Smooth scroll de página (Lenis + ticker de GSAP)
export { SmoothScroll } from './lib/smooth-scroll/smooth-scroll.service';

// Reveal on scroll
export { RevealDirective } from './lib/reveal/reveal.directive';
export { RevealOnScroll } from './lib/reveal/reveal-on-scroll.service';

// Motion utilitario (parallax + contador animado)
export { ParallaxDirective } from './lib/motion/parallax.directive';
export { CountUpDirective } from './lib/motion/count-up.directive';

// Transición cinematográfica entre segmentos (rutas)
export { RouteCurtain } from './lib/transition/route-curtain';
export { PageTransition } from './lib/transition/page-transition.service';
export { LinkDirective } from './lib/transition/link.directive';

// Datos de contenido
export {
  NAV_LINKS,
  HERO_STATS,
  FEATURES,
  MODELS,
  DESIGN_DETAILS,
  PERF_STATS,
  TESTIMONIAL,
  PRESS_LOGOS,
  FOOTER_COLS,
  FOOTER_LEGAL,
} from './lib/data/site';
export type {
  NavLink,
  Feature,
  FeatureIcon,
  HeroStat,
  Model,
  DesignDetail,
  PerfStat,
  Testimonial,
  FooterColumn,
} from './lib/data/site';
