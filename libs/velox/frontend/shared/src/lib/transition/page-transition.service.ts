import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { SmoothScroll } from '../smooth-scroll/smooth-scroll.service';

/**
 * Transición cinematográfica SINCRONIZADA entre segmentos (obturador/letterbox).
 *
 * Secuencia (sin solapes ni flashes):
 *   1. CUBRIR  — dos paneles (arriba/abajo) cierran hasta juntarse en una
 *      costura dorada al centro. Hasta aquí NO se navega.
 *   2. CAMBIAR — con la pantalla ya tapada, se navega y se salta al tope.
 *   3. REVELAR — los paneles se abren mostrando el nuevo segmento ya montado.
 *
 * Clave del bug anterior: antes se navegaba y se cubría EN PARALELO, así el
 * contenido cambiaba antes de que el telón terminara de tapar. Aquí cada fase
 * espera a la anterior (`await`), por eso queda perfectamente sincronizado.
 */
@Injectable({ providedIn: 'root' })
export class PageTransition {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly router = inject(Router);
  private readonly smooth = inject(SmoothScroll);

  private top: HTMLElement | null = null;
  private bottom: HTMLElement | null = null;
  private seam: HTMLElement | null = null;
  private busy = false;

  /** El componente del telón registra sus elementos al renderizar. */
  register(top: HTMLElement, bottom: HTMLElement, seam: HTMLElement): void {
    this.top = top;
    this.bottom = bottom;
    this.seam = seam;
    this.arm();
  }

  /** Deja los paneles fuera de pantalla, listos para la próxima transición.
   *  `y: 0` es CLAVE: el CSS arranca con `translateY(±100%)` (SSR-safe), pero
   *  GSAP lo parsea como `y` en px y lo SUMARÍA al `yPercent` → desplazamiento
   *  doble (los paneles quedaban fuera al "cubrir"). Fijando `y: 0` el
   *  posicionamiento queda 100% en manos de `yPercent`. */
  private arm(): void {
    if (!this.top || !this.bottom || !this.seam) return;
    gsap.set(this.top, { y: 0, yPercent: -100 });
    gsap.set(this.bottom, { y: 0, yPercent: 100 });
    gsap.set(this.seam, { scaleX: 0, opacity: 0 });
  }

  /** Navega a `path` con la transición de obturador. */
  async go(path: string): Promise<void> {
    if (!this.isBrowser || !this.top) {
      await this.router.navigateByUrl(path);
      return;
    }
    const current = this.router.url;
    if (this.busy || path === current) return;

    // Respeta reduced-motion: navega sin animación.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.smooth.toTop();
      await this.router.navigateByUrl(path);
      return;
    }

    this.busy = true;
    await this.cover(); // 1. tapar del todo
    this.smooth.toTop();
    await this.router.navigateByUrl(path); // 2. cambiar (oculto)
    await this.twoFrames(); // dejar pintar el nuevo segmento
    await this.reveal(); // 3. revelar
    this.busy = false;
  }

  private cover(): Promise<void> {
    return new Promise((resolve) => {
      // Los paneles cierran (visibles todo el recorrido); la costura dorada
      // SOLO destella al final, cuando se juntan → es el "corte" cinematográfico.
      gsap
        .timeline({ onComplete: () => resolve() })
        .set([this.top, this.bottom, this.seam], { visibility: 'visible' })
        .to(this.top, { yPercent: 0, duration: 0.55, ease: 'power2.inOut' }, 0)
        .to(this.bottom, { yPercent: 0, duration: 0.55, ease: 'power2.inOut' }, 0)
        .fromTo(
          this.seam,
          { scaleX: 0.4, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.32, ease: 'power2.out' },
          0.34,
        );
    });
  }

  private reveal(): Promise<void> {
    return new Promise((resolve) => {
      // La costura se apaga y los paneles se abren revelando el nuevo segmento.
      gsap
        .timeline({
          onComplete: () => {
            this.arm();
            resolve();
          },
        })
        .to(this.seam, { opacity: 0, duration: 0.16, ease: 'power2.in' }, 0)
        .to(this.top, { yPercent: -100, duration: 0.6, ease: 'power2.inOut' }, 0.02)
        .to(
          this.bottom,
          { yPercent: 100, duration: 0.6, ease: 'power2.inOut' },
          0.02,
        );
    });
  }

  private twoFrames(): Promise<void> {
    return new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }
}
