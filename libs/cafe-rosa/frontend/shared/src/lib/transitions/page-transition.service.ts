import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { IntroGate } from './intro-gate.service';

/**
 * Orquesta la cortina cinematográfica entre secciones, sincronizada con el
 * router. Es una cortina de dos hojas: una baja desde arriba y otra sube desde
 * abajo hasta encontrarse en el centro (cubre), sostiene la marca, y luego se
 * separan revelando la nueva sección (que ya se montó oculta detrás).
 *
 * Todo está secuenciado por timeouts: nunca queda trabada. Respeta
 * prefers-reduced-motion.
 */
@Injectable({ providedIn: 'root' })
export class PageTransition {
  private top: HTMLElement | null = null;
  private bottom: HTMLElement | null = null;
  private mark: HTMLElement | null = null;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly introGate = inject(IntroGate);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private reduce = false;

  /** La primera navegación (carga inicial) la cubre el preloader, no la cortina. */
  private booted = false;
  private active = false;
  private coverStart = 0;

  private readonly sweepMs = 480;
  private readonly holdMs = 180;
  private readonly easeClose = 'cubic-bezier(0.76, 0, 0.24, 1)';
  private readonly easeOpen = 'cubic-bezier(0.32, 0.72, 0, 1)';

  constructor() {
    if (!this.isBrowser) return;
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        if (this.booted && !this.reduce) this.startCover();
      } else if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        this.booted = true;
        this.uncover();
      }
    });
  }

  register(top: HTMLElement, bottom: HTMLElement, mark: HTMLElement): void {
    this.top = top;
    this.bottom = bottom;
    this.mark = mark;
  }

  unregister(): void {
    this.top = null;
    this.bottom = null;
    this.mark = null;
  }

  /** Resuelve cuando la cortina cubre por completo (o de inmediato si no hay transición). */
  coverComplete(): Promise<void> {
    if (!this.active) return Promise.resolve();
    const elapsed = this.now() - this.coverStart;
    const remaining = Math.max(0, this.sweepMs + this.holdMs - elapsed);
    return new Promise((resolve) => setTimeout(resolve, remaining));
  }

  private startCover(): void {
    if (!this.top || !this.bottom || !this.mark) return;
    this.active = true;
    this.coverStart = this.now();
    const { top, bottom, mark } = this;

    top.style.transition = 'none';
    bottom.style.transition = 'none';
    top.style.transform = 'translateY(-101%)';
    bottom.style.transform = 'translateY(101%)';
    void top.offsetWidth;

    const t = `transform ${this.sweepMs}ms ${this.easeClose}`;
    top.style.transition = t;
    bottom.style.transition = t;
    top.style.transform = 'translateY(0)';
    bottom.style.transform = 'translateY(0)';

    mark.style.transitionDelay = '120ms';
    mark.style.opacity = '1';
    mark.style.transform = 'translateY(0)';
    mark.style.filter = 'blur(0)';
  }

  private uncover(): void {
    if (!this.active || !this.top || !this.bottom || !this.mark) return;
    this.active = false;
    const { top, bottom, mark } = this;

    window.scrollTo(0, 0);
    this.introGate.open();

    mark.style.transitionDelay = '0ms';
    mark.style.opacity = '0';
    mark.style.transform = 'translateY(-8px)';
    mark.style.filter = 'blur(6px)';

    const t = `transform ${this.sweepMs}ms ${this.easeOpen}`;
    top.style.transition = t;
    bottom.style.transition = t;
    top.style.transform = 'translateY(-101%)';
    bottom.style.transform = 'translateY(101%)';

    setTimeout(() => {
      if (this.active || !this.top || !this.bottom) return;
      this.top.style.transition = 'none';
      this.bottom.style.transition = 'none';
      this.top.style.transform = 'translateY(-101%)';
      this.bottom.style.transform = 'translateY(101%)';
    }, this.sweepMs + 40);
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : 0;
  }
}
