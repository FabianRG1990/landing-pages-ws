import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { ExperienceReady } from './experience-ready.service';
import { SmoothScroll } from '../smooth-scroll/smooth-scroll.service';

/**
 * Preloader de página completa. Cubre toda la pantalla con la marca VELOX y un
 * spinner indeterminado mientras el showcase cinemático extrae y cachea los 150
 * frames. Solo se revela la página cuando `ExperienceReady` marca listo —no se
 * muestra ninguna barra de progreso ni contador. Bloquea el scroll mientras
 * carga y se desvanece (sin trabarse) cuando termina.
 *
 * Browser-only para la lógica; el overlay sí se prerenderiza (cubre el FOUC) y
 * se mantiene tras hidratar hasta que la experiencia esté lista.
 */
@Component({
  selector: 'app-preloader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preloader.html',
})
export class Preloader {
  protected readonly hidden = signal(false); // dispara el fade-out
  protected readonly gone = signal(false); // remueve el overlay del DOM

  private readonly experienceReady = inject(ExperienceReady);
  private readonly smoothScroll = inject(SmoothScroll);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Tope de seguridad: si el video se cuelga (no si falla — eso lo cubre
   *  onVideoError), revelar igual para no dejar el preloader trabado. */
  private readonly maxWaitMs = 45000;
  private revealed = false;

  constructor() {
    // Revela cuando la experiencia esté lista (effect en contexto de inyección).
    effect(() => {
      if (this.experienceReady.ready()) this.reveal();
    });

    afterNextRender(() => {
      if (!this.isBrowser) return;
      // Bloquear el scroll mientras decidimos (evita FOUC del contenido).
      this.smoothScroll.stop();
      document.documentElement.style.overflow = 'hidden';
      // Tope de seguridad si el showcase se cuelga.
      setTimeout(() => this.experienceReady.markReady(), this.maxWaitMs);
      // Decidir según la ruta YA RESUELTA: el showcase solo vive en la home (`/`).
      // En cualquier otro segmento no hay nada que esperar → revelar enseguida.
      // En `afterNextRender` el router puede no haber resuelto aún (`url === '/'`),
      // por eso esperamos al primer NavigationEnd si hace falta.
      if (this.router.navigated && this.router.url !== '/') {
        this.decide(this.router.url);
      } else {
        const sub = this.router.events
          .pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            take(1),
          )
          .subscribe((e) => this.decide(e.urlAfterRedirects));
        this.destroyRef.onDestroy(() => sub.unsubscribe());
      }
    });
  }

  /** Si la ruta no es la home (sin showcase), revela ya; si es home, espera. */
  private decide(url: string): void {
    if (url !== '/') this.experienceReady.markReady();
  }

  private reveal(): void {
    if (this.revealed) return;
    this.revealed = true;
    if (this.isBrowser) {
      document.documentElement.style.overflow = '';
      this.smoothScroll.start();
    }
    this.hidden.set(true);
    setTimeout(() => this.gone.set(true), 700);
  }
}
