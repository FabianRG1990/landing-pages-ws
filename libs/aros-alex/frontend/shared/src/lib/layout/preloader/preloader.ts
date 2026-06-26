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

/** Preloader de marca con anillo rojo giratorio (carga inicial). */
@Component({
  selector: 'app-preloader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #pl id="preloader">
      <div class="pl-stage">
        <div class="pl-ring"></div>
        <img class="pl-logo" src="assets/aros-alex/logo.png" alt="Aros Alex" />
      </div>
      <div class="pl-word"><span>AROS</span><span class="pl-accent">&nbsp;ALEX</span></div>
      <div class="pl-sub">Luxury Rims</div>
    </div>
  `,
})
export class Preloader {
  private readonly pl = viewChild.required<ElementRef<HTMLElement>>('pl');
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const hide = () => {
        const minMs = reduce ? 200 : 1100;
        const wait = Math.max(0, minMs - performance.now());
        setTimeout(() => {
          const el = this.pl().nativeElement;
          el.classList.add('is-done');
          setTimeout(() => (el.style.display = 'none'), 800);
        }, wait);
      };
      if (document.readyState === 'complete') hide();
      else {
        window.addEventListener('load', hide, { once: true });
        // Salvaguarda: nunca dejar el loader trabado si 'load' se demora.
        setTimeout(hide, 6000);
      }
    });
  }
}
