import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { I18n } from '../i18n/i18n.service';
import { NAV_ITEMS } from '../data/site';

/**
 * Orquesta el telón cinematográfico (curtain) entre secciones, sincronizado con
 * el router. Reemplaza la función `navigate()` del sitio original:
 *
 *   click → NavigationStart → el telón sube (clase `is-cover`) y muestra el
 *   emblema + el nombre de la sección → el guard `pageTransitionGuard` espera a
 *   `coverComplete()` antes de activar la ruta → la nueva sección se monta
 *   OCULTA detrás del telón → NavigationEnd → el telón baja (`is-reveal`) y
 *   revela la nueva sección.
 *
 * En la carga inicial (la cubre el preloader) y con prefers-reduced-motion las
 * transiciones se omiten.
 */
@Injectable({ providedIn: 'root' })
export class PageTransition {
  private curtain: HTMLElement | null = null;
  private labelEl: HTMLElement | null = null;
  private subEl: HTMLElement | null = null;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private reduce = false;

  private booted = false;
  private active = false;
  private coverStart = 0;
  private readonly coverMs = 760; // tiempo que tarda en cubrir antes de cambiar
  private readonly revealMs = 880; // tiempo de revelado antes de limpiarse

  constructor() {
    if (!this.isBrowser) return;
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        if (this.booted && !this.reduce) this.startCover(e.url);
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

  register(curtain: HTMLElement, label: HTMLElement, sub: HTMLElement): void {
    this.curtain = curtain;
    this.labelEl = label;
    this.subEl = sub;
  }

  unregister(): void {
    this.curtain = null;
    this.labelEl = null;
    this.subEl = null;
  }

  /** Resuelve cuando el telón cubre por completo (o de inmediato si no hay transición). */
  coverComplete(): Promise<void> {
    if (!this.active) return Promise.resolve();
    const elapsed = this.now() - this.coverStart;
    const remaining = Math.max(0, this.coverMs - elapsed);
    return new Promise((resolve) => setTimeout(resolve, remaining));
  }

  private startCover(url: string): void {
    if (!this.curtain) return;
    this.active = true;
    this.coverStart = this.now();

    const path = url.split('?')[0].replace(/^\//, '').split('/')[0] || 'inicio';
    const item = NAV_ITEMS.find((n) => n.id === path);
    const t = this.i18n.t();
    if (item && this.labelEl && this.subEl) {
      this.labelEl.textContent = t.nav[item.key];
      this.subEl.textContent = t.sub[item.key];
    }

    const c = this.curtain;
    c.classList.remove('is-reveal');
    void c.offsetWidth; // reflow para reiniciar la animación de cobertura
    c.classList.add('is-cover');
  }

  private uncover(): void {
    if (!this.active || !this.curtain) return;
    this.active = false;
    const c = this.curtain;
    c.classList.remove('is-cover');
    c.classList.add('is-reveal');
    setTimeout(() => {
      if (this.active || !this.curtain) return; // otra transición ya arrancó
      this.curtain.classList.remove('is-reveal');
    }, this.revealMs);
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : 0;
  }
}
