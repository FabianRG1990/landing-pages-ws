import {
  Directive,
  ElementRef,
  DestroyRef,
  inject,
  input,
  PLATFORM_ID,
  afterNextRender,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Cuenta hasta el valor cuando el elemento entra en pantalla.
 * SSR-safe: en el servidor se queda el valor final del template, y solo
 * en el navegador (y si el usuario no pidio menos movimiento) se anima.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective {
  readonly appCountUp = input.required<number>();
  readonly duracion = input(1100);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    afterNextRender(() => {
      if (!this.esNavegador) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const el = this.host.nativeElement;
      const destino = this.appCountUp();
      el.textContent = '0';

      const io = new IntersectionObserver(
        (entradas) => {
          if (!entradas[0].isIntersecting) return;
          io.disconnect();
          this.animar(el, destino);
        },
        { threshold: 0.6 },
      );
      io.observe(el);
      this.destroyRef.onDestroy(() => io.disconnect());
    });
  }

  private animar(el: HTMLElement, destino: number): void {
    const dur = this.duracion();
    const inicio = performance.now();

    const paso = (ahora: number) => {
      const t = Math.min((ahora - inicio) / dur, 1);
      // easeOutExpo: arranca rapido y aterriza suave
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = String(Math.round(destino * e));
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
}
