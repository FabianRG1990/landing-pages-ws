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
/** Móvil: estrecho, o un teléfono apaisado (las mismas condiciones que los estilos). */
const MOVIL: { readonly matches: boolean } =
  typeof matchMedia === 'function'
    ? matchMedia('(max-width: 899.98px), (max-height: 520.98px)')
    : { matches: false };

@Injectable({ providedIn: 'root' })
export class SmoothScroll {
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private lenis: Lenis | null = null;
  private tickerFn: ((time: number) => void) | null = null;

  init(): void {
    if (!this.esNavegador || this.lenis) return;

    gsap.registerPlugin(ScrollTrigger);
    this.fijarArranque();
    this.mantenerSeccionAlGirar();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    this.desviarAnclas();
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
    const objetivo = this.destinoDe(destino);
    if (objetivo === null) return;
    const suave = !inmediato && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Teléfono: las secciones empiezan arriba del todo (llevan dentro el
    // hueco de la barra) y el scroll encaja en ellas con CSS. Se va con el
    // scroll nativo: Lenis anima la posición paso a paso y el encaje
    // obligatorio lo devolvería a la sección de partida en cada paso.
    if (MOVIL.matches) {
      const top = typeof objetivo === 'number' ? objetivo : objetivo.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: suave ? 'smooth' : 'instant' });
      return;
    }
    if (this.lenis) {
      this.lenis.scrollTo(objetivo, { duration: 1.4, immediate: inmediato });
      return;
    }
    const y =
      typeof objetivo === 'number' ? objetivo : objetivo.getBoundingClientRect().top + window.scrollY - navH;
    window.scrollTo({ top: y, behavior: suave ? 'smooth' : 'instant' });
  }

  /**
   * Al girar el teléfono la página cambia de alto (de unas ocho pantallas
   * a otras ocho de otra medida) pero el navegador conserva la posición
   * en píxeles: se aparecía a más de mil píxeles de la sección que se
   * estaba viendo. Aquí se anota en cada scroll qué sección ocupa el
   * centro de la pantalla y, cuando cambia el ancho, se vuelve a ella.
   *
   * Solo cuenta el cambio de ancho: la barra del navegador, al
   * esconderse, cambia el alto a mitad de gesto y eso no es un giro. Y
   * durante el giro no se anota nada: el propio reajuste dispara scrolls
   * que apuntarían a la sección equivocada.
   */
  private mantenerSeccionAlGirar(): void {
    const secciones = () => Array.from(document.querySelectorAll<HTMLElement>('main section, .pie'));
    let actual: HTMLElement | null = null;
    let ancho = window.innerWidth;
    let girando = false;
    let pendiente = 0;
    let espera: ReturnType<typeof setTimeout> | undefined;

    const anotar = () => {
      pendiente = 0;
      if (girando) return;
      const medio = window.innerHeight / 2;
      actual =
        secciones().find((s) => {
          const r = s.getBoundingClientRect();
          return r.top <= medio && r.bottom > medio;
        }) ?? actual;
    };
    window.addEventListener('scroll', () => (pendiente ||= requestAnimationFrame(anotar)), { passive: true });

    window.addEventListener('resize', () => {
      if (window.innerWidth === ancho) return;
      ancho = window.innerWidth;
      const destino = actual;
      if (!destino) return;
      girando = true;
      clearTimeout(espera);
      // Tras el refresh de ScrollTrigger (200 ms), con las medidas nuevas
      espera = setTimeout(() => {
        if (MOVIL.matches) {
          window.scrollTo({ top: destino.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
        }
        girando = false;
      }, 380);
    });
  }

  /**
   * A dónde ir de verdad. Lo que vive dentro de un tramo fijado con
   * ScrollTrigger (su `.pin-spacer`) se mide, pasado el pin, en su
   * posición del FINAL del recorrido: ir a las líneas desde abajo
   * aterrizaba con el carril ya en 06. Por defecto se va al espaciador,
   * que empieza donde empieza el pin. Si el destino está marcado con
   * `data-ancla-fin` (el contacto tras las puertas del cierre), se va al
   * final del pin: ahí es donde esa sección está a la vista.
   */
  private destinoDe(destino: string): HTMLElement | number | null {
    const el = document.querySelector<HTMLElement>(destino);
    if (!el) return null;
    const espaciador = el.closest<HTMLElement>('.pin-spacer');
    if (!espaciador) return el;
    const fijado = espaciador.firstElementChild as HTMLElement | null;
    if (el.closest('[data-ancla-fin]') && fijado) {
      const inicio = espaciador.getBoundingClientRect().top + window.scrollY;
      return inicio + espaciador.offsetHeight - fijado.offsetHeight;
    }
    return espaciador;
  }

  /**
   * Los enlaces con ancla que no pasan por scrollTo (los del pie) saltan
   * con el navegador, que no sabe de pins. Se desvían aquí solo los que
   * apuntan dentro de un tramo fijado; el resto (p. ej. «Ir al
   * contenido», que además mueve el foco) sigue siendo nativo.
   */
  private desviarAnclas(): void {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const enlace = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = enlace?.getAttribute('href');
      if (!hash || hash === '#') return;
      if (!document.querySelector(hash)?.closest('.pin-spacer')) return;
      e.preventDefault();
      this.scrollTo(hash);
    });
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
