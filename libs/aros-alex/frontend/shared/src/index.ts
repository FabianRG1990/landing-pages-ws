// Layout / chrome de la app
export { GrainTexture } from './lib/layout/grain-texture/grain-texture';
export { Preloader } from './lib/layout/preloader/preloader';
export { Veil } from './lib/layout/veil/veil';
export { FloatingNav } from './lib/layout/floating-nav/floating-nav';
export { SiteFooter } from './lib/layout/footer/footer';

// Componentes reutilizables
export { BeforeAfter } from './lib/components/before-after/before-after';
export { ReviewsCarousel } from './lib/components/reviews-carousel/reviews-carousel';
export { MapChooser } from './lib/components/map-chooser/map-chooser';
export { Icon } from './lib/icons/icon';

// Directivas
export { RevealDirective } from './lib/directives/reveal.directive';

// Transiciones de página (cortina sincronizada con el router)
export { PageTransition } from './lib/transitions/page-transition.service';
export { pageTransitionGuard } from './lib/transitions/page-transition.guard';
export { RevealOnScroll } from './lib/transitions/reveal-on-scroll.service';

// i18n (signal store ES/EN)
export { LanguageStore } from './lib/i18n/language.store';
export type { Lang, Bilingual } from './lib/i18n/types';

// Servicios
export { OpeningHours } from './lib/services/opening-hours';
export { MapSheet } from './lib/services/map-sheet';

// Datos y copy
export {
  NAV_ITEMS,
  CONTACT,
  HERO_MARQUEE,
  PROMISES,
  SERVICES,
  REVIEWS,
  WHEELS,
  WHEEL_FILTERS,
  GALLERY,
  GALLERY_FILTERS,
  HOURS,
} from './lib/data/content';
export { COPY } from './lib/data/copy';
export type {
  NavItem,
  PromiseCard,
  ServiceCard,
  Review,
  Wheel,
  WheelSpec,
  GalleryItem,
  Filter,
  HoursRow,
} from './lib/data/types';
