import {
  DestroyRef,
  Directive,
  ElementRef,
  HostBinding,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * appMagnetic — el botón sigue sutilmente al cursor y vuelve con easing expo al
 * salir. Gated tras `(hover: hover)` (en touch los estados no quedan pegados).
 *
 * Perf: los listeners corren FUERA de la zona de Angular (solo escriben estilo
 * inline, nada de detección de cambios) y el rect del botón se cachea en
 * `pointerenter` — así `pointermove` no lee `getBoundingClientRect` en cada
 * movimiento (se evita el thrash lectura/escritura de layout al pasar el cursor).
 */
@Directive({
  selector: '[appMagnetic]',
  standalone: true,
})
export class MagneticDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  @HostBinding('class.magnetic') readonly hostClass = true;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (!window.matchMedia('(hover: hover)').matches) return;
      const el = this.host.nativeElement;
      let rect: DOMRect | null = null;

      this.zone.runOutsideAngular(() => {
        const onEnter = () => {
          rect = el.getBoundingClientRect();
        };
        const onMove = (e: PointerEvent) => {
          if (!rect) rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          el.style.transition = 'none';
          el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
        };
        const onLeave = () => {
          rect = null;
          el.style.transition = 'transform 0.7s cubic-bezier(0.32, 0.72, 0, 1)';
          el.style.transform = 'translate(0, 0)';
        };
        el.addEventListener('pointerenter', onEnter);
        el.addEventListener('pointermove', onMove, { passive: true });
        el.addEventListener('pointerleave', onLeave);
        this.destroyRef.onDestroy(() => {
          el.removeEventListener('pointerenter', onEnter);
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        });
      });
    });
  }
}
