import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
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
 * 121 frames dibujados directamente en cada scroll — técnica estilo Apple.
 *
 * Optimizaciones contra el tironeo:
 *  - Todo el manejo de scroll corre FUERA de la zona de Angular (solo toca
 *    canvas y clases del DOM, nada de detección de cambios).
 *  - Un IntersectionObserver activa el trabajo SOLO cuando la sección está cerca
 *    del viewport: estando en otras secciones no se llama `getBoundingClientRect`
 *    en cada scroll (se evita el thrash de layout global).
 *  - Los frames viven en `FrameCache` (singleton): al re-entrar a `inicio` no se
 *    re-decodifican; en la primera visita se difieren a `requestIdleCallback`
 *    para no competir con el hero.
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
  private readonly zone = inject(NgZone);

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
      let active = false;

      const drawFrame = (index: number) => {
        if (index === currentFrame) return;
        const f = frames[index];
        if (f && f.complete && f.naturalWidth > 0) {
          currentFrame = index;
          ctx.drawImage(f, 0, 0);
          return;
        }
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
        currentFrame = -1;
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
        if (!active || ticking) return; // fuera de la sección: no se hace nada
        ticking = true;
        requestAnimationFrame(() => {
          render();
          ticking = false;
        });
      };

      const wire = (fr: HTMLImageElement[]) => {
        frames = fr;
        sizeCanvas();
        render();
        const first = frames[0];
        if (first && !(first.complete && first.naturalWidth > 0)) {
          first.addEventListener('load', () => render(), { once: true });
        }
      };

      this.zone.runOutsideAngular(() => {
        // Activa el trabajo solo cuando la sección está a ≤1 viewport del borde.
        const io = new IntersectionObserver(
          (entries) => {
            active = entries[0]?.isIntersecting ?? false;
            if (active) render();
          },
          { rootMargin: '100% 0px 100% 0px' },
        );
        io.observe(section);

        const cached = this.frameCache.get();
        if (cached) {
          wire(cached);
        } else {
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
          io.disconnect();
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        });
      });
    });
  }
}
