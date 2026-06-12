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
import { FrameCache } from '@interiorismo-ui-shared';

/**
 * Vista de la casa expandiéndose, fotograma a fotograma sobre canvas.
 * 121 frames (1280×720) dibujados directamente en cada scroll — sin seek, sin
 * decodificación por frame, sin saltos (técnica estilo Apple).
 *
 * Los frames viven en `FrameCache` (singleton), así que al volver a `inicio`
 * desde otra sección NO se vuelven a crear ni decodificar: el canvas dibuja al
 * instante el frame correspondiente y el hero deja de "trabarse". En la primera
 * visita la pre-carga se difiere a `requestIdleCallback` para que el hero tenga
 * prioridad de ancho de banda.
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
  private readonly frameCache = inject(FrameCache);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const section = this.section().nativeElement;
      const canvas = this.canvas().nativeElement;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      const panels = this.panels().map((p) => p.nativeElement);
      const frameCount = this.frameCache.count;

      let frames: HTMLImageElement[] = [];
      let currentFrame = -1;
      let ticking = false;
      let sized = false;

      const drawFrame = (index: number) => {
        if (index === currentFrame) return;
        const f = frames[index];
        if (f && f.complete && f.naturalWidth > 0) {
          currentFrame = index;
          ctx.drawImage(f, 0, 0);
          return;
        }
        // Frame pedido aún no listo: dibuja el más cercano que sí lo esté.
        for (let off = 1; off < frameCount; off++) {
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

      const sizeCanvas = () => {
        if (sized) return;
        const first = frames[0];
        if (!first || !first.complete || first.naturalWidth === 0) return;
        canvas.width = first.naturalWidth;
        canvas.height = first.naturalHeight;
        sized = true;
        currentFrame = -1; // forzar el primer drawImage tras dimensionar
      };

      const render = () => {
        const rect = section.getBoundingClientRect();
        const sectionHeight = section.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        const progress = Math.max(
          0,
          Math.min(1, sectionHeight > 0 ? scrolled / sectionHeight : 0),
        );

        sizeCanvas();
        if (sized) {
          drawFrame(Math.min(frameCount - 1, Math.floor(progress * frameCount)));
        }

        panels.forEach((el, i) => {
          const fadeIn = i * 0.33 + 0.05;
          const fadeOut = i * 0.33 + 0.28;
          el.classList.toggle(
            'active',
            progress >= fadeIn && progress <= fadeOut,
          );
        });
      };

      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          render();
          ticking = false;
        });
      };

      const wire = (fr: HTMLImageElement[]) => {
        frames = fr;
        // Dibuja ya con lo que haya en caché (en re-entradas, todo está listo).
        sizeCanvas();
        render();
        // Si el primer frame aún no decodificó, redibuja cuando llegue.
        const first = frames[0];
        if (first && !(first.complete && first.naturalWidth > 0)) {
          first.addEventListener('load', () => render(), { once: true });
        }
      };

      const cached = this.frameCache.get();
      if (cached) {
        wire(cached);
      } else {
        // Primera visita: difiere la descarga para no competir con el hero.
        const start = () => wire(this.frameCache.preload());
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(start, { timeout: 800 });
        } else {
          setTimeout(start, 200);
        }
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
