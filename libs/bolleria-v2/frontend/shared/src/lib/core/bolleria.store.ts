import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ScreenId } from './models';

// Desde el 2026-09-15 la v2 no toma pedidos: la carta se consulta y el encargo
// se hace por WhatsApp. Por eso aquí ya no hay carrito, checkout ni PDF.
interface BolleriaState {
  // navegación + cortina (transcripción fiel de `go()` del original)
  screen: ScreenId;
  curtain: boolean;
  /** Se incrementa cada vez que un cambio de pantalla termina de asentarse — dispara reveal-on-scroll y el reinicio del hero. */
  settleTick: number;
  // chrome
  mobileOpen: boolean;
  // preloader
  loaded: boolean;
}

const initialState: BolleriaState = {
  screen: 'inicio',
  curtain: false,
  settleTick: 0,
  mobileOpen: false,
  loaded: false,
};

export const BolleriaStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
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

  withMethods((store) => ({
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
    go(screen: ScreenId): void {
      if (screen === store.screen()) {
        patchState(store, { mobileOpen: false });
        return;
      }
      const reduced =
        typeof window !== 'undefined' &&
        (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
      /**
       * Atados a la coreografía de `CurtainComponent`: el canje ocurre con la
       * pantalla YA cubierta (el iris tarda 260 ms) y el reset justo después
       * de que la cortina termine de desvanecerse, a los 900. Si se toca uno
       * hay que tocar el otro: adelantar el canje deja ver el salto.
       */
      const swapDelay = reduced ? 120 : 280;
      const resetDelay = reduced ? 420 : 910;
      patchState(store, { curtain: true, mobileOpen: false });
      setTimeout(() => {
        patchState(store, { screen });
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
        patchState(store, { settleTick: store.settleTick() + 1 });
      }, swapDelay);
      setTimeout(() => patchState(store, { curtain: false }), resetDelay);
    },

    toggleMobileMenu: () => patchState(store, { mobileOpen: !store.mobileOpen() }),
    closeMobileMenu: () => patchState(store, { mobileOpen: false }),

    markLoaded: () => patchState(store, { loaded: true }),
  })),
);
