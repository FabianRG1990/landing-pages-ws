import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@arias-ui-shared';

/** 01 · Inicio — hero, cita destacada y áreas de acompañamiento. */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './inicio.html',
})
export class InicioPage {
  private readonly portrait =
    viewChild<ElementRef<HTMLElement>>('portrait');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const onMove = (e: PointerEvent) => {
        const frame = this.portrait()?.nativeElement;
        if (!frame) return;
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        frame.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      this.destroyRef.onDestroy(() =>
        window.removeEventListener('pointermove', onMove),
      );
    });
  }
}
