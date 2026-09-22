import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore } from '../core/bolleria.store';
import { ScreenId } from '../core/models';

/**
 * Tono de la barra según lo que tiene debajo. Lo declara cada sección con
 * `data-nav-tono`; los colores de cada uno viven en site-nav.component.scss.
 */
export type NavTono = 'foto' | 'papel' | 'oscuro';
const TONOS: readonly string[] = ['foto', 'papel', 'oscuro'];

/** Navbar + menú móvil — transcripción fiel del original. */
@Component({
  selector: 'bol-site-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-nav.component.html',
  styleUrl: './site-nav.component.scss',
})
export class SiteNavComponent {
  private readonly store = inject(BolleriaStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly screen = this.store.screen;
  readonly mobileOpen = this.store.mobileOpen;
  readonly scrolled = signal(false);
  /**
   * Sin JavaScript (SSR) se queda en `foto`, que es el hero: la barra arranca
   * escondida, que es como tiene que verse la portada al entrar.
   */
  readonly tono = signal<NavTono>('foto');

  /**
   * Sobre el HERO la barra no se pinta: la portada va limpia y la barra APARECE
   * con el segmento siguiente.
   *
   * Cuelga del mismo tono que ya decide el color, y no de un observador aparte,
   * para que la aparicion caiga exactamente en el mismo instante que el cambio
   * de color y con el mismo fundido: un solo mecanismo, imposible de
   * desincronizar. `foto` lo lleva solo el hero (ver `data-nav-tono`).
   *
   * En los huecos entre secciones el tono conserva el ultimo, asi que entre el
   * hero y el libro la barra sigue escondida hasta que el libro llega de
   * verdad, que es lo que se pide.
   */
  readonly oculta = computed(() => this.tono() === 'foto');

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => {
        const onScroll = () => this.scrolled.set(window.scrollY > 30);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        this.vigilarTono();
      });
    }
  }

  go(screen: ScreenId): void {
    this.store.go(screen);
  }

  toggleMobile(): void {
    this.store.toggleMobileMenu();
  }

  closeMobile(): void {
    this.store.closeMobileMenu();
  }

  /**
   * Qué sección pasa por debajo de la barra, sin leer píxeles ni hacer nada
   * por fotograma: un `IntersectionObserver` cuya zona es una franja de 1 px a
   * la altura del centro de la barra. Leer el color del fondo cambiaría la
   * píldora sobre el hero, que es claro y donde la tostada es la buena, y
   * costaría en cada fotograma lo que Safari no tiene de sobra en esta página.
   *
   * Entre dos secciones hay huecos de papel (el margen del pie, por ejemplo):
   * ahí no hay nadie debajo y la barra conserva el último tono.
   *
   * La franja se recalcula al cambiar el alto de la ventana, y las secciones se
   * vuelven a buscar cuando cambian: la cortina sustituye la pantalla entera y
   * los elementos observados dejan de existir.
   */
  private vigilarTono(): void {
    const cabecera = this.host.nativeElement.querySelector<HTMLElement>('.bol-nav');
    if (!cabecera || typeof IntersectionObserver === 'undefined') return;

    let observador: IntersectionObserver | null = null;
    let vigiladas: Element[] = [];
    const debajo = new Set<Element>();

    const decidir = () => {
      // En orden de documento: si dos coincidieran en la franja, manda la de
      // más abajo, que es la que se pinta encima.
      let elegida: Element | null = null;
      for (const el of vigiladas) if (debajo.has(el)) elegida = el;
      const tono = elegida?.getAttribute('data-nav-tono');
      if (tono && TONOS.includes(tono)) this.tono.set(tono as NavTono);
    };

    const montar = () => {
      observador?.disconnect();
      debajo.clear();
      const caja = cabecera.getBoundingClientRect();
      const linea = Math.round(caja.top + caja.height / 2);
      const abajo = Math.max(0, window.innerHeight - linea - 1);
      observador = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (e.isIntersecting) debajo.add(e.target);
            else debajo.delete(e.target);
          }
          decidir();
        },
        { rootMargin: `-${linea}px 0px -${abajo}px 0px` },
      );
      vigiladas = Array.from(document.querySelectorAll('[data-nav-tono]'));
      for (const el of vigiladas) observador.observe(el);
    };

    let pendiente = 0;
    const programar = (forzar: boolean) => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        const ahora = document.querySelectorAll('[data-nav-tono]');
        const iguales = !forzar && ahora.length === vigiladas.length && vigiladas.every((el, i) => el === ahora[i]);
        if (!iguales) montar();
      });
    };

    montar();
    const alRedimensionar = () => programar(true);
    window.addEventListener('resize', alRedimensionar, { passive: true });
    const mutaciones = new MutationObserver(() => programar(false));
    mutaciones.observe(document.body, { childList: true, subtree: true });

    this.destroyRef.onDestroy(() => {
      observador?.disconnect();
      mutaciones.disconnect();
      window.removeEventListener('resize', alRedimensionar);
      cancelAnimationFrame(pendiente);
    });
  }
}
