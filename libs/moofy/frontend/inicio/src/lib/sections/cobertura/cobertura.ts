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
import { COBERTURA } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { montarEscena } from '@moofy-ui-shared/motion/escena';
import { RELEVO } from '@moofy-ui-shared/motion/relevo';
import { MAPA } from './mapa-cr';

/** El orden en que se arma el mapa: de la provincia de la planta hacia fuera. */
const ORDEN = ['Alajuela', 'Heredia', 'San José', 'Cartago', 'Guanacaste', 'Puntarenas', 'Limón'];

/**
 * Capítulo 02: la cobertura. Moofy llega a cualquier punto del país.
 *
 * El argumento a la izquierda y, a la derecha, el mapa de Costa Rica con
 * sus siete provincias y una ruta que sale de la planta en Grecia hacia
 * cada una.
 *
 * Escritorio: la sección va montada sobre el final del catálogo y se
 * queda fija. Primero se abre el azul en círculo desde la planta, sobre
 * el catálogo que se apaga (RELEVO); después, con la pantalla ya quieta,
 * el mapa se arma provincia por provincia de Grecia hacia fuera, las
 * rutas salen de la planta y cada destino se enciende cuando su ruta
 * llega. Todo lo lleva el scroll, en poco más de una pantalla.
 *
 * Móvil: sin pin; el mapa se arma una vez, a su ritmo, al asomar. Sin
 * movimiento, el mapa está completo desde el principio, que es lo que
 * pinta el HTML.
 */
@Component({
  selector: 'app-cobertura',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cobertura.html',
  styleUrl: './cobertura.scss',
})
export class CoberturaComponent {
  protected readonly c = COBERTURA;
  protected readonly m = MAPA;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly mapa = viewChild.required<ElementRef<SVGSVGElement>>('mapa');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      montarEscena(destroyRef, ({ escritorio }) => this.armar(escritorio));
    });
  }

  private armar(escritorio: boolean): (() => void) | void {
    const mapa = this.mapa().nativeElement;
    const q = <T extends Element>(sel: string) => gsap.utils.toArray<T>(sel, mapa);
    // Las tres listas vienen en el orden de MAPA.provincias: se reordenan
    // igual para que provincia, ruta y destino vayan juntos.
    const enOrden = <T>(lista: T[]) =>
      ORDEN.map((nombre) => lista[MAPA.provincias.findIndex((p) => p.nombre === nombre)]);
    const piezas = {
      provincias: enOrden(q<SVGPathElement>('.mapa__provincia')),
      rutas: enOrden(q<SVGPathElement>('.mapa__ruta')),
      destinos: enOrden(q<SVGGElement>('.mapa__destino')),
      planta: q<SVGGElement>('.mapa__planta'),
    };
    return escritorio ? this.escritorio(piezas) : this.movil(piezas);
  }

  /**
   * Escritorio: un solo pin con todo. En unidades de pantalla de scroll:
   * el relevo (el azul se abre), el armado del mapa y un respiro con el
   * mapa completo antes de soltar.
   */
  private escritorio(p: Piezas): () => void {
    const host = this.host.nativeElement;
    const seccion = this.seccion().nativeElement;
    const mapa = this.mapa().nativeElement;
    const texto = seccion.querySelector('.cobertura__texto');

    const ARMADO = 0.7;
    const RESPIRO = 0.12;
    const TOTAL = RELEVO + ARMADO + RESPIRO;

    // La clase sube la sección sobre el final del catálogo; va antes de
    // crear el pin para que mida ya en su sitio.
    host.classList.add('cobertura-relevo');
    // Quien llega por el menú debe ver el mapa hecho: el ancla va al
    // final del pin (SmoothScroll lee esta marca).
    seccion.setAttribute('data-ancla-fin', '');

    // El círculo se abre desde la planta: su punto en la sección
    const planta = () => {
      const s = seccion.getBoundingClientRect();
      const m = mapa.getBoundingClientRect();
      return {
        x: m.left - s.left + (MAPA.grecia.x / MAPA.ancho) * m.width,
        y: m.top - s.top + (MAPA.grecia.y / MAPA.alto) * m.height,
      };
    };
    const circulo = (radio: number) => {
      const c = planta();
      return `circle(${radio}px at ${c.x.toFixed(1)}px ${c.y.toFixed(1)}px)`;
    };

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: {
        trigger: seccion,
        start: 'top top',
        end: () => '+=' + window.innerHeight * TOTAL,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    // 1. El relevo: el azul se abre en círculo desde la planta. De círculo
    //    a círculo, con el final explícito: hacia `none` GSAP no interpola.
    tl.fromTo(
      seccion,
      { clipPath: () => circulo(0) },
      {
        clipPath: () => circulo(Math.hypot(seccion.offsetWidth, seccion.offsetHeight)),
        duration: RELEVO,
        ease: 'power2.in',
      },
      0,
    )
      .from(p.planta, { scale: 0.2, opacity: 0, duration: 0.14, ease: 'back.out(2.2)', transformOrigin: '0 0' }, 0.02)
      .from(texto, { opacity: 0, y: 40, duration: 0.22 }, RELEVO * 0.7);

    // 2. El mapa se arma provincia por provincia, de Grecia hacia fuera
    const t0 = RELEVO * 0.85;
    tl.from(
      p.provincias,
      { opacity: 0, scale: 0.82, transformOrigin: '50% 50%', duration: 0.16, ease: 'back.out(1.6)', stagger: 0.05 },
      t0,
    );

    // 3. Las rutas salen de la planta y cada destino se enciende al llegar
    const t1 = t0 + 0.3;
    p.rutas.forEach((ruta, i) => {
      const t = t1 + i * 0.045;
      const destino = p.destinos[i];
      tl.from(ruta, { drawSVG: '0%', duration: 0.24, ease: 'power2.inOut' }, t)
        .from(
          destino.querySelector('.mapa__punto'),
          { scale: 0, duration: 0.1, ease: 'back.out(3)', transformOrigin: '50% 50%' },
          t + 0.19,
        )
        .from(destino.querySelector('.mapa__nombre'), { opacity: 0, duration: 0.1 }, '<0.02');
    });

    // 4. El mapa completo se queda a la vista antes de soltar
    tl.to({}, { duration: Math.max(0.01, TOTAL - tl.duration()) });

    return () => {
      seccion.removeAttribute('data-ancla-fin');
      host.classList.remove('cobertura-relevo');
    };
  }

  /** Móvil: sin pin. El mapa se arma una vez, a su ritmo, al asomar. */
  private movil(p: Piezas): void {
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: this.mapa().nativeElement, start: 'top 72%', once: true },
    });

    tl.from(p.planta, { opacity: 0, scale: 0.2, duration: 0.6, ease: 'back.out(2.2)', transformOrigin: '0 0' }, 0)
      .from(
        p.provincias,
        { opacity: 0, scale: 0.82, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(1.6)', stagger: 0.12 },
        0.15,
      );

    p.rutas.forEach((ruta, i) => {
      const t = 1.1 + i * 0.12;
      const destino = p.destinos[i];
      tl.from(ruta, { drawSVG: '0%', duration: 0.9, ease: 'power2.inOut' }, t)
        .from(
          destino.querySelector('.mapa__punto'),
          { scale: 0, duration: 0.45, ease: 'back.out(3)', transformOrigin: '50% 50%' },
          t + 0.7,
        )
        .from(destino.querySelector('.mapa__nombre'), { opacity: 0, duration: 0.4 }, '<0.05');
    });
  }
}

interface Piezas {
  readonly provincias: SVGPathElement[];
  readonly rutas: SVGPathElement[];
  readonly destinos: SVGGElement[];
  readonly planta: SVGGElement[];
}
