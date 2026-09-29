import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/**
 * Scroll suave (Lenis) acoplado al ticker de GSAP: un único bucle rAF
 * para el scroll y para todas las animaciones ligadas a él.
 *
 * Reglas heredadas de ADN y de VELOX:
 *   · `lenis.on('scroll', ScrollTrigger.update)` mantiene los disparadores
 *     en sincronía con el scroll virtual.
 *   · Lenis vive dentro de `gsap.ticker`: dos relojes dan micro-tirones.
 *   · `lagSmoothing(0)`: sin saltos de recuperación tras un fotograma lento.
 *   · Lenis es dueño de TODA la deceleración; los `scrub` de la página van
 *     en `true`, nunca en número, para no apilar un segundo suavizado.
 *
 * Con `prefers-reduced-motion` no se arranca Lenis: el scroll es el nativo.
 * En SSR no se inicializa nada.
 */
@Injectable({ providedIn: 'root' })
export class SmoothScroll {
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private lenis: Lenis | null = null;
  private tickerFn: ((time: number) => void) | null = null;

  init(): void {
    if (!this.esNavegador || this.lenis) return;

    gsap.registerPlugin(ScrollTrigger);
    this.fijarArranque();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    this.lenis.on('scroll', ScrollTrigger.update);
    this.tickerFn = (time: number) => this.lenis?.raf(time * 1000);
    gsap.ticker.add(this.tickerFn);
    gsap.ticker.lagSmoothing(0);
  }

  /**
   * La página empieza donde empieza. Con `scrollRestoration` en `auto` el
   * navegador devuelve al usuario a media página al recargar, y las
   * secciones con animación de entrada quedan en un estado que nadie
   * eligió. Con fragmento en la URL sí hay intención y no se fuerza.
   */
  private fijarArranque(): void {
    if (!('scrollRestoration' in history)) return;
    history.scrollRestoration = 'manual';
    if (!location.hash) window.scrollTo(0, 0);
  }

  /**
   * Scroll a una sección (selector CSS), descontando la barra fija.
   * Lenis (1.3) ya resta el `scroll-margin-top` del destino, que en
   * `section[id]` es la altura de la barra: restarla otra vez dejaba la
   * sección 144 px por debajo del borde en lugar de 72.
   * `inmediato`: sin animación (al entrar por un enlace con ancla).
   */
  scrollTo(destino: string, inmediato = false): void {
    if (!this.esNavegador) return;
    const navH = this.alturaNav();
    const el = this.inicioDe(destino);
    if (!el) return;
    if (this.lenis) {
      this.lenis.scrollTo(el, { duration: 1.4, immediate: inmediato });
      return;
    }
    const y = el.getBoundingClientRect().top + window.scrollY - navH;
    const suave = !inmediato && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: y, behavior: suave ? 'smooth' : 'instant' });
  }

  /**
   * Una sección fijada con ScrollTrigger vive dentro de su `.pin-spacer`
   * y, pasado el pin, se mide en su posición del FINAL del recorrido: ir
   * a ella desde abajo aterrizaba con las líneas ya en 06. Se apunta al
   * espaciador, que empieza donde empieza el pin.
   */
  private inicioDe(destino: string): HTMLElement | null {
    const el = document.querySelector<HTMLElement>(destino);
    const padre = el?.parentElement;
    return padre?.classList.contains('pin-spacer') ? padre : el;
  }

  /** Congela el scroll (menú móvil abierto). */
  stop(): void {
    this.lenis?.stop();
  }

  start(): void {
    this.lenis?.start();
  }

  /** La altura real de la barra, leída del token y no copiada a mano. */
  private alturaNav(): number {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--nav-h');
    return parseFloat(v) || 72;
  }
}
