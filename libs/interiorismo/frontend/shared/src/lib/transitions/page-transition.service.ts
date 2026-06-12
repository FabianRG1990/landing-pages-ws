import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';

/**
 * Orquesta la cortina (veil) de transición entre secciones, sincronizada
 * con el router:
 *
 *   click → NavigationStart → la cortina sube (cubre la sección actual y
 *   también la carga del chunk lazy) → el guard `pageTransitionGuard` espera
 *   a que la cortina cubra del todo (`coverComplete`) antes de activar la
 *   ruta → la nueva sección se monta OCULTA detrás de la cortina →
 *   NavigationEnd → la cortina baja y revela la nueva sección.
 *
 * Así el cambio de contenido nunca se ve antes que la animación.
 */
@Injectable({ providedIn: 'root' })
export class PageTransition {
  private veil: HTMLElement | null = null;
  private mark: HTMLElement | null = null;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private reduce = false;

  /** La primera navegación (carga inicial) la cubre el preloader, no la cortina. */
  private booted = false;
  private active = false;
  private coverStart = 0;
  private readonly sweepMs = 340;
  private readonly holdMs = 130;

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

  register(veil: HTMLElement, mark: HTMLElement): void {
    this.veil = veil;
    this.mark = mark;
  }

  unregister(): void {
    this.veil = null;
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
    if (!this.veil || !this.mark) return;
    this.active = true;
    this.coverStart = this.now();
    const v = this.veil;
    const m = this.mark;
    v.style.transition = 'none';
    v.style.transformOrigin = 'bottom';
    v.style.transform = 'scaleY(0)';
    void v.offsetWidth;
    v.style.transition = `transform ${this.sweepMs}ms cubic-bezier(.7,.02,.2,1)`;
    v.style.transform = 'scaleY(1)';
    m.style.opacity = '1';
    m.style.transform = 'translateY(0)';
  }

  private uncover(): void {
    if (!this.active || !this.veil || !this.mark) return;
    this.active = false;
    const v = this.veil;
    const m = this.mark;
    window.scrollTo(0, 0);
    v.style.transition = 'none';
    v.style.transformOrigin = 'top';
    void v.offsetWidth;
    v.style.transition = `transform ${this.sweepMs}ms cubic-bezier(.7,.02,.2,1)`;
    v.style.transform = 'scaleY(0)';
    m.style.opacity = '0';
    m.style.transform = 'translateY(12px)';
    setTimeout(() => {
      // Si ya arrancó otra cobertura, no pisar su estado.
      if (this.active || !this.veil) return;
      this.veil.style.transition = 'none';
      this.veil.style.transform = 'scaleY(0)';
    }, this.sweepMs + 40);
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : 0;
  }
}
