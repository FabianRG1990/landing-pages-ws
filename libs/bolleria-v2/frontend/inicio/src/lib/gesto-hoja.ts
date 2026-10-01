/**
 * Pasar hoja con el dedo.
 *
 * Lo usan los DOS libros -el de siempre en el telefono de pie y el de 2026 en
 * cualquier pantalla horizontal-, y vive aparte para que los umbrales se
 * decidan en un solo sitio. Ninguno de los dos anima nada al recibirlo: los dos
 * mueven el SCROLL a la pagina pedida, porque la posicion de la ventana es la
 * unica fuente de verdad de la que cuelga todo el recorrido.
 *
 * Como se decide que un arrastre es un pase de hoja, y por que asi:
 *
 *   · `MIN_FRAC` va en fraccion del ancho de la ventana y no en pixeles. Un
 *     umbral absoluto se comporta distinto en un telefono de 360 y en uno de
 *     430, y el dedo no sabe de pixeles: sabe de "un cachito de pantalla". El
 *     10 % son 36 px en el mas estrecho y 43 en el mas ancho.
 *   · `MIN_PX` es solo un suelo, para que un toque tembloroso no cuente.
 *   · `RELACION` es lo que protege al scroll vertical, que es como se recorre
 *     el libro: el arrastre tiene que ser claramente mas horizontal que
 *     vertical o no es un pase de hoja, es alguien bajando por la pagina.
 *   · `MAX_MS` descarta el arrastre lento. Quien mantiene el dedo un segundo y
 *     medio no esta pasando una hoja; esta colocando la pagina o dudando.
 *
 * El sentido es el del papel: arrastrar hacia la IZQUIERDA se lleva la hoja y
 * abre la siguiente, como cuando se pasa una pagina de derecha a izquierda.
 */

/** Fraccion del ancho de la ventana que hay que recorrer. */
const MIN_FRAC = 0.1;
/** Suelo en pixeles, para pantallas muy estrechas. */
const MIN_PX = 36;
/** Cuanto mas horizontal que vertical tiene que ser. */
const RELACION = 1.6;
/** Mas lento que esto ya no es un gesto. */
const MAX_MS = 900;

export class GestoHoja {
  private x = 0;
  private y = 0;
  private t = 0;
  private vivo = false;

  /**
   * Solo con UN dedo: con dos el gesto es un pellizco para acercar, y ahi no
   * hay que pasar nada.
   */
  empieza(ev: TouchEvent): void {
    if (ev.touches.length !== 1) {
      this.vivo = false;
      return;
    }
    const t = ev.touches[0];
    this.x = t.clientX;
    this.y = t.clientY;
    this.t = Date.now();
    this.vivo = true;
  }

  cancela(): void {
    this.vivo = false;
  }

  /**
   * Cuantas hojas hay que pasar: +1 siguiente, -1 anterior, 0 si el arrastre no
   * llego a ser un gesto.
   */
  termina(ev: TouchEvent): number {
    if (!this.vivo) return 0;
    this.vivo = false;
    // Quedan dedos en la pantalla: era un gesto de varios, no un pase.
    if (ev.touches.length) return 0;
    const t = ev.changedTouches[0];
    if (!t) return 0;
    if (Date.now() - this.t > MAX_MS) return 0;
    const dx = t.clientX - this.x;
    const dy = t.clientY - this.y;
    const ancho = typeof window === 'undefined' ? 390 : window.innerWidth;
    if (Math.abs(dx) < Math.max(MIN_PX, ancho * MIN_FRAC)) return 0;
    if (Math.abs(dx) < Math.abs(dy) * RELACION) return 0;
    return dx < 0 ? 1 : -1;
  }
}
