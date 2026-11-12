import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/**
 * Estado compartido del movimiento de la página.
 *
 * - Cada [data-seccion] recibe .entra la primera vez que asoma: sus
 *   [data-r] entran escalonados por CSS. Una sola vez, nunca de vuelta.
 * - El movimiento está siempre vivo; solo se aquieta si el sistema pide
 *   movimiento reducido.
 */
@Injectable({ providedIn: 'root' })
export class Escenario {
  private readonly doc = inject(DOCUMENT);

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

  detener(): void {
    this.observador?.disconnect();
  }
}
