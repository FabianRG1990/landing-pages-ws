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

/** Preloader de marca (carga inicial) — wordmark serif sobre espresso. */
@Component({
  selector: 'app-preloader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #pl id="preloader">
      <div class="pl-stage">
        <img
          class="pl-logo"
          src="/logo.webp"
          width="560"
          height="587"
          alt="Café Rosa · Coffee & Pastelería"
        />
        <span class="pl-line"><span class="pl-line-fill"></span></span>
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
          this.introGate.open();
          setTimeout(() => (el.style.display = 'none'), 900);
        }, wait);
      };
      if (document.readyState === 'complete') hide();
      else {
        window.addEventListener('load', hide, { once: true });
        setTimeout(hide, 6000);
      }
    });
  }
}
