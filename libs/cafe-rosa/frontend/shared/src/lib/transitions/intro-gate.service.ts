import { Injectable, signal } from '@angular/core';

/**
 * Coordina CUÁNDO debe reproducirse la intro escalonada del hero, para que se
 * vea siempre (y fluida) en vez de dispararse oculta bajo otra capa:
 *
 *  - En la carga inicial, el `Preloader` llama `open()` justo al desvanecerse.
 *  - Al re-entrar a `inicio` desde otra sección, `PageTransition` llama `open()`
 *    al abrir la cortina, así la intro entra al revelarse.
 *
 * Es un contador monótono: cada intro escucha solo el incremento posterior a su
 * propio montaje, no el valor acumulado.
 */
@Injectable({ providedIn: 'root' })
export class IntroGate {
  private readonly _tick = signal(0);
  readonly tick = this._tick.asReadonly();

  /** La capa que cubría se está levantando: las intros pueden entrar. */
  open(): void {
    this._tick.update((n) => n + 1);
  }
}
