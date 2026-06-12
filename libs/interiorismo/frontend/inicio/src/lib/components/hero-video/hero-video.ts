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
import { MagneticDirective, RevealDirective } from '@interiorismo-ui-shared';

/**
 * Hero con video de fondo en doble capa para un loop sin costuras.
 * Dos `<video>` con la misma fuente: cuando al líder le quedan ~0.9s arrancamos
 * el otro desde 0 y cruzamos opacidades (transición CSS .hero-video). Así el
 * corte entre el final y el inicio del loop deja de notarse. Equivale al
 * crossfade del original, sin dependencias.
 */
@Component({
  selector: 'app-hero-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective, MagneticDirective],
  templateUrl: './hero-video.html',
})
export class HeroVideo {
  private readonly videoA =
    viewChild.required<ElementRef<HTMLVideoElement>>('videoA');
  private readonly videoB =
    viewChild.required<ElementRef<HTMLVideoElement>>('videoB');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly fadeOverlap = 0.9; // seg antes del final para el crossfade

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const videos = [this.videoA().nativeElement, this.videoB().nativeElement];
      let leaderIdx = 0;
      const cleanups: Array<() => void> = [];

      videos.forEach((v) => {
        v.muted = true;
        v.playsInline = true;
        v.removeAttribute('loop');

        const onEnded = () => {
          try {
            v.currentTime = 0;
            v.pause();
          } catch {
            /* noop */
          }
        };
        const onTime = () => {
          const idx = videos.indexOf(v);
          if (idx !== leaderIdx) return;
          if (!v.duration || !isFinite(v.duration)) return;
          const remaining = v.duration - v.currentTime;
          if (remaining <= this.fadeOverlap && remaining > 0.05) {
            const nextIdx = 1 - leaderIdx;
            const next = videos[nextIdx];
            try {
              next.currentTime = 0;
              next.play().catch(() => undefined);
            } catch {
              /* noop */
            }
            next.style.opacity = '1';
            v.style.opacity = '0';
            leaderIdx = nextIdx;
          }
        };

        v.addEventListener('ended', onEnded);
        v.addEventListener('timeupdate', onTime);
        cleanups.push(() => {
          v.removeEventListener('ended', onEnded);
          v.removeEventListener('timeupdate', onTime);
        });
      });

      videos[0].play().catch(() => undefined);
      this.destroyRef.onDestroy(() => cleanups.forEach((fn) => fn()));
    });
  }
}
