import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/**
 * Smooth scroll de página (Lenis) acoplado al ticker de GSAP, equivalente al
 * `useEffect` de `App` en el index.html original.
 *
 *   click → Lenis decelera → su rAF (dentro del ticker de GSAP) actualiza
 *   ScrollTrigger → el showcase cinemático mapea scroll → frame.
 *
 * Reglas (de cinematic-scroll-engine.md):
 *   • `lenis.on('scroll', ScrollTrigger.update)` mantiene ST sincronizado.
 *   • Lenis se maneja dentro del ticker de GSAP (un único loop rAF).
 *   • `gsap.ticker.lagSmoothing(0)` evita saltos de catch-up.
 *   • Lenis es dueño de TODA la deceleración (el showcase usa `scrub: true`,
 *     nunca `scrub: <número>`, para no apilar un segundo easing).
 *
 * Browser-only: en SSR/prerender no se inicializa nada.
 */
@Injectable({ providedIn: 'root' })
export class SmoothScroll {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private lenis: Lenis | null = null;
  private tickerFn: ((time: number) => void) | null = null;

  init(): void {
    if (!this.isBrowser || this.lenis) return;

    gsap.registerPlugin(ScrollTrigger);

    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Mantener ScrollTrigger en sync con el scroll virtual de Lenis.
    this.lenis.on('scroll', ScrollTrigger.update);

    // Manejar Lenis dentro del ticker de GSAP — un único loop rAF.
    this.tickerFn = (time: number) => this.lenis?.raf(time * 1000);
    gsap.ticker.add(this.tickerFn);
    gsap.ticker.lagSmoothing(0);
  }

  /** Pausa el scroll (lo usa el preloader mientras carga la experiencia). */
  stop(): void {
    this.lenis?.stop();
  }

  /** Reanuda el scroll cuando la experiencia está lista. */
  start(): void {
    this.lenis?.start();
  }

  destroy(): void {
    if (this.tickerFn) {
      gsap.ticker.remove(this.tickerFn);
      this.tickerFn = null;
    }
    this.lenis?.destroy();
    this.lenis = null;
  }
}
