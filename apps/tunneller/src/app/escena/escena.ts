import { DestroyRef } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Coreografía por scroll con GSAP, con la misma regla que Moofy y ADN:
 * los pins solo en escritorio (≥ 900 px de ancho y ≥ 521 px de alto). En
 * móvil la barra del navegador cambia el alto visible a mitad de gesto y
 * un pin da tirones. Con movimiento reducido no entra ninguna variante:
 * la página queda en su estado final, que es el que pinta el HTML.
 */
const MOVIMIENTO = '(prefers-reduced-motion: no-preference)';
export const ESCRITORIO = `(min-width: 900px) and (min-height: 521px) and ${MOVIMIENTO}`;
export const MOVIL = `(max-width: 899.98px) and ${MOVIMIENTO}, (max-height: 520.98px) and ${MOVIMIENTO}`;

export interface Variante {
  readonly escritorio: boolean;
  readonly movil: boolean;
}

/**
 * Monta una escena con `gsap.matchMedia`: todo lo que `montar` cree
 * (tweens, ScrollTriggers, pins) se deshace solo al cambiar de variante
 * o al destruir el componente. Si devuelve una función, también corre.
 */
export function montarEscena(
  destruir: DestroyRef,
  montar: (v: Variante) => void | (() => void),
): void {
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  mm.add({ escritorio: ESCRITORIO, movil: MOVIL }, (ctx) => {
    const c = ctx.conditions as unknown as Variante;
    return montar({ escritorio: c.escritorio, movil: c.movil });
  });
  destruir.onDestroy(() => mm.revert());
}

/**
 * Las posiciones de los pins dependen del alto de los titulares, que
 * cambia al llegar Inter Tight: se recalculan una vez con la fuente ya
 * cargada.
 */
export function refrescarConFuentes(): void {
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
