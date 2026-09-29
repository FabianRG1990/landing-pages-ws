import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  contentChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { montarEscena } from '@moofy-ui-shared/motion/escena';
import { ProcesoComponent } from '../proceso/proceso';

/**
 * El cierre de la página: el proceso y el contacto como una sola escena.
 *
 *   <app-cierre>
 *     <app-proceso orquestado />
 *     <app-contacto />
 *   </app-cierre>
 *
 * Escritorio: las dos secciones ocupan la misma celda, el contacto debajo
 * de la franja azul. Un solo pin: el camión recorre la línea, se enciende
 * una rendija de luz entre el titular y la línea, y la franja se abre en
 * dos hojas (las puertas del camión) que descubren «Hablemos» en su sitio.
 * Después el scroll sigue por el contacto.
 *
 * La hoja de abajo es una copia decorativa de la franja (aria-hidden,
 * inert, sin ids), recortada por la rendija; la de arriba es la real.
 *
 * Móvil: sin pin; el panel de contacto entra acercándose. Sin movimiento:
 * una sección detrás de otra.
 *
 * Sin encapsulación: tiene que colocar a los hijos proyectados, que llevan
 * el atributo de la home y no el suyo. Todas sus reglas cuelgan de
 * `.cierre--puertas` o `.cierre__*`.
 */
@Component({
  selector: 'app-cierre',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content />
    <div class="cierre__rendija" aria-hidden="true"></div>
  `,
  styleUrl: './cierre.scss',
  host: { class: 'cierre' },
})
export class CierreComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly proceso = contentChild.required(ProcesoComponent);

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      montarEscena(destroyRef, ({ escritorio }) => (escritorio ? this.puertas() : this.movil()));
    });
  }

  private puertas(): () => void {
    const host = this.host.nativeElement;
    const franja = host.querySelector<HTMLElement>('section.proceso');
    const panel = host.querySelector<HTMLElement>('.contacto__panel');
    const rendija = host.querySelector<HTMLElement>('.cierre__rendija');
    if (!franja || !panel || !rendija) return () => undefined;

    host.classList.add('cierre--puertas');
    const hoja = this.copiarFranja(franja);
    // El contacto se ve al FINAL del pin: el menú y los enlaces a
    // #contacto deben ir ahí (SmoothScroll lee esta marca).
    const contacto = host.querySelector<HTMLElement>('section.contacto');
    contacto?.setAttribute('data-ancla-fin', '');

    // La rendija va en el hueco entre el titular y la línea: así ninguna
    // hoja corta texto. Se mide dentro de la franja (los transforms de la
    // propia franja no alteran la diferencia).
    const corte = () => {
      const f = franja.getBoundingClientRect();
      const cabeza = franja.querySelector('.proceso__cabeza')?.getBoundingClientRect();
      const pista = franja.querySelector('.proceso__pista')?.getBoundingClientRect();
      if (!cabeza || !pista) return f.height / 2;
      return Math.round((cabeza.bottom + pista.top) / 2 - f.top);
    };
    const alto = () => franja.offsetHeight;
    gsap.set(rendija, { top: corte });

    const proceso = this.proceso();
    const camion = { v: 0 };

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: host,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 2.6,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: () => {
          gsap.set(rendija, { top: corte() });
          proceso.avanzar(camion.v);
        },
      },
    });

    // 1. El camión recorre la línea
    tl.to(camion, { v: 1, duration: 1.5, onUpdate: () => proceso.avanzar(camion.v) });

    // 2. La rendija de luz se enciende de centro a bordes
    tl.fromTo(
      rendija,
      { scaleX: 0, autoAlpha: 0 },
      { scaleX: 1, autoAlpha: 1, duration: 0.3, ease: 'power2.out' },
      1.6,
    );

    // 3. La franja se parte en dos hojas por la rendija y se abren
    tl.set(franja, { clipPath: () => `inset(0px 0px ${alto() - corte()}px 0px)` }, 1.9)
      .set(hoja, { autoAlpha: 1, clipPath: () => `inset(${corte()}px 0px 0px 0px)` }, 1.9)
      .to(franja, { y: () => -corte(), duration: 0.9, ease: 'power2.inOut' }, 1.9)
      .to(hoja, { y: () => alto() - corte(), duration: 0.9, ease: 'power2.inOut' }, 1.9)
      .to(rendija, { scaleY: 14, autoAlpha: 0, duration: 0.45, ease: 'power1.out' }, 1.9)
      .fromTo(
        panel,
        { scale: 0.9, autoAlpha: 0.4 },
        { scale: 1, autoAlpha: 1, duration: 0.9, ease: 'power2.out' },
        1.9,
      )
      // La hoja de abajo, ya fuera, se oculta: si no, quedaría sobre el
      // resto del contacto al seguir bajando. La de arriba NO: es la franja
      // real, y visibility: hidden la sacaría del árbol de accesibilidad;
      // basta con que salga por encima del bloque, que la recorta.
      .set(hoja, { autoAlpha: 0 }, 2.8)
      .to({}, { duration: 0.15 });

    // Con Tab se puede entrar en el contacto con las puertas cerradas
    // (está debajo, tapado): se lleva la página a las puertas abiertas.
    const alEnfocar = (e: FocusEvent) => {
      const st = tl.scrollTrigger;
      if (!st || st.progress >= 1 || !contacto?.contains(e.target as Node)) return;
      window.scrollTo({ top: st.end, behavior: 'instant' });
    };
    host.addEventListener('focusin', alEnfocar);

    return () => {
      host.removeEventListener('focusin', alEnfocar);
      contacto?.removeAttribute('data-ancla-fin');
      hoja.remove();
      host.classList.remove('cierre--puertas');
    };
  }

  /**
   * La hoja de abajo: una copia de la franja con el recorrido terminado
   * (que es lo que se ve cuando se abre), decorativa y fuera del árbol de
   * accesibilidad y del foco. Sin ids para no duplicarlos.
   */
  private copiarFranja(franja: HTMLElement): HTMLElement {
    const hoja = franja.cloneNode(true) as HTMLElement;
    hoja.removeAttribute('id');
    hoja.removeAttribute('aria-labelledby');
    hoja.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    hoja.querySelectorAll('[appRevelar]').forEach((e) => e.classList.add('revelado'));
    hoja.querySelectorAll('.paso').forEach((e) => e.classList.add('paso--alcanzado'));
    hoja.querySelector<HTMLElement>('.proceso__pista')?.style.setProperty('--avance', '1');
    // La copia se hace antes de que el proceso ponga su clase de
    // escritorio (el cierre monta primero): sin ella mediría otro alto y
    // su contenido no coincidiría con el de la franja real.
    hoja.classList.add('cierre__hoja', 'proceso--fijo');
    hoja.setAttribute('aria-hidden', 'true');
    hoja.inert = true;
    gsap.set(hoja, { autoAlpha: 0 });
    franja.after(hoja);
    return hoja;
  }

  private movil(): void {
    const panel = this.host.nativeElement.querySelector<HTMLElement>('.contacto__panel');
    if (!panel) return;
    gsap.fromTo(
      panel,
      { scale: 0.9, y: 40 },
      {
        scale: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top 35%', scrub: true },
      },
    );
  }
}
