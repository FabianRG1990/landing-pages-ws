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

/** Preloader de marca: emblema con latido y dos anillos giratorios (carga inicial). */
@Component({
  selector: 'app-preloader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #pl class="preloader">
      <div class="preloader__ring">
        <span class="preloader__arc preloader__arc--1"></span>
        <span class="preloader__arc preloader__arc--2"></span>
        <img class="preloader__mark" src="assets/logo-mark.png" alt="Dra. Valeria Vindas" />
      </div>
      <div class="preloader__text">
        <div class="preloader__name">Dra. Valeria Vindas</div>
        <div class="preloader__role">Psicóloga Clínica</div>
      </div>
    </div>
  `,
})
export class Preloader {
  private readonly pl = viewChild.required<ElementRef<HTMLElement>>('pl');
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const hide = () => {
        const minMs = 900;
        const wait = Math.max(0, minMs - performance.now());
        setTimeout(() => {
          this.pl().nativeElement.classList.add('is-hidden');
        }, wait);
      };
      if (document.readyState === 'complete') hide();
      else {
        window.addEventListener('load', hide, { once: true });
        // Salvaguarda: nunca dejar el loader trabado si 'load' se demora
        setTimeout(hide, 4000);
      }
    });
  }
}
