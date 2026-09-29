import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HERO, SITE, enlaceWhatsapp } from '@moofy-ui-shared/data/site';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { ParallaxDirective } from '@moofy-ui-shared/motion/parallax.directive';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { SmoothScroll } from '@moofy-ui-shared/motion/smooth-scroll.service';

/**
 * Hero de Moofy de día: titular a la izquierda y, a la derecha, la foto
 * en un marco redondeado sobre la forma azul del logo, con la pegatina
 * roja y la tarjeta de datos montadas encima. La foto se mueve dentro de
 * su marco con el scroll (parallax), sin tocar el resto.
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
  protected readonly t = HERO.tarjeta;
  protected readonly whatsapp = enlaceWhatsapp(SITE.mensajeReunion);

  protected ir(evento: Event, ancla: string): void {
    evento.preventDefault();
    this.smooth.scrollTo(ancla);
  }
}
