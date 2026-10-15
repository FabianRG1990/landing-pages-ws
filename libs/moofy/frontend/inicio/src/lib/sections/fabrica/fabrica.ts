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
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { montarEscena } from '@moofy-ui-shared/motion/escena';

/**
 * Capítulo 03: el respaldo. Moofy fabrica, no revende.
 *
 * Una franja que cabe en una pantalla: la foto de la planta a un lado y
 * los tres pilares al otro. No se fija: la página gira en torno al
 * catálogo y a la cobertura, y esta sección los respalda sin detener el
 * scroll (antes la foto se abría a pantalla completa durante dos
 * pantallas y media, más recorrido que la propia cobertura).
 *
 * Al asomar, la foto entra creciendo con un parallax leve y los pilares
 * se escalonan con su icono trazándose. Sin movimiento: foto y lista,
 * que es lo que pinta el HTML.
 */
@Component({
  selector: 'app-fabrica',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fabrica.html',
  styleUrl: './fabrica.scss',
})
export class FabricaComponent {
  protected readonly f = FABRICA;
  protected readonly foto800 = foto800;

  private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
  private readonly foto = viewChild.required<ElementRef<HTMLElement>>('foto');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      montarEscena(destroyRef, () => this.alAsomar());
    });
  }

  private alAsomar(): void {
    const escenario = this.escenario().nativeElement;
    const foto = this.foto().nativeElement;
    const pilares = gsap.utils.toArray<HTMLElement>('.pilar', escenario);

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
      { scale: 0.9, opacity: 0.4 },
      {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: foto, start: 'top bottom', end: 'top 45%', scrub: true },
      },
    );

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: escenario.querySelector('.fabrica__pilares'), start: 'top 82%' },
    });
    pilares.forEach((pilar, i) => {
      tl.from(pilar, { y: 36, opacity: 0, duration: 0.9 }, i * 0.14).from(
        pilar.querySelectorAll('.pilar__icono svg > *'),
        { drawSVG: '0%', duration: 0.8, ease: 'power1.inOut' },
        i * 0.14 + 0.15,
      );
    });
  }
}
