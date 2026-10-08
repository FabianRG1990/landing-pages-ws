import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Cuenta de 0 al valor cuando la cifra entra en pantalla, una vez.
 *
 * En el servidor la plantilla ya trae el valor final, y con movimiento
 * reducido se queda así: la directiva solo pone el cero en el navegador,
 * justo antes de poder animar, para que nunca se lea un cero congelado.
 */
@Directive({
  selector: '[appContador]',
})
export class ContadorDirective {
  readonly appContador = input.required<number>();
  readonly duracion = input(1400);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const el = this.host.nativeElement;
      el.textContent = '0';
      const io = new IntersectionObserver(
        (entradas) => {
          if (!entradas[0].isIntersecting) return;
          io.disconnect();
          this.animar(el);
        },
        { threshold: 0.6 },
      );
      io.observe(el);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }

  private animar(el: HTMLElement): void {
    const destino = this.appContador();
    const dur = this.duracion();
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min((ahora - inicio) / dur, 1);
      // easeOutExpo: arranca rápido y aterriza suave
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = String(Math.round(destino * e));
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
}
