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
import { HERO, LINEAS, SITE, enlaceWhatsapp, foto800 } from '@moofy-ui-shared/data/site';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { SmoothScroll } from '@moofy-ui-shared/motion/smooth-scroll.service';
import { montarEscena } from '@moofy-ui-shared/motion/escena';

type Ref = ElementRef<HTMLElement>;

/**
 * Hero de Moofy de día: titular a la izquierda y, a la derecha, los dos
 * mensajes de la página a la vista. El catálogo es un mosaico con una
 * foto por línea, en tres columnas en escalera sobre la forma azul del
 * logo; la cobertura va en la tarjeta, junto a las líneas: «6 líneas,
 * 7 provincias». El sello rojo ocupa el hueco de arriba de la escalera y
 * la tarjeta, el de abajo.
 *
 * Entrada orquestada al cargar: la forma azul crece girando, las fotos
 * suben una tras otra, la tarjeta sube contando y el sello cae al final.
 * Al bajar, el texto se adelanta a la escena, la escalera se aplana y el
 * sello gira.
 *
 * La escena empieza oculta por CSS bajo `.con-movimiento` (antes del
 * primer pintado) y la timeline la muestra en el mismo fotograma en que
 * pone los estados de partida. Sin movimiento se ve tal cual.
 */
@Component({
  selector: 'app-hero',
  imports: [RevelarDirective, RenglonesComponent, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent {
  private readonly smooth = inject(SmoothScroll);

  protected readonly hero = HERO;
  protected readonly lineas = LINEAS.items;
  protected readonly foto800 = foto800;
  protected readonly whatsapp = enlaceWhatsapp(SITE.mensajeReunion);

  private readonly texto = viewChild.required<Ref>('texto');
  private readonly escena = viewChild.required<Ref>('escena');
  private readonly forma = viewChild.required<Ref>('forma');
  private readonly mosaico = viewChild.required<Ref>('mosaico');
  private readonly pegatina = viewChild.required<Ref>('pegatina');
  private readonly tarjeta = viewChild.required<Ref>('tarjeta');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      // La entrada va fuera de montarEscena: matchMedia revierte lo que
      // crea al cruzar los 900 px, y eso devolvería la escena a oculta.
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const tl = this.entrar();
        destroyRef.onDestroy(() => tl.kill());
      }
      montarEscena(destroyRef, ({ escritorio }) => this.alBajar(escritorio));
    });
  }

  protected ir(evento: Event, ancla: string): void {
    evento.preventDefault();
    this.smooth.scrollTo(ancla);
  }

  private entrar(): gsap.core.Timeline {
    const escena = this.escena().nativeElement;
    const tarjeta = this.tarjeta().nativeElement;
    const piezas = gsap.utils.toArray<HTMLElement>('.pieza', this.mosaico().nativeElement);

    gsap.set(escena, { visibility: 'visible' });
    const tl = gsap
      .timeline({ delay: 0.2, defaults: { ease: 'expo.out' } })
      .from(this.forma().nativeElement, { scale: 0.35, rotation: -48, opacity: 0, duration: 1.5 }, 0)
      // Las fotos suben en el orden del catálogo. La escalera la pone el
      // CSS con `translate`; aquí solo se anima el transform.
      .from(piezas, { y: 70, opacity: 0, scale: 0.9, duration: 1.2, stagger: 0.09 }, 0.15)
      .from(tarjeta, { y: 50, opacity: 0, duration: 1.1 }, 0.85);

    // Las dos cifras cuentan a la vez hasta su valor
    for (const cifra of Array.from(tarjeta.querySelectorAll<HTMLElement>('.hero__cifra'))) {
      const cuenta = { n: 0 };
      tl.fromTo(
        cuenta,
        { n: 0 },
        {
          n: Number(cifra.dataset['valor']),
          duration: 1.2,
          ease: 'power3.out',
          onUpdate: () => {
            cifra.textContent = String(Math.round(cuenta.n));
          },
        },
        1,
      );
    }

    // El sello: cae grande y torcido y se asienta con un rebote corto
    return tl.from(
      this.pegatina().nativeElement,
      { scale: 2.6, rotation: -40, opacity: 0, duration: 0.75, ease: 'back.out(2)' },
      1.15,
    );
  }

  /**
   * Al salir del hero el texto sube más rápido que la escena, la escalera
   * del mosaico se aplana y la pegatina gira. Se animan variables CSS
   * (`--giro`, `--deriva`) y no los transform de GSAP, que son los que
   * usa la entrada.
   */
  private alBajar(escritorio: boolean): void {
    const k = escritorio ? 1 : 0.5;
    const scrollTrigger = {
      trigger: this.escena().nativeElement.closest('section'),
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    };
    gsap
      .timeline({ scrollTrigger, defaults: { ease: 'none' } })
      .to(this.texto().nativeElement, { y: -140 * k }, 0)
      .to(this.escena().nativeElement, { y: -50 * k }, 0)
      .to(this.forma().nativeElement, { yPercent: 12 * k }, 0)
      .fromTo(this.mosaico().nativeElement, { '--deriva': '0px' }, { '--deriva': `${-34 * k}px` }, 0)
      .fromTo(this.pegatina().nativeElement, { '--giro': '0deg' }, { '--giro': '70deg' }, 0);
  }
}
