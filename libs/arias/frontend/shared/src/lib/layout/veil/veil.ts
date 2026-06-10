import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
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

/**
 * Cortina de transición entre secciones (la "veil" del sitio original).
 * Se cierra al iniciar la navegación y se abre una vez cargada la nueva
 * sección, garantizando un tiempo mínimo de cobertura para que el cambio
 * de contenido ocurra oculto. Respeta prefers-reduced-motion y nunca queda
 * trabada (todo está secuenciado por timeouts, no por transitionend).
 */
@Component({
  selector: 'app-veil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #veil class="veil" aria-hidden="true">
      <div #mark class="veil-mark"><img src="assets/logo-mark-white.png" alt="" /></div>
    </div>
  `,
})
export class Veil {
  private readonly veil = viewChild.required<ElementRef<HTMLElement>>('veil');
  private readonly mark = viewChild.required<ElementRef<HTMLElement>>('mark');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private firstDone = false;
  private coverStart = 0;
  /** Duración de cada barrido de la cortina (cierre y apertura). */
  private readonly sweepMs = 340;
  /**
   * Cobertura mínima antes de abrir: la cortina debe cerrar del todo
   * (sweepMs) y sostener un instante, aunque la navegación resuelva al
   * instante (chunks ya cargados). Sin esto el cierre y la apertura se
   * solapan y la transición casi no se aprecia.
   */
  private readonly minCover = this.sweepMs + 110;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sub = this.router.events.subscribe((e) => {
      if (reduce) return;
      if (e instanceof NavigationStart) {
        if (!this.firstDone) return; // la carga inicial la cubre el preloader
        this.cover();
      } else if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        if (!this.firstDone) {
          this.firstDone = true;
          return;
        }
        const elapsed = this.now() - this.coverStart;
        this.after(Math.max(0, this.minCover - elapsed), () => this.uncover());
      }
    });

    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this.timers.forEach(clearTimeout);
    });
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : 0;
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private cover(): void {
    const veil = this.veil().nativeElement;
    const mark = this.mark().nativeElement;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.coverStart = this.now();
    veil.style.transition = 'none';
    veil.style.transformOrigin = 'bottom';
    veil.style.transform = 'scaleY(0)';
    void veil.offsetWidth;
    veil.style.transition = `transform ${this.sweepMs}ms cubic-bezier(.7,.02,.2,1)`;
    veil.style.transform = 'scaleY(1)';
    mark.style.opacity = '1';
    mark.style.transform = 'scale(1)';
  }

  private uncover(): void {
    const veil = this.veil().nativeElement;
    const mark = this.mark().nativeElement;
    window.scrollTo(0, 0);
    veil.style.transition = 'none';
    veil.style.transformOrigin = 'top';
    void veil.offsetWidth;
    veil.style.transition = `transform ${this.sweepMs}ms cubic-bezier(.7,.02,.2,1)`;
    veil.style.transform = 'scaleY(0)';
    mark.style.opacity = '0';
    mark.style.transform = 'scale(.82)';
    this.after(this.sweepMs + 40, () => {
      veil.style.transition = 'none';
      veil.style.transform = 'scaleY(0)';
    });
  }
}
