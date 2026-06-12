import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '@interiorismo-ui-shared';
import { HeroVideo } from '../../components/hero-video/hero-video';
import { ExplodingScroll } from '../../components/exploding-scroll/exploding-scroll';

/**
 * Inicio — pieza central de la landing: hero con video, la vista de la casa
 * expandiéndose en canvas (scroll-driven), el marquee de conceptos y un
 * testimonio. El scroll fluye continuo entre las piezas (sin cortes).
 */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroVideo, ExplodingScroll, RevealDirective],
  templateUrl: './inicio.html',
})
export class InicioPage {
  private readonly labels = [
    'Materia',
    'Luz',
    'Proporción',
    'Silencio',
    'Forma',
    'Tiempo',
    'Tacto',
    'Oficio',
  ];
  // Duplicado para un loop sin costuras (track width:max-content + translateX -50%).
  protected readonly marqueeLoop = [...this.labels, ...this.labels];
}
