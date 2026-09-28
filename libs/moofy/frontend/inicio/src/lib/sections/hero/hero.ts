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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO, SITE, enlaceWhatsapp } from '@moofy-ui-shared/data/site';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { SmoothScroll } from '@moofy-ui-shared/motion/smooth-scroll.service';

/**
 * Hero cinematográfico: foto a sangre, velo lateral para el titular y
 * una salida ligada al scroll (la foto se asienta de 1.08 a 1 y la
 * penumbra la va cubriendo), como un plano que se cierra.
 *
 * La salida usa `scrub: true` —Lenis ya suaviza el scroll— y solo anima
 * transform y opacity, que componen en GPU sin repintar.
 */
@Component({
  selector: 'app-hero',
  imports: [RevelarDirective, RenglonesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent {
  private readonly smooth = inject(SmoothScroll);

  protected readonly hero = HERO;
  protected readonly site = SITE;
  protected readonly whatsapp = enlaceWhatsapp(SITE.mensajeReunion);

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly foto = viewChild.required<ElementRef<HTMLElement>>('foto');
  private readonly sombra = viewChild.required<ElementRef<HTMLElement>>('sombra');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.registerPlugin(ScrollTrigger);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: this.seccion().nativeElement,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
        defaults: { ease: 'none' },
      });
      tl.fromTo(this.foto().nativeElement, { scale: 1.08, yPercent: 0 }, { scale: 1, yPercent: 10 }, 0);
      tl.fromTo(this.sombra().nativeElement, { opacity: 0 }, { opacity: 0.7 }, 0);

      destroyRef.onDestroy(() => {
        tl.scrollTrigger?.kill();
        tl.kill();
      });
    });
  }

  protected ir(evento: Event, ancla: string): void {
    evento.preventDefault();
    this.smooth.scrollTo(ancla);
  }
}
