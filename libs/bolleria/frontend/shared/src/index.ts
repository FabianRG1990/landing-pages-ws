// Público API de `@bolleria-ui-shared`.
// Núcleo de dominio (modelos, store), datos (menú, contacto), WhatsApp/mailto,
// y el "chrome" del sitio (navbar, footer, preloader, cortina, carrito).

// core
export * from './lib/core/models';
export * from './lib/core/bolleria.store';
export * from './lib/core/whatsapp';
export * from './lib/core/scroll-lock';

// data
export * from './lib/data/menu-data';
export * from './lib/data/contact-data';

// chrome
export { PreloaderComponent } from './lib/preloader/preloader.component';
export { CurtainComponent } from './lib/transition/curtain.component';
export { SiteNavComponent } from './lib/layout/site-nav.component';
export { SiteFooterComponent } from './lib/layout/site-footer.component';
export { CartDrawerComponent } from './lib/cart/cart-drawer.component';
export { CheckoutDialogComponent } from './lib/checkout/checkout-dialog.component';
