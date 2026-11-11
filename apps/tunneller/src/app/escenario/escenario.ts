import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/**
 * Estado compartido del movimiento de la página.
 *
 * - Cada [data-seccion] recibe .entra la primera vez que asoma: sus
 *   [data-r] entran escalonados por CSS. Una sola vez, nunca de vuelta.
 * - La pausa (WCAG 2.2.2) detiene el metal, que es lo único que se mueve
 *   sin fin; el resto de animaciones duran menos de cinco segundos.
 */
@Injectable({ providedIn: 'root' })
export class Escenario {
  private readonly doc = inject(DOCUMENT);

  readonly pausado = signal(false);
  /** Hay al menos una pieza de metal en vivo: solo entonces se ofrece la pausa. */
  readonly conMetal = signal(false);
  readonly reducido = signal(
    typeof this.doc.defaultView?.matchMedia === 'function' &&
      this.doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)')
        .matches,
  );

  private observador?: IntersectionObserver;

  iniciar(): void {
    const win = this.doc.defaultView;
    if (!win) return;
    this.doc.documentElement.classList.add('movimiento-listo');

    this.observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('entra');
          this.observador?.unobserve(e.target);
        }
      },
      // Entra cuando el borde superior ya subió un 12% de la pantalla.
      { rootMargin: '0px 0px -12% 0px', threshold: 0 },
    );
    for (const s of Array.from(this.doc.querySelectorAll('[data-seccion]')))
      this.observador.observe(s);
  }

  alternarPausa(): void {
    this.pausado.update((p) => !p);
    // Las animaciones CSS que se repiten también se detienen.
    this.doc.documentElement.classList.toggle('en-pausa', this.pausado());
  }

  detener(): void {
    this.observador?.disconnect();
  }
}
