import {
  DestroyRef,
  Directive,
  ElementRef,
  HostBinding,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * appMagnetic — el botón sigue sutilmente al cursor (translate proporcional a
 * la distancia al centro) y vuelve con easing expo al salir. Equivale a los
 * `.magnetic` del original. Gated tras `(hover: hover)` para que en touch los
 * estados no queden pegados tras el tap.
 */
@Directive({
  selector: '[appMagnetic]',
  standalone: true,
})
export class MagneticDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  @HostBinding('class.magnetic') readonly hostClass = true;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (!window.matchMedia('(hover: hover)').matches) return;
      const el = this.host.nativeElement;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transition = 'none';
        el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
      };
      const onLeave = () => {
        el.style.transition = 'transform 0.7s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform = 'translate(0, 0)';
      };
      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', onLeave);
      this.destroyRef.onDestroy(() => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      });
    });
  }
}
