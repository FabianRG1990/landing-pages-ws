import { Injectable, signal } from '@angular/core';

/**
 * Señal de "experiencia lista". El `VideoShowcase` la marca cuando terminó de
 * extraer y cachear los 150 frames (y dibujó el frame 0); el `Preloader` la
 * observa para recién entonces revelar la página. Así el usuario nunca ve la
 * barra de progreso de la extracción: cuando la página aparece, ya cargó por
 * completo.
 */
@Injectable({ providedIn: 'root' })
export class ExperienceReady {
  /** `true` cuando el showcase cinemático está totalmente listo. */
  readonly ready = signal(false);

  markReady(): void {
    this.ready.set(true);
  }
}
