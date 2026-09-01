import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { DeliveryType, ScreenId } from './models';
import { MENU_CATEGORIES, FAVORITE_IDS, MENU_BY_ID, cartKey, parseCartKey, formatColones } from '../data/menu-data';
import { waDirectLink } from './whatsapp';
import { OrderPdfService } from './order-pdf.service';

interface BolleriaState {
  // navegación + cortina (transcripción fiel de `go()` del original)
  screen: ScreenId;
  curtain: boolean;
  /** Se incrementa cada vez que un cambio de pantalla termina de asentarse — dispara reveal-on-scroll y el reinicio del hero. */
  settleTick: number;
  // chrome
  mobileOpen: boolean;
  cartOpen: boolean;
  // menú
  activeCat: string;
  cart: Record<string, number>;
  // preloader
  loaded: boolean;
  // pedido final (nombre + tipo de entrega + PDF generado)
  checkoutOpen: boolean;
  checkoutStep: 'form' | 'preview';
  customerName: string;
  deliveryType: DeliveryType | null;
  checkoutError: string | null;
  orderNumber: string | null;
  orderDate: string | null;
  pdfUrl: string | null;
}

const initialState: BolleriaState = {
  screen: 'inicio',
  curtain: false,
  settleTick: 0,
  mobileOpen: false,
  cartOpen: false,
  activeCat: 'pan-dulce',
  cart: {},
  loaded: false,
  checkoutOpen: false,
  checkoutStep: 'form',
  customerName: '',
  deliveryType: null,
  checkoutError: null,
  orderNumber: null,
  orderDate: null,
  pdfUrl: null,
};

export const BolleriaStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    categories: computed(() =>
      MENU_CATEGORIES.map((c) => ({ ...c, active: c.key === store.activeCat() })),
    ),
    activeCategory: computed(
      () => MENU_CATEGORIES.find((c) => c.key === store.activeCat()) ?? MENU_CATEGORIES[0],
    ),
    activeItems: computed(
      () => (MENU_CATEGORIES.find((c) => c.key === store.activeCat()) ?? MENU_CATEGORIES[0]).items,
    ),
    favorites: computed(() => FAVORITE_IDS.map((id) => MENU_BY_ID[id])),
    cartCount: computed(() => Object.values(store.cart()).reduce((s, q) => s + q, 0)),
    cartTotal: computed(() =>
      Object.entries(store.cart()).reduce((s, [key, q]) => s + parseCartKey(key).item.price * q, 0),
    ),
    cartLines: computed(() =>
      Object.entries(store.cart()).map(([key, qty]) => ({ id: key, qty, ...parseCartKey(key) })),
    ),
    waDirect: computed(() => waDirectLink()),
    /** Cierto mientras el preloader, la cortina o el menú móvil cubren la
     * pantalla — el scroll se bloquea (ver `installScrollLock`) exactamente
     * durante esa ventana.
     *
     * El menú entró aquí por un fallo reportado en el teléfono: `.bol-mobile-menu`
     * es `position: fixed; inset: 0` y NO tiene desplazamiento propio, así que
     * un dedo sobre el menú abierto se encadenaba al documento y movía la
     * página de detrás. Se cerraba el menú y se había quedado en otro sitio.
     *
     * `installScrollLock` es la pieza correcta y no una improvisación: cancela
     * desde el PRIMER `touchmove`, que es la única ventana en la que Safari de
     * iOS todavía atiende la cancelación. De propina, `ckEnabled()` también
     * consulta esto, así que con el menú abierto el controlador de paradas del
     * hero se aparta solo. */
    scrollLocked: computed(() => !store.loaded() || store.curtain() || store.mobileOpen()),
  })),

  withComputed((store) => ({
    cartEmpty: computed(() => store.cartCount() === 0),
    cartHas: computed(() => store.cartCount() > 0),
    cartTotalFmt: computed(() => formatColones(store.cartTotal())),
  })),

  withMethods((store) => {
    const pdf = inject(OrderPdfService);
    let _blobUrl: string | null = null;

    return {
      /**
       * Cambia de pantalla con la cortina del "hornito" (ver
       * `CurtainComponent`): el iris de entrada cubre toda la pantalla desde
       * los ~750ms, y no empieza a desvanecerse hasta los 1750ms, así que el
       * cambio de pantalla a los 1000ms ocurre siempre con la pantalla vieja
       * completamente tapada — no depende de nada probabilístico. El estado
       * se resetea a los 2450ms, justo después de que la cortina termina de
       * desvanecerse del todo (`stage` vuelve a `idle` a los 2400ms). Con
       * `prefers-reduced-motion` el componente usa un respaldo mucho más
       * corto (~420ms) — estos tiempos lo acompañan.
       */
      go(screen: ScreenId, cat?: string): void {
        if (screen === store.screen() && !cat) {
          patchState(store, { mobileOpen: false });
          return;
        }
        const reduced =
          typeof window !== 'undefined' &&
          (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
        const swapDelay = reduced ? 120 : 1000;
        const resetDelay = reduced ? 420 : 2450;
        patchState(store, { curtain: true, mobileOpen: false });
        setTimeout(() => {
          patchState(store, { screen, ...(cat ? { activeCat: cat } : {}) });
          if (typeof window !== 'undefined') window.scrollTo(0, 0);
          patchState(store, { settleTick: store.settleTick() + 1 });
        }, swapDelay);
        setTimeout(() => patchState(store, { curtain: false }), resetDelay);
      },

      toggleMobileMenu: () => patchState(store, { mobileOpen: !store.mobileOpen() }),
      closeMobileMenu: () => patchState(store, { mobileOpen: false }),

      openCart: () => patchState(store, { cartOpen: true }),
      closeCart: () => patchState(store, { cartOpen: false }),

      setActiveCat: (key: string) => patchState(store, { activeCat: key }),

      addToCart(id: string, option?: string): void {
        const key = cartKey(id, option);
        const cart = store.cart();
        patchState(store, { cart: { ...cart, [key]: (cart[key] ?? 0) + 1 } });
      },
      incCart(id: string): void {
        const cart = store.cart();
        patchState(store, { cart: { ...cart, [id]: (cart[id] ?? 0) + 1 } });
      },
      decCart(id: string): void {
        const cart = store.cart();
        const q = (cart[id] ?? 0) - 1;
        const next = { ...cart };
        if (q <= 0) delete next[id];
        else next[id] = q;
        patchState(store, { cart: next });
      },
      clearCart: () => patchState(store, { cart: {} }),

      markLoaded: () => patchState(store, { loaded: true }),

      // ---- pedido final: nombre + tipo de entrega + PDF ----
      openCheckout: () =>
        patchState(store, {
          checkoutOpen: true,
          checkoutStep: 'form',
          customerName: '',
          deliveryType: null,
          checkoutError: null,
          orderNumber: null,
          orderDate: null,
          pdfUrl: null,
        }),
      closeCheckout: () => patchState(store, { checkoutOpen: false }),
      setCustomerName: (name: string) => patchState(store, { customerName: name }),
      setDeliveryType: (type: DeliveryType) => patchState(store, { deliveryType: type }),

      /** Valida y, si todo está, genera el PDF (con descarga automática) y pasa a la vista previa. Devuelve lo que falta. */
      confirmOrder(): string[] {
        const name = store.customerName().trim();
        const type = store.deliveryType();
        const miss: string[] = [];
        if (!name) miss.push('el nombre del pedido');
        if (!type) miss.push('el tipo de entrega');
        if (miss.length) {
          patchState(store, { checkoutError: 'Falta ' + miss.join(' y ') });
          return miss;
        }
        const order = pdf.buildOrder({
          customerName: name,
          deliveryType: type as DeliveryType,
          lines: store.cartLines(),
          total: store.cartTotal(),
        });
        if (_blobUrl) {
          try {
            URL.revokeObjectURL(_blobUrl);
          } catch {
            /* noop */
          }
        }
        _blobUrl = order.url;
        // Descarga AUTOMÁTICA al generar — mismo criterio que Automotivo: el
        // cliente recibe el archivo sí o sí, sin depender de que sepa/recuerde
        // pulsar "Descargar". Se ejecuta dentro del gesto de confirmar, así
        // que el navegador no la bloquea.
        try {
          order.save();
        } catch {
          /* noop */
        }
        patchState(store, {
          checkoutError: null,
          checkoutStep: 'preview',
          pdfUrl: order.url,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
        });
        return [];
      },
      /** Re-descarga manual (la orden ya se descargó al generarse). */
      downloadPdf: () => pdf.lastOrder?.save(),
      /**
       * En computadora, ir directo al link de WhatsApp con el texto — es el
       * camino simple que ya funcionaba, y agregarle un paso de "compartir"
       * de por medio (aunque el navegador lo soporte técnicamente, como pasa
       * en varias configuraciones de Windows) es fricción que el cliente no
       * pidió: si pedir se vuelve complicado, la persona abandona la página y
       * escribe directo a WhatsApp por su cuenta.
       * En celular sí vale la pena: ahí el PDF se comparte adjunto de verdad
       * (WhatsApp aparece en el menú nativo de compartir). Si el cliente
       * cancela ese menú, no forzamos nada más; si falla por otra razón, cae
       * al mismo link de WhatsApp con texto de respaldo.
       */
      async sendWhatsappOrder(): Promise<void> {
        const type = store.deliveryType();
        const orderNumber = store.orderNumber();
        const orderDate = store.orderDate();
        if (!type || !orderNumber || !orderDate || typeof window === 'undefined') return;

        const input = {
          customerName: store.customerName(),
          deliveryType: type,
          lines: store.cartLines(),
          total: store.cartTotal(),
          orderNumber,
          orderDate,
        };

        const order = pdf.lastOrder;
        const nav = navigator as Navigator & {
          userAgentData?: { mobile?: boolean };
          canShare?: (data?: ShareData) => boolean;
          share?: (data?: ShareData) => Promise<void>;
        };
        const isMobile = nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(nav.userAgent ?? '');
        if (isMobile && order && nav.canShare && nav.share) {
          try {
            const file = new File([order.blob], order.filename, { type: 'application/pdf' });
            if (nav.canShare({ files: [file] })) {
              await nav.share({ files: [file], text: pdf.orderMessage(input) });
              return;
            }
          } catch (err) {
            if ((err as DOMException)?.name === 'AbortError') return;
            /* cualquier otro error: seguimos con el respaldo de abajo */
          }
        }
        window.open(pdf.whatsappText(input), '_blank', 'noopener');
      },
    };
  }),
);
