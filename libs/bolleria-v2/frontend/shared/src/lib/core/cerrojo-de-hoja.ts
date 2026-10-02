/**
 * El cerrojo de la hoja: una hoja por gesto.
 *
 * Lo pidieron las pruebas del 2026-10-02: «mientras se esta animando el libro
 * deberia de bloquear el scroll, porque si no acumula los scrolls y pasa todas
 * las paginas rapidisimo, y mientras se estan pasando ya se hizo scroll hasta
 * abajo». El libro leia la posicion del scroll y encadenaba vueltas hasta
 * alcanzarla, acelerando hasta 3x: un gesto largo eran cinco hojas a toda prisa
 * y la ventana ya en otra parte.
 *
 * Ahora, en cuanto un gesto pide UNA hoja:
 *
 *   1. se echa el cerrojo y el resto del gesto ya no mueve la pagina;
 *   2. la hoja se pasa a su ritmo;
 *   3. el cerrojo se suelta cuando la hoja ha terminado Y el gesto tambien -sin
 *      dedo en el cristal y `SILENCIO` ms sin rueda-. Sin esa espera, la inercia
 *      del trackpad, que sigue mandando rueda casi un segundo despues de soltar,
 *      pasaria la hoja siguiente en cuanto acabara la anterior;
 *   4. al soltarse, el libro recoloca la ventana en el reposo de su hoja (ver
 *      `alSoltar`): lo que el gesto alcanzara a recorrer se descarta.
 *
 * COMO SE BLOQUEA depende del puntero, y no es un capricho:
 *
 *   · TACTIL: `overflow: hidden` en la raiz (clase `bol-cerrojo`, la regla vive
 *     en `styles.scss`). Es lo unico que corta un deslizamiento que YA va en
 *     marcha: Chrome deja de poder cancelar `touchmove` en cuanto el scroll
 *     arranca, y la inercia de iOS no se cancela desde JS. Ahi la barra es
 *     superpuesta y no ocupa sitio, asi que esconderla no mueve nada.
 *   · RATON: se cancelan rueda y teclas, sin tocar `overflow`. Esconder la barra
 *     a medida del sitio estrecha la pagina 15 px y la hace brincar, que es
 *     justo lo que `installScrollLock` evita (ver `scroll-lock.ts`). Lo que
 *     Chrome ya no deje cancelar a mitad de un gesto del trackpad lo absorbe la
 *     recolocacion del paso 4: la escena esta fija y no se ve.
 *
 * Solo cuenta como gesto lo que viene DE LA MANO -rueda, dedo, flechas- y hace
 * poco (`RECIENTE`). Un scroll programado que cruza el libro -Inicio/Fin, volver
 * arriba desde el menu- pasaba hoja a hoja, se tomaba por un gesto y se quedaba
 * clavado en la primera (medido con Fin).
 *
 * Y un tope, `TOPE`, solo para la HOJA: si tarda mas que eso en pasar -en 4G
 * el libro horizontal espera a sus cuadros, hasta 6 s-, el cerrojo se suelta
 * igual. Un scroll que no responde da mas miedo que un libro que va por detras.
 * Al GESTO no se le pone tope: mientras siga llegando rueda es el mismo gesto,
 * y con un tope de 3 s un trackpad largo pasaba una segunda hoja (medido).
 */

/** Lo que tiene que callar la rueda para dar el gesto por terminado. */
const SILENCIO = 150;
/** Lo mas que el cerrojo espera a que la hoja termine de pasar. */
const TOPE = 3000;
/** La clase que, en tactil, quita el scroll a la raiz. */
export const CLASE_CERROJO = 'bol-cerrojo';

/**
 * Cuanto vale una entrada de la mano para dar por gesto la hoja que pide. Un
 * segundo: la inercia del dedo sigue moviendo la pagina mucho despues del
 * ultimo `touchmove`, sin mandar ningun evento.
 */
const RECIENTE = 1000;

const TECLAS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown']);
/** Las que mueven poco: Inicio y Fin son saltos, no gestos. */
const TECLAS_DE_PASO = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown']);

export class CerrojoDeHoja {
  private echado = false;
  private hojaEnMarcha = false;
  private dedos = 0;
  private ultimo = 0;
  private entrada = -Infinity;
  private reloj: ReturnType<typeof setTimeout> | undefined;
  private tope: ReturnType<typeof setTimeout> | undefined;
  private readonly quitar: () => void;
  private readonly bloquea: (si: boolean) => void;

  /**
   * `alSoltar(terminada)` se llama al soltar el cerrojo. `terminada` es falso
   * solo si lo solto el `TOPE` con la hoja todavia en marcha: entonces no hay
   * reposo al que volver y el libro sigue al scroll como siempre.
   */
  constructor(private readonly alSoltar: (terminada: boolean) => void) {
    const rueda = (e: Event): void => {
      this.ultimo = performance.now();
      if (e.cancelable) e.preventDefault();
    };
    const tecla = (e: KeyboardEvent): void => {
      if (TECLAS.has(e.key)) e.preventDefault();
    };
    // Los dedos y la mano se vigilan siempre, en pasivo: el gesto que echa el
    // cerrojo empezo antes que el.
    const toca = (e: TouchEvent): void => {
      this.dedos = e.touches.length;
      this.ultimo = this.entrada = performance.now();
    };
    const mano = (): void => {
      this.entrada = performance.now();
    };
    const pulsa = (e: KeyboardEvent): void => {
      if (TECLAS_DE_PASO.has(e.key)) mano();
    };
    window.addEventListener('touchstart', toca, { passive: true });
    window.addEventListener('touchend', toca, { passive: true });
    window.addEventListener('touchcancel', toca, { passive: true });
    window.addEventListener('touchmove', mano, { passive: true });
    window.addEventListener('wheel', mano, { passive: true });
    window.addEventListener('keydown', pulsa);
    // Rueda y dedo NO pasivos solo mientras el cerrojo esta echado: puestos
    // siempre, el navegador tendria que esperar al hilo principal en cada
    // muesca de rueda de toda la pagina.
    this.bloquea = (si) => {
      if (si) {
        window.addEventListener('wheel', rueda, { passive: false });
        window.addEventListener('touchmove', rueda, { passive: false });
        window.addEventListener('keydown', tecla);
      } else {
        window.removeEventListener('wheel', rueda);
        window.removeEventListener('touchmove', rueda);
        window.removeEventListener('keydown', tecla);
      }
    };
    this.quitar = () => {
      window.removeEventListener('touchstart', toca);
      window.removeEventListener('touchend', toca);
      window.removeEventListener('touchcancel', toca);
      window.removeEventListener('touchmove', mano);
      window.removeEventListener('wheel', mano);
      window.removeEventListener('keydown', pulsa);
    };
  }

  /** Si el gesto en curso ya no manda. Mientras, el libro no relee la pista. */
  get puesto(): boolean {
    return this.echado;
  }

  /** Si la hoja que se pide ahora viene de un gesto de la mano. */
  get hayGesto(): boolean {
    return performance.now() - this.entrada < RECIENTE;
  }

  /** Empieza una hoja: se echa el cerrojo. */
  echa(): void {
    this.limpiaRelojes();
    if (!this.echado) this.bloquea(true);
    this.echado = true;
    this.hojaEnMarcha = true;
    this.ultimo = performance.now();
    document.documentElement.classList.add(CLASE_CERROJO);
    this.tope = setTimeout(() => this.suelta(), TOPE);
  }

  /** La hoja termino. El cerrojo se suelta en cuanto termine tambien el gesto. */
  hojaHecha(): void {
    if (!this.echado) return;
    this.hojaEnMarcha = false;
    clearTimeout(this.tope);
    this.esperaAlGesto();
  }

  /** Suelta sin avisar: al desmontar el libro. */
  destruye(): void {
    this.limpiaRelojes();
    this.quitar();
    if (this.echado) this.bloquea(false);
    this.echado = false;
    document.documentElement.classList.remove(CLASE_CERROJO);
  }

  private esperaAlGesto(): void {
    clearTimeout(this.reloj);
    const callado = performance.now() - this.ultimo;
    if (this.dedos === 0 && callado >= SILENCIO) {
      this.suelta();
      return;
    }
    // Con un dedo en el cristal no hay fin de gesto que medir: se vuelve a mirar
    // en `SILENCIO`, que es tambien lo que se espera tras levantarlo.
    this.reloj = setTimeout(() => this.esperaAlGesto(), Math.max(16, SILENCIO - callado));
  }

  private suelta(): void {
    if (!this.echado) return;
    this.limpiaRelojes();
    const terminada = !this.hojaEnMarcha;
    // Primero se recoloca, con la raiz todavia sin scroll en tactil: asi el
    // reposo se fija antes de que el dedo pueda volver a mover nada.
    this.alSoltar(terminada);
    this.bloquea(false);
    this.echado = false;
    document.documentElement.classList.remove(CLASE_CERROJO);
  }

  private limpiaRelojes(): void {
    clearTimeout(this.reloj);
    clearTimeout(this.tope);
    this.reloj = undefined;
    this.tope = undefined;
  }
}
