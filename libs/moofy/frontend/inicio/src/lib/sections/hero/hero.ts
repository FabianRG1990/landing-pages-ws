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
import { HERO, SITE, enlaceWhatsapp, foto800 } from '@moofy-ui-shared/data/site';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { ParallaxDirective } from '@moofy-ui-shared/motion/parallax.directive';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { SmoothScroll } from '@moofy-ui-shared/motion/smooth-scroll.service';
import { montarEscena } from '@moofy-ui-shared/motion/escena';

type Ref = ElementRef<HTMLElement>;

/**
 * Hero de Moofy de día: titular a la izquierda y, a la derecha, la foto
 * en un marco redondeado sobre la forma azul del logo, con la pegatina
 * roja y la tarjeta de datos montadas encima.
 *
 * Entrada orquestada al cargar: la forma azul crece girando, la foto se
 * abre desde un círculo, la tarjeta sube contando las líneas y la
 * pegatina cae al final como un sello. Al bajar, el texto se adelanta a
 * la escena y la pegatina gira: dos planos a distinta velocidad.
 *
 * La escena empieza oculta por CSS bajo `.con-movimiento` (antes del
 * primer pintado) y la timeline la muestra en el mismo fotograma en que
 * pone los estados de partida. Sin movimiento se ve tal cual.
 */
@Component({
  selector: 'app-hero',
  imports: [RevelarDirective, ParallaxDirective, RenglonesComponent, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent {
  private readonly smooth = inject(SmoothScroll);

  protected readonly hero = HERO;
  protected readonly foto800 = foto800;
  protected readonly t = HERO.tarjeta;
  protected readonly whatsapp = enlaceWhatsapp(SITE.mensajeReunion);

  private readonly texto = viewChild.required<Ref>('texto');
  private readonly escena = viewChild.required<Ref>('escena');
  private readonly forma = viewChild.required<Ref>('forma');
  private readonly foto = viewChild.required<Ref>('foto');
  private readonly pegatina = viewChild.required<Ref>('pegatina');
  private readonly tarjeta = viewChild.required<Ref>('tarjeta');
  private readonly cifra = viewChild.required<Ref>('cifra');

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
    const foto = this.foto().nativeElement;
    const cifra = this.cifra().nativeElement;
    const final = Number(this.t.cifra);
    const cuenta = { n: 0 };

    gsap.set(escena, { visibility: 'visible' });
    return gsap
      .timeline({ delay: 0.2, defaults: { ease: 'expo.out' } })
      .from(this.forma().nativeElement, { scale: 0.35, rotation: -48, opacity: 0, duration: 1.5 }, 0)
      // fromTo con el círculo final explícito: de `circle()` a `none`
      // (el valor calculado) GSAP no interpola y la foto salta al final.
      .fromTo(
        foto,
        { clipPath: 'circle(0% at 58% 50%)' },
        {
          clipPath: 'circle(100% at 58% 50%)',
          duration: 1.4,
          ease: 'expo.inOut',
          // El clip también recorta el filete blanco y la sombra del
          // marco: se retira en cuanto la foto está abierta.
          clearProps: 'clipPath',
        },
        0.1,
      )
      .from(foto, { scale: 0.9, duration: 1.6 }, 0.1)
      .from(this.tarjeta().nativeElement, { y: 70, opacity: 0, duration: 1.2 }, 0.75)
      .fromTo(
        cuenta,
        { n: 0 },
        {
          n: final,
          duration: 1.3,
          ease: 'power3.out',
          onUpdate: () => {
            cifra.textContent = String(Math.round(cuenta.n)).padStart(2, '0');
          },
        },
        0.9,
      )
      // El sello: cae grande y torcido y se asienta con un rebote corto
      .from(
        this.pegatina().nativeElement,
        { scale: 2.6, rotation: -40, opacity: 0, duration: 0.75, ease: 'back.out(2)' },
        1.15,
      );
  }

  /**
   * Al salir del hero el texto sube más rápido que la escena y la
   * pegatina gira. Se anima `--giro` (la propiedad CSS `rotate`) y no la
   * rotación de GSAP, que es la que usa la entrada del sello.
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
      .fromTo(this.pegatina().nativeElement, { '--giro': '0deg' }, { '--giro': '70deg' }, 0);
  }
}
