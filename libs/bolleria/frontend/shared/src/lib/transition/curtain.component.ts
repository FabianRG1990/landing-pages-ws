import { ChangeDetectionStrategy, Component, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore } from '../core/bolleria.store';

export type CurtainStage = 'idle' | 'in' | 'open' | 'out';

/**
 * Cortina entre pantallas: un hornito se abre, el logo sale "recién
 * horneado" y la escena se desvanece — ahí aparece el siguiente segmento.
 * Puramente CSS (transiciones por clase de `stage`), sin canvas ni
 * simulación: la elección winning después de que el enfoque de partículas
 * ("harina cayendo") se descartó por no llegar a verse premium.
 */
@Component({
  selector: 'bol-curtain',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curtain.component.html',
  styleUrl: './curtain.component.scss',
})
export class CurtainComponent {
  private readonly store = inject(BolleriaStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly reduced = this.isBrowser && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  readonly stage = signal<CurtainStage>('idle');
  readonly reducedFade = signal(false);
  private playing = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    if (!this.isBrowser) return;
    effect(() => {
      if (this.store.curtain() && !this.playing) {
        this.playing = true;
        this.play();
      }
    });
  }

  private schedule(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private play(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];

    if (this.reduced) {
      // Nada de horno/puerta en movimiento: solo un cruce de opacidad breve,
      // mismo criterio que el preloader para `prefers-reduced-motion`.
      this.reducedFade.set(true);
      this.schedule(() => {
        this.reducedFade.set(false);
        this.playing = false;
      }, 260);
      return;
    }

    // 900ms de "in" (iris + entrada del horno, que se asientan ~750ms): ese
    // margen es el respiro/anticipación antes de que la puerta empiece a
    // girar, en vez de que todo se mueva a la vez.
    this.stage.set('in');
    this.schedule(() => this.stage.set('open'), 900);
    this.schedule(() => this.stage.set('out'), 1750);
    this.schedule(() => {
      this.stage.set('idle');
      this.playing = false;
    }, 2400);
  }
}
