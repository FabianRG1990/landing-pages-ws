import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Inclina el elemento hacia el puntero, como una tarjeta que se levanta
 * de la mesa. Solo escribe `--rx` y `--ry` (en grados) en el host: el
 * transform, la perspectiva y la sombra los decide el CSS del componente.
 *
 * Solo con puntero fino y sin movimiento reducido; en táctil no hay
 * «encima». Las escrituras se agrupan en un rAF: un pointermove puede
 * dispararse varias veces por fotograma.
 */
@Directive({
  selector: '[appInclinar]',
})
export class InclinarDirective {
  /** Inclinación máxima hacia cada lado, en grados. */
  readonly appInclinar = input(5, { transform: (v: number | '') => (v === '' ? 5 : v) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const el = this.host.nativeElement;
      let pendiente = 0;
      let x = 0.5;
      let y = 0.5;

      const pintar = () => {
        pendiente = 0;
        const max = this.appInclinar();
        el.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
      };
      const mover = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        x = (e.clientX - r.left) / r.width;
        y = (e.clientY - r.top) / r.height;
        pendiente ||= requestAnimationFrame(pintar);
      };
      const salir = () => {
        cancelAnimationFrame(pendiente);
        pendiente = 0;
        el.style.removeProperty('--rx');
        el.style.removeProperty('--ry');
      };

      el.addEventListener('pointermove', mover);
      el.addEventListener('pointerleave', salir);
      destroyRef.onDestroy(() => {
        salir();
        el.removeEventListener('pointermove', mover);
        el.removeEventListener('pointerleave', salir);
      });
    });
  }
}
