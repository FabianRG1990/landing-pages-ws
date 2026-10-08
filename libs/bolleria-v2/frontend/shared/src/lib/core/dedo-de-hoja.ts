/**
 * El dedo de la hoja: con el DEDO, una hoja por gesto.
 *
 * En tactil el scroll no se bloquea ni se interrumpe -ver por que en
 * `cerrojo-de-hoja.ts`-: lo frenan los topes nativos de `freno-de-pista.ts`.
 * Pero un tope `proximity` no es una garantia. Medido en la emulacion, de vez
 * en cuando un deslizamiento fuerte se los salta y la ventana avanza tres hojas
 * de una vez; y un dedo que arrastra la pantalla entera sin soltar recorre casi
 * tres por si solo. En los dos casos el libro encadenaba esas vueltas, que es
 * el «pasan y pasan las paginas» que se reporto.
 *
 * Esto es la red que hay debajo. Mientras la escena del libro esta FIJA en
 * pantalla, la posicion del scroll no se ve: lo unico que se ve es que pagina
 * enseña el libro. Asi que:
 *
 *   1. cada gesto del dedo tiene derecho a UNA hoja, contada desde donde estaba
 *      el libro al empezar; lo que el scroll pida de mas se recorta;
 *   2. cuando el scroll se para, la ventana vuelve al reposo de esa hoja. Con la
 *      escena fija ese ajuste no mueve nada a la vista;
 *   3. si la ventana se va de la pista -la escena deja de estar fija-, no se
 *      recorta ni se ajusta nada: quien mira ya esta en otra seccion y traerlo
 *      de vuelta seria un brinco.
 *
 * No toca `overflow` ni cancela nada: solo recoloca, y solo cuando no se ve.
 */

/** Lo que tiene que estar quieto el scroll para darlo por parado. */
const QUIETO = 140;
/**
 * Cuanto dura un gesto del dedo despues del ultimo toque: la inercia sigue
 * moviendo la ventana un buen rato sin mandar ningun evento tactil.
 */
const RECIENTE = 3000;

/** Lo que el dedo necesita saber del libro. */
export interface LibroConPista {
  /** Si la escena esta fija ahora mismo. */
  fijo(): boolean;
  /** El scroll en el que reposa esa pagina. */
  reposo(pagina: number): number | null;
}

export class DedoDeHoja {
  private dedos = 0;
  private toque = -Infinity;
  private ultimoScroll = 0;
  /** La pagina en la que estaba el libro al empezar el gesto en curso. */
  private base: number | null = null;
  /** La pagina a cuyo reposo hay que volver cuando el scroll pare. */
  private pendiente: number | null = null;
  private reloj: ReturnType<typeof setTimeout> | undefined;
  private readonly quitar: () => void;

  constructor(private readonly libro: LibroConPista) {
    const toca = (e: TouchEvent): void => {
      const antes = this.dedos;
      this.dedos = e.touches.length;
      this.toque = performance.now();
      if (antes === 0 && this.dedos > 0) {
        // Gesto nuevo. Lo que el anterior dejo de mas se ajusta YA: si no, este
        // gesto naceria con la ventana varias hojas por delante y con solo
        // tocar la pantalla se ganaria otra.
        this.reposa();
        this.base = null;
      }
    };
    const mueve = (): void => {
      this.toque = performance.now();
    };
    const scroll = (): void => {
      this.ultimoScroll = performance.now();
    };
    window.addEventListener('touchstart', toca, { passive: true });
    window.addEventListener('touchend', toca, { passive: true });
    window.addEventListener('touchcancel', toca, { passive: true });
    window.addEventListener('touchmove', mueve, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    this.quitar = () => {
      window.removeEventListener('touchstart', toca);
      window.removeEventListener('touchend', toca);
      window.removeEventListener('touchcancel', toca);
      window.removeEventListener('touchmove', mueve);
      window.removeEventListener('scroll', scroll);
    };
  }

  /**
   * Recorta la pagina que pide el scroll a una hoja de distancia de donde
   * estaba el libro al empezar el gesto. `vigente` es la que el libro tiene
   * pedida ahora mismo. Sin dedo reciente o sin escena fija, no toca nada.
   */
  recorta(pedida: number, vigente: number): number {
    if (performance.now() - this.toque > RECIENTE || !this.libro.fijo()) {
      this.pendiente = null;
      return pedida;
    }
    if (this.base === null) this.base = vigente;
    const hoja = Math.max(this.base - 1, Math.min(this.base + 1, pedida));
    this.pendiente = hoja === pedida ? null : hoja;
    if (this.pendiente !== null) this.vigila();
    return hoja;
  }

  destruye(): void {
    clearTimeout(this.reloj);
    this.quitar();
  }

  private vigila(): void {
    clearTimeout(this.reloj);
    this.reloj = setTimeout(() => {
      if (this.pendiente === null) return;
      if (this.dedos > 0 || performance.now() - this.ultimoScroll < QUIETO) this.vigila();
      else this.reposa();
    }, QUIETO);
  }

  /** Devuelve la ventana al reposo de la hoja que se concedio, si no se ve. */
  private reposa(): void {
    clearTimeout(this.reloj);
    const hoja = this.pendiente;
    this.pendiente = null;
    if (hoja === null || !this.libro.fijo()) return;
    const y = this.libro.reposo(hoja);
    if (y !== null) window.scrollTo({ top: y, behavior: 'instant' });
  }
}
