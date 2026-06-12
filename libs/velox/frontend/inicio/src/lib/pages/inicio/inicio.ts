import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  FEATURES,
  HERO_STATS,
  PRESS_LOGOS,
  RevealDirective,
  VideoShowcase,
} from '@velox-ui-shared';

/**
 * VELOX — landing de una sola página. Compone, en orden de scroll:
 *   Hero → VideoShowcase (showcase cinemático) → SocialProof → Features → CTA.
 * El Nav y el Footer son chrome global (viven en el shell de la app).
 */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VideoShowcase, RevealDirective],
  templateUrl: './inicio.html',
})
export class InicioPage {
  protected readonly stats = HERO_STATS;
  protected readonly features = FEATURES;
  protected readonly pressLogos = PRESS_LOGOS;

  /** Opacidades base de las 3 flechas de scroll del hero (decoración). */
  protected readonly heroArrows = [0, 1, 2];
}
