import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { ScreenId } from './models';

// Desde el 2026-09-15 la v2 no toma pedidos: la carta se consulta y el encargo
// se hace por WhatsApp. Por eso aquí ya no hay carrito, checkout ni PDF.
interface BolleriaState {
  // navegación + cortina (transcripción fiel de `go()` del original)
  screen: ScreenId;
  /** La pantalla a la que se va: durante la cortina todavía no es `screen`. */
  destino: ScreenId;
  curtain: boolean;
  /** Se incrementa cada vez que un cambio de pantalla termina de asentarse — dispara reveal-on-scroll y el reinicio del hero. */
  settleTick: number;
  // chrome
  mobileOpen: boolean;
  // preloader
  loaded: boolean;
  /**
   * Si el libro de la portada esta cerrado del todo tras la ultima pagina: la
   * tapa bajada y ninguna animacion en marcha. `null` cuando ningun libro lo
   * controla -no esta montado o no llego a cargar-.
   *
   * Existe porque el libro no avanza CON el scroll: lo persigue, una vuelta de
   * ~0,8 s detras de otra. Bajando deprisa la pagina llega a la despedida antes
   * de que el libro termine de cerrarse, y la despedida espera a esto para
   * entrar. Lo escribe el libro que este montado, el vertical o el de 2026.
   */
  libroCerrado: boolean | null;
}

const initialState: BolleriaState = {
  screen: 'inicio',
  destino: 'inicio',
  curtain: false,
  settleTick: 0,
  mobileOpen: false,
  loaded: false,
  libroCerrado: null,
};

/** Bajo qué nombre se anota la pantalla en cada entrada del historial. */
const CLAVE_PANTALLA = 'bolPantalla';
const PANTALLAS: readonly ScreenId[] = ['inicio', 'menu', 'contacto'];
const esPantalla = (v: unknown): v is ScreenId => PANTALLAS.includes(v as ScreenId);

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
    go(screen: ScreenId, origen: 'mano' | 'historial' = 'mano'): void {
      // Se compara con el destino y no con `screen()`: la pantalla tarda 280 ms
      // en canjearse, y un «atrás» dentro de esa ventana veía todavía la vieja,
      // lo daba por hecho y dejaba el historial en una pantalla y el sitio en otra.
      if (screen === store.destino()) {
        patchState(store, { mobileOpen: false });
        return;
      }
      // Una entrada por pantalla, con la misma dirección. Sin esto la carta y el
      // inicio eran para el navegador la misma página: «atrás» sacaba del sitio,
      // o no hacía nada si la pestaña se abrió desde un enlace (reportado el
      // 2026-10-08). Cuando el cambio viene del historial no se añade nada: el
      // navegador ya se movió.
      if (origen === 'mano' && typeof window !== 'undefined') {
        window.history.pushState({ [CLAVE_PANTALLA]: screen }, '');
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
      patchState(store, { destino: screen, curtain: true, mobileOpen: false });
      setTimeout(() => {
        patchState(store, { screen });
        // `instant`: el html declara `scroll-behavior: smooth`, y volver arriba
        // en suave desde el pie de Inicio cruzaba el libro hoja a hoja bajo la
        // cortina. Tapado, un salto es lo que se queria.
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
        patchState(store, { settleTick: store.settleTick() + 1 });
      }, swapDelay);
      setTimeout(() => patchState(store, { curtain: false }), resetDelay);
    },

    toggleMobileMenu: () => patchState(store, { mobileOpen: !store.mobileOpen() }),
    closeMobileMenu: () => patchState(store, { mobileOpen: false }),

    markLoaded: () => patchState(store, { loaded: true }),

    setLibroCerrado: (libroCerrado: boolean | null) => patchState(store, { libroCerrado }),
  })),

  withHooks({
    onInit(store) {
      if (typeof window === 'undefined') return;
      // «Atrás» y «adelante» del navegador. La entrada con la que se abrió el
      // sitio no lleva pantalla anotada: es el inicio.
      window.addEventListener('popstate', (ev) => {
        const anotada = (ev.state as Record<string, unknown> | null)?.[CLAVE_PANTALLA];
        store.go(esPantalla(anotada) ? anotada : 'inicio', 'historial');
      });
    },
  }),
);
