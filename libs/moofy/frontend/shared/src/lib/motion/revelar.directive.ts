import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Un único observador para toda la página: cientos de elementos, un IO. */
let observador: IntersectionObserver | null = null;

function observar(el: Element): void {
  observador ??= new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('revelado');
        observador?.unobserve(e.target);
      }
    },
    // Se revela cuando el elemento ya asoma un 12 % por encima del borde
    // inferior: a 0 % la animación ocurre donde el ojo todavía no mira.
    { rootMargin: '0px 0px -12% 0px' },
  );
  observador.observe(el);
}

/**
 * Revela el elemento al entrar en pantalla, una sola vez.
 *
 * El movimiento lo pone el CSS (`[appRevelar]` en _motion.scss) y solo
 * existe bajo `html.con-movimiento`, que pone un script en línea de
 * index.html antes del primer pintado. Esta directiva marca además
 * `movimiento-listo`, la señal de que la app arrancó: sin ella, el script
 * retira la clase a los 4 s y todo queda visible. Con movimiento reducido
 * o sin JavaScript, el contenido se ve desde el principio.
 *
 * `retraso` escalona elementos hermanos (en ms).
 */
@Directive({
  selector: '[appRevelar]',
  host: {
    '[style.--retraso]': 'retraso() + "ms"',
  },
})
export class RevelarDirective {
  readonly retraso = input(0);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      document.documentElement.classList.add('con-movimiento', 'movimiento-listo');
      const el = this.host.nativeElement;
      observar(el);
      destroyRef.onDestroy(() => observador?.unobserve(el));
    });
  }
}
