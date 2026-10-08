import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { FABRICA, foto800 } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { ContadorDirective } from '@moofy-ui-shared/motion/contador.directive';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { montarEscena } from '@moofy-ui-shared/motion/escena';

/**
 * Capítulo 01: el argumento central. Moofy fabrica, no revende.
 *
 * Escritorio: el escenario se fija a pantalla completa. La foto de la
 * planta se abre de tarjeta centrada a sangre (clip-path, con un leve
 * alejamiento de la imagen) y después los tres pilares entran encima como
 * tarjetas blancas, uno a uno, con su icono trazándose. Unas dos
 * pantallas y media de scroll.
 *
 * Móvil: sin pin. La foto entra con parallax y los pilares se escalonan
 * al asomar. Sin movimiento: foto y lista, que es lo que pinta el HTML.
 */
@Component({
  selector: 'app-fabrica',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective, ContadorDirective, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fabrica.html',
  styleUrl: './fabrica.scss',
})
export class FabricaComponent {
  protected readonly f = FABRICA;
  protected readonly foto800 = foto800;

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
  private readonly foto = viewChild.required<ElementRef<HTMLElement>>('foto');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      montarEscena(destroyRef, ({ escritorio }) =>
        escritorio ? this.escritorio() : this.movil(),
      );
    });
  }

  private escritorio(): () => void {
    const seccion = this.seccion().nativeElement;
    const escenario = this.escenario().nativeElement;
    const foto = this.foto().nativeElement;
    const img = foto.querySelector('img');
    const pilares = gsap.utils.toArray<HTMLElement>('.pilar', escenario);

    // La clase cambia el layout a escenario; se pone antes de crear el
    // pin para que mida ya con el alto de pantalla completa.
    seccion.classList.add('fabrica--escena');

    // El ritmo, en unidades de la timeline. La foto se abre de 0 a 1 y
    // los pilares se van formando DURANTE la apertura, escalonados, para
    // estar completos justo cuando la foto llena la pantalla: entrando
    // después, se esperaba media pantalla de scroll con la foto sola.
    const APERTURA = 1;
    const PILAR = [0.3, 0.45, 0.6]; // inicio de cada pilar
    const DURACION_PILAR = APERTURA - PILAR[2]; // el último acaba con la foto
    const RESPIRO = 0.5; // los tres a la vista antes de soltar
    const TOTAL = 1.2 + RESPIRO; // el acercamiento de la imagen dura 1.2
    // 0.78 pantallas de scroll por unidad: la misma velocidad de apertura
    // que tenía el pin de 2.4 pantallas.
    const PANTALLAS_POR_UNIDAD = 0.78;

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: escenario,
        start: 'top top',
        end: () => '+=' + window.innerHeight * PANTALLAS_POR_UNIDAD * TOTAL,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    tl.fromTo(
      foto,
      { clipPath: 'inset(14% 20% 14% 20% round 32px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: APERTURA, ease: 'power2.inOut' },
      0,
    ).fromTo(img, { scale: 1.22 }, { scale: 1, duration: 1.2, ease: 'power1.out' }, 0);

    pilares.forEach((pilar, i) => {
      const t = PILAR[i] ?? PILAR[PILAR.length - 1];
      const trazos = pilar.querySelectorAll('.pilar__icono svg > *');
      tl.fromTo(
        pilar,
        { y: 80, opacity: 0, scale: 0.94 },
        { y: 0, opacity: 1, scale: 1, duration: DURACION_PILAR, ease: 'power3.out' },
        t,
      ).fromTo(
        trazos,
        { drawSVG: '0%' },
        { drawSVG: '100%', duration: DURACION_PILAR - 0.08, ease: 'power1.inOut' },
        t + 0.08,
      );
    });

    // Un respiro al final con los tres pilares a la vista antes de soltar
    tl.to({}, { duration: RESPIRO }, 1.2);

    return () => seccion.classList.remove('fabrica--escena');
  }

  private movil(): void {
    const escenario = this.escenario().nativeElement;
    const foto = this.foto().nativeElement;

    gsap.fromTo(
      foto.querySelector('img'),
      { yPercent: -6, scale: 1.12 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: foto, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
    // Escala y no clip-path: un recorte final taparía el filete blanco y
    // la sombra del marco, que caen fuera de su caja.
    gsap.fromTo(
      foto,
      { scale: 0.86, opacity: 0.4 },
      {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: foto, start: 'top bottom', end: 'top 45%', scrub: true },
      },
    );
    gsap.from(gsap.utils.toArray<HTMLElement>('.pilar', escenario), {
      y: 36,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.14,
      scrollTrigger: { trigger: escenario.querySelector('.fabrica__pilares'), start: 'top 85%' },
    });
  }
}
