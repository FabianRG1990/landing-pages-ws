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
import { CANALES, LINEAS } from '@moofy-ui-shared/data/site';
import { montarEscena } from '@moofy-ui-shared/motion/escena';

type Ref = ElementRef<HTMLElement>;

/**
 * El puente entre lo que Moofy hace (líneas) y para quién (canales): dos
 * cintas cruzadas de borde a borde, roja delante con los canales y azul
 * detrás con las líneas, con el filete blanco y el contorno azul del
 * logo. Con el scroll corren en sentidos contrarios.
 *
 * Decorativa: las dos listas están completas en sus secciones, así que
 * el bloque entero va oculto a los lectores de pantalla. La lista se
 * repite tres veces para que el desplazamiento nunca deje ver el final.
 */
@Component({
  selector: 'app-cinta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cinta.html',
  styleUrl: './cinta.scss',
})
export class CintaComponent {
  protected readonly canales = CANALES.items.map((c) => c.nombre);
  protected readonly lineas = LINEAS.items.map((l) => l.nombre);
  protected readonly vueltas = [0, 1, 2];

  private readonly cinta = viewChild.required<Ref>('cinta');
  private readonly roja = viewChild.required<Ref>('roja');
  private readonly azul = viewChild.required<Ref>('azul');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      montarEscena(destroyRef, () => {
        const scrollTrigger = {
          trigger: this.cinta().nativeElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        };
        gsap
          .timeline({ scrollTrigger, defaults: { ease: 'none' } })
          .fromTo(this.roja().nativeElement, { xPercent: 0 }, { xPercent: -22 }, 0)
          .fromTo(this.azul().nativeElement, { xPercent: -22 }, { xPercent: 0 }, 0);
      });
    });
  }
}
