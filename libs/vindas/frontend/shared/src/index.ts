// Layout / chrome de la app
export { SiteBackground } from './lib/layout/site-background/site-background';
export { FloatingNav } from './lib/layout/floating-nav/floating-nav';
export { Veil } from './lib/layout/veil/veil';
export { Preloader } from './lib/layout/preloader/preloader';
export { Footer } from './lib/layout/footer/footer';

// Directivas
export { RevealDirective } from './lib/directives/reveal.directive';

// Internacionalización ES / EN
export { I18n } from './lib/i18n/i18n.service';
export type { Lang, Strings, ServiceItem, PsicoGroup } from './lib/i18n/i18n.service';

// Transiciones de página (telón sincronizado con el router)
export { PageTransition } from './lib/transitions/page-transition.service';
export { pageTransitionGuard } from './lib/transitions/page-transition.guard';
export { RevealOnScroll } from './lib/transitions/reveal-on-scroll.service';

// Datos compartidos
export {
  NAV_ITEMS,
  PHONE_WA,
  PHONE_TEL,
  PHONE_TEL_DISPLAY,
  WHATSAPP_DISPLAY,
  EMAIL,
  IG_URL,
  FB_URL,
  whatsappHref,
  mailtoHref,
} from './lib/data/site';
export type { NavItem } from './lib/data/site';
