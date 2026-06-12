import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Vista de la casa expandiéndose, fotograma a fotograma sobre canvas.
 * 121 frames (1280×720) en /frames precargados al inicio. Cada movimiento de
 * scroll dibuja directamente el frame correspondiente — sin seek, sin
 * decodificación, sin saltos (técnica estilo Apple). Traducido del original
 * vanilla a un componente Angular SSR-safe (todo el trabajo de canvas/scroll
 * corre solo en el navegador, vía afterNextRender).
 */
@Component({
  selector: 'app-exploding-scroll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exploding-scroll.html',
})
export class ExplodingScroll {
  private readonly section =
    viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly panels = viewChildren<ElementRef<HTMLElement>>('panel');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly frameCount = 121;
  private readonly framePath = (i: number) =>
    `/frames/frame_${String(i).padStart(3, '0')}.jpg`;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const section = this.section().nativeElement;
      const canvas = this.canvas().nativeElement;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      const panels = this.panels().map((p) => p.nativeElement);

      const frames = new Array<HTMLImageElement>(this.frameCount);
      let currentFrame = -1;
      let ticking = false;

      const drawFrame = (index: number) => {
        if (index === currentFrame) return;
        const f = frames[index];
        if (f && f.complete && f.naturalWidth > 0) {
          currentFrame = index;
          ctx.drawImage(f, 0, 0);
          return;
        }
        // Frame pedido aún no cargó: busca el más cercano que sí esté listo.
        for (let off = 1; off < this.frameCount; off++) {
          const a = frames[index - off];
          if (a && a.complete && a.naturalWidth > 0) {
            ctx.drawImage(a, 0, 0);
            currentFrame = index - off;
            return;
          }
          const b = frames[index + off];
          if (b && b.complete && b.naturalWidth > 0) {
            ctx.drawImage(b, 0, 0);
            currentFrame = index + off;
            return;
          }
        }
      };

      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const rect = section.getBoundingClientRect();
          const sectionHeight = section.offsetHeight - window.innerHeight;
          const scrolled = -rect.top;
          const progress = Math.max(
            0,
            Math.min(1, sectionHeight > 0 ? scrolled / sectionHeight : 0),
          );

          drawFrame(
            Math.min(this.frameCount - 1, Math.floor(progress * this.frameCount)),
          );

          panels.forEach((el, i) => {
            const fadeIn = i * 0.33 + 0.05;
            const fadeOut = i * 0.33 + 0.28;
            el.classList.toggle('active', progress >= fadeIn && progress <= fadeOut);
          });

          ticking = false;
        });
      };

      // Pre-carga eager: arranca las 121 descargas en paralelo desde el inicio.
      for (let i = 0; i < this.frameCount; i++) {
        const img = new Image();
        img.src = this.framePath(i + 1);
        if (i === 0) {
          img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            currentFrame = 0;
            onScroll();
          };
        }
        frames[i] = img;
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    });
  }
}
