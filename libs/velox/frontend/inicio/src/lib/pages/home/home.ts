import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  HERO_STATS,
  LinkDirective,
  RevealDirective,
  VideoShowcase,
} from '@velox-ui-shared';

/**
 * Home (`/inicio`) — la pieza central: hero + showcase cinemático del coche.
 * Los demás segmentos (Performance, Design, Technology, Ownership) son páginas
 * propias a las que navega el nav, con su transición entre rutas.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VideoShowcase, RevealDirective, LinkDirective],
  templateUrl: './home.html',
})
export class HomePage {
  protected readonly stats = HERO_STATS;
  protected readonly heroArrows = [0, 1, 2];
}
