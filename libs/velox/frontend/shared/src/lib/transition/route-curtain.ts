import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { gsap } from 'gsap';
import { SmoothScroll } from '../smooth-scroll/smooth-scroll.service';

/**
 * Transición cinematográfica entre segmentos (rutas): un telón vertical que
 * CUBRE al iniciar la navegación y REVELA al llegar, con la marca VELOX.
 *
 *  NavigationStart → el telón sube desde abajo y cubre la pantalla.
 *  NavigationEnd   → se hace scroll al tope (oculto bajo el telón) y el telón
 *                    sale por arriba, revelando el nuevo segmento.
 *
 * Robusto contra el timing: la cobertura SIEMPRE termina antes de revelar
 * (si la navegación es más rápida que la animación, el reveal espera). La
 * primera navegación (carga inicial) la maneja el preloader, así que se omite.
 */
@Component({
  selector: 'app-route-curtain',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="route-curtain" #panel aria-hidden="true">
    <span class="route-curtain-mark gold-text">VELOX</span>
  </div>`,
})
export class RouteCurtain {
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly router = inject(Router);
  private readonly smoothScroll = inject(SmoothScroll);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private covered = false;
  private pendingReveal = false;
  private firstNav = true; // la carga inicial la cubre el preloader

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const sub = this.router.events.subscribe((e) => {
        if (e instanceof NavigationStart) {
          if (this.firstNav) return;
          this.cover();
        } else if (
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError
        ) {
          if (this.firstNav) {
            this.firstNav = false;
            return;
          }
          this.reveal();
        }
      });
      this.destroyRef.onDestroy(() => sub.unsubscribe());
    });
  }

  /** Cubre desde abajo. La cobertura marca `covered` al terminar. */
  private cover(): void {
    const el = this.panel().nativeElement;
    this.covered = false;
    this.pendingReveal = false;
    gsap.killTweensOf(el);
    gsap.set(el, { yPercent: 100 });
    gsap.to(el, {
      yPercent: 0,
      duration: 0.5,
      ease: 'power3.inOut',
      onComplete: () => {
        this.covered = true;
        if (this.pendingReveal) this.doReveal();
      },
    });
  }

  /** Pide revelar; si aún no terminó de cubrir, espera a que termine. */
  private reveal(): void {
    this.smoothScroll.toTop(); // reposiciona arriba mientras está oculto
    if (this.covered) this.doReveal();
    else this.pendingReveal = true;
  }

  /** Sale por arriba revelando el nuevo segmento, y se rearma abajo. */
  private doReveal(): void {
    const el = this.panel().nativeElement;
    gsap.to(el, {
      yPercent: -100,
      duration: 0.62,
      ease: 'power3.inOut',
      delay: 0.06,
      onComplete: () => gsap.set(el, { yPercent: 100 }),
    });
  }
}
