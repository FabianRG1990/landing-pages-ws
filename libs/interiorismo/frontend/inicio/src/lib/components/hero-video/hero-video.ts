import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IntroGate, MagneticDirective } from '@interiorismo-ui-shared';

/**
 * Hero con video de fondo en loop nativo + póster, y una intro escalonada del
 * texto coordinada por `IntroGate`.
 *
 * Video: un solo `<video loop>` (el crossfade de dos capas dejaba el hero
 * "pegado" al re-entrar). El `poster` muestra el primer frame al instante.
 *
 * Intro del texto: en vez de un reveal-on-scroll (que se disparaba oculto bajo
 * el preloader → "aparecen de un solo", y con `blur` durante la cortina →
 * "brinca y brinca"), la entrada se reproduce cuando la capa que cubría se
 * levanta (preloader al cargar, cortina al re-entrar) vía `IntroGate`, y anima
 * solo opacidad + desplazamiento (sin blur) para que sea fluida.
 *
 * El gate es un contador monótono: se guarda su valor al montar (`mountTick`) y
 * se reproduce solo con el incremento POSTERIOR, no con el acumulado — así al
 * re-entrar la intro no se dispara de inmediato (con valor viejo) sino al abrir
 * la cortina.
 */
@Component({
  selector: 'app-hero-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MagneticDirective],
  templateUrl: './hero-video.html',
})
export class HeroVideo {
  private readonly video =
    viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly introGate = inject(IntroGate);

  /** Valor del gate al montar: solo reaccionamos a incrementos posteriores. */
  private readonly mountTick = this.introGate.tick();
  protected readonly intro = signal(false);

  constructor() {
    effect(() => {
      if (this.introGate.tick() > this.mountTick) this.intro.set(true);
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      // Movimiento reducido: mostrar el texto de inmediato, sin esperar la señal.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.intro.set(true);
      }

      // Salvaguarda: si por algún camino la señal no llega, no dejar el texto
      // oculto. (En el flujo normal la intro ya se disparó mucho antes.)
      const safety = setTimeout(() => this.intro.set(true), 2200);

      const v = this.video().nativeElement;
      v.muted = true;
      v.playsInline = true;

      const tryPlay = () => {
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => undefined);
      };

      tryPlay();
      v.addEventListener('loadeddata', tryPlay);
      v.addEventListener('canplay', tryPlay);
      const onVisible = () => {
        if (document.visibilityState === 'visible') tryPlay();
      };
      document.addEventListener('visibilitychange', onVisible);

      this.destroyRef.onDestroy(() => {
        clearTimeout(safety);
        v.removeEventListener('loadeddata', tryPlay);
        v.removeEventListener('canplay', tryPlay);
        document.removeEventListener('visibilitychange', onVisible);
        try {
          v.pause();
        } catch {
          /* noop */
        }
      });
    });
  }
}
