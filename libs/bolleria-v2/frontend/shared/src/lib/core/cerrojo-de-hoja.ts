/**
 * El cerrojo de la hoja: con RUEDA, una hoja por gesto.
 *
 * Lo pidieron las pruebas del 2026-10-02: «mientras se esta animando el libro
 * deberia de bloquear el scroll, porque si no acumula los scrolls y pasa todas
 * las paginas rapidisimo, y mientras se estan pasando ya se hizo scroll hasta
 * abajo». El libro leia la posicion del scroll y encadenaba vueltas hasta
 * alcanzarla, acelerando hasta 3x: un gesto largo de trackpad eran ocho hojas a
 * toda prisa y la ventana ya en otra parte (medido).
 *
 * Ahora, en cuanto la rueda pide UNA hoja:
 *
 *   1. se echa el cerrojo y el resto del gesto ya no mueve la pagina: se
 *      cancelan rueda y teclas;
 *   2. la hoja se pasa a su ritmo;
 *   3. el cerrojo se suelta cuando la hoja ha terminado Y el gesto tambien
 *      -`SILENCIO` ms sin rueda-. Sin esa espera, la inercia del trackpad, que
 *      sigue mandando rueda casi un segundo despues de soltar, pasaria la hoja
 *      siguiente en cuanto acabara la anterior;
 *   4. al soltarse, el libro recoloca la ventana en el reposo de su hoja (ver
 *      `alSoltar`): lo que Chrome no dejo cancelar a mitad de gesto se descarta.
 *
 * EL DEDO NO PASA POR AQUI, y costo un fallo aprenderlo. La primera version
 * tambien bloqueaba en tactil, con `overflow: hidden` en la raiz -lo unico que
 * corta una inercia ya en marcha- y recolocando al soltar. Reportado el
 * 2026-10-05 y reproducido: subiendo desde la despedida el libro se abria y se
 * volvia a cerrar, una y otra vez, y al salir por arriba la pagina brincaba de
 * vuelta al libro. La causa es del navegador: al quitarle y devolverle el scroll
 * a la raiz vuelve a cuadrar en el tope de `scroll-snap` en el que estaba ANTES,
 * por encima de donde el codigo acababa de dejar la ventana.
 *
 * En tactil el freno es nativo y no se le lleva la contraria: un tope con
 * `scroll-snap-stop: always` en cada hoja (ver `freno-de-pista.ts`). El dedo no
 * puede atravesarlo por fuerte que venga, y nadie mueve la ventana por su cuenta.
 *
 * Solo cuenta como gesto lo que viene DE LA MANO -rueda, flechas- y hace poco
 * (`RECIENTE`). Un scroll programado que cruza el libro -Inicio/Fin, volver
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
/** Cuanto vale una entrada de la mano para dar por gesto la hoja que pide. */
const RECIENTE = 1000;

const TECLAS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown']);
/** Las que mueven poco: Inicio y Fin son saltos, no gestos. */
const TECLAS_DE_PASO = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown']);

export class CerrojoDeHoja {
  private echado = false;
  private hojaEnMarcha = false;
  private ultimo = 0;
  /** Cuando llego la ultima rueda o tecla; el dedo la borra. */
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
    // La mano se vigila siempre, en pasivo: el gesto que echa el cerrojo empezo
    // antes que el.
    const mano = (): void => {
      this.entrada = performance.now();
    };
    const pulsa = (e: KeyboardEvent): void => {
      if (TECLAS_DE_PASO.has(e.key)) mano();
    };
    // Un dedo en el cristal: lo que venga ahora no es un gesto de rueda, aunque
    // haya habido una hace un momento (un portatil con pantalla tactil).
    const dedo = (): void => {
      this.entrada = -Infinity;
    };
    window.addEventListener('wheel', mano, { passive: true });
    window.addEventListener('keydown', pulsa);
    window.addEventListener('touchstart', dedo, { passive: true });
    // Rueda NO pasiva solo mientras el cerrojo esta echado: puesta siempre, el
    // navegador tendria que esperar al hilo principal en cada muesca de rueda de
    // toda la pagina.
    this.bloquea = (si) => {
      if (si) {
        window.addEventListener('wheel', rueda, { passive: false });
        window.addEventListener('keydown', tecla);
      } else {
        window.removeEventListener('wheel', rueda);
        window.removeEventListener('keydown', tecla);
      }
    };
    this.quitar = () => {
      window.removeEventListener('wheel', mano);
      window.removeEventListener('keydown', pulsa);
      window.removeEventListener('touchstart', dedo);
    };
  }

  /** Si el gesto en curso ya no manda. Mientras, el libro no relee la pista. */
  get puesto(): boolean {
    return this.echado;
  }

  /** Si la hoja que se pide ahora viene de un gesto de rueda o de teclado. */
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
  }

  private esperaAlGesto(): void {
    clearTimeout(this.reloj);
    const callado = performance.now() - this.ultimo;
    if (callado >= SILENCIO) {
      this.suelta();
      return;
    }
    this.reloj = setTimeout(() => this.esperaAlGesto(), Math.max(16, SILENCIO - callado));
  }

  private suelta(): void {
    if (!this.echado) return;
    this.limpiaRelojes();
    const terminada = !this.hojaEnMarcha;
    this.alSoltar(terminada);
    this.bloquea(false);
    this.echado = false;
  }

  private limpiaRelojes(): void {
    clearTimeout(this.reloj);
    clearTimeout(this.tope);
    this.reloj = undefined;
    this.tope = undefined;
  }
}
