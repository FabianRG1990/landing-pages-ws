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

/** Preloader de marca con anillo turquesa giratorio (carga inicial). */
@Component({
  selector: 'app-preloader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #pl id="preloader">
      <div class="pl-stage">
        <div class="pl-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle class="pl-track" cx="50" cy="50" r="46"></circle>
            <circle class="pl-arc" cx="50" cy="50" r="46"></circle>
          </svg>
        </div>
        <img class="pl-logo" src="assets/logo-mark.png" alt="Cargando · Sanar desde el corazón" />
      </div>
      <div class="pl-word">Sanar desde el corazón</div>
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
          const el = this.pl().nativeElement;
          el.classList.add('is-done');
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
