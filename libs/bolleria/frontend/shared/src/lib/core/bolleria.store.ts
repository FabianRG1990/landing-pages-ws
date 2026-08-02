import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ScreenId } from './models';
import { MENU_CATEGORIES, FAVORITE_IDS, MENU_BY_ID, cartKey, parseCartKey, formatColones } from '../data/menu-data';
import { waCheckoutLink, waDirectLink } from './whatsapp';

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
    /** Cierto mientras el preloader o la cortina cubren la pantalla — el scroll
     * se bloquea (ver `installScrollLock`) exactamente durante esa ventana. */
    scrollLocked: computed(() => !store.loaded() || store.curtain()),
  })),

  withComputed((store) => ({
    cartEmpty: computed(() => store.cartCount() === 0),
    cartHas: computed(() => store.cartCount() > 0),
    cartTotalFmt: computed(() => formatColones(store.cartTotal())),
    waCheckout: computed(() => waCheckoutLink(store.cart(), store.cartCount())),
  })),

  withMethods((store) => ({
    /** Cambia de pantalla con la cortina — transcripción fiel de `go(route, cat)` del original. */
    go(screen: ScreenId, cat?: string): void {
      if (screen === store.screen() && !cat) {
        patchState(store, { mobileOpen: false });
        return;
      }
      patchState(store, { curtain: true, mobileOpen: false });
      setTimeout(() => {
        patchState(store, { screen, ...(cat ? { activeCat: cat } : {}) });
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
        patchState(store, { settleTick: store.settleTick() + 1 });
      }, 430);
      setTimeout(() => patchState(store, { curtain: false }), 950);
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
  })),
);
