import { DestroyRef } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

/**
 * Escritorio: a partir de 900 px las secciones pueden fijarse (pin) y
 * contar su historia con el scroll. Por debajo no se fija nada: en móvil
 * la barra del navegador cambia el alto visible a mitad de gesto y un pin
 * da tirones.
 */
export const ESCRITORIO = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';
export const MOVIL = '(max-width: 899.98px) and (prefers-reduced-motion: no-preference)';

export interface Variante {
  readonly escritorio: boolean;
  readonly movil: boolean;
}

/**
 * Monta la coreografía de una sección con `gsap.matchMedia`.
 *
 * `montar` corre cuando entra una de las dos variantes y todo lo que cree
 * dentro (tweens, timelines, ScrollTriggers, pins) se deshace solo al
 * cambiar de variante o al destruir el componente. Si devuelve una
 * función, esa limpieza corre también (para clases o escuchas propias).
 *
 * Con movimiento reducido no entra ninguna variante: la sección queda en
 * su estado final, que es el que pinta el HTML.
 */
export function montarEscena(
  destroyRef: DestroyRef,
  montar: (v: Variante) => void | (() => void),
): void {
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
  const mm = gsap.matchMedia();
  mm.add({ escritorio: ESCRITORIO, movil: MOVIL }, (ctx) => {
    const c = ctx.conditions as unknown as Variante;
    return montar({ escritorio: c.escritorio, movil: c.movil });
  });
  destroyRef.onDestroy(() => mm.revert());
}

/**
 * Las posiciones de los pins dependen del alto de los titulares, y ese
 * alto cambia cuando llega Instrument Sans: se recalcula una vez con la
 * fuente ya cargada. (La carga de imágenes ya la cubre ScrollTrigger con
 * su propio refresh en `load`.) `despues` corre con las posiciones ya
 * buenas: es el momento de volver a un ancla de la URL.
 */
export function refrescarConFuentes(despues?: () => void): void {
  document.fonts?.ready.then(() => {
    ScrollTrigger.refresh();
    despues?.();
  });
}
