import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IntroGate } from '../../transitions/intro-gate.service';

/** Preloader de marca (carga inicial) — wordmark serif sobre crema. */
@Component({
  selector: 'app-preloader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #pl id="preloader">
      <div class="pl-stage">
        <span class="pl-brand">Atelier Solano</span>
        <span class="pl-line"><span class="pl-line-fill"></span></span>
        <span class="pl-word">Estudio de Interiorismo</span>
      </div>
    </div>
  `,
})
export class Preloader {
  private readonly pl = viewChild.required<ElementRef<HTMLElement>>('pl');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly introGate = inject(IntroGate);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const hide = () => {
        const minMs = 900;
        const wait = Math.max(0, minMs - performance.now());
        setTimeout(() => {
          const el = this.pl().nativeElement;
          el.classList.add('is-done');
          // El loader empieza a disolverse → que entre la intro del hero.
          this.introGate.open();
          setTimeout(() => (el.style.display = 'none'), 900);
        }, wait);
      };
      if (document.readyState === 'complete') hide();
      else {
        window.addEventListener('load', hide, { once: true });
        // Salvaguarda: nunca dejar el loader trabado si 'load' se demora
        setTimeout(hide, 6000);
      }
    });
  }
}
