import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
      // Bloquear el scroll mientras carga: que el usuario no entre a un
      // showcase a medio armar.
      this.smoothScroll.stop();
      document.documentElement.style.overflow = 'hidden';
      // Tope de seguridad si el video nunca termina de cargar.
      setTimeout(() => this.experienceReady.markReady(), this.maxWaitMs);
    });
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
