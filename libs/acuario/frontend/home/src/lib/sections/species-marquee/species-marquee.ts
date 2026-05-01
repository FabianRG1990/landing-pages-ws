import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { Species, SpeciesStatus, species } from '@acuario-ui-shared/data/data';
import { Eyebrow } from '@acuario-ui-shared/components/eyebrow/eyebrow';
import { ImgFadeDirective } from '@acuario-ui-shared/directives/img-fade/img-fade.directive';
import { RevealDirective } from '@acuario-ui-shared/directives/reveal/reveal.directive';

const STATUS_TONES: Record<SpeciesStatus, string> = {
  Estable: 'estable',
  Vulnerable: 'vulnerable',
  'En peligro': 'en-peligro',
  Crítico: 'critico',
};

interface ReelItem extends Species {
  reelKey: string;
}

/**
 * SpeciesMarquee — capítulo 02 del manifiesto. Marquee horizontal infinito
 * con todas las especies (duplicadas dos veces para el loop sin costura).
 * Anima vía `animate-marquee` (definida en _keyframes.scss).
 */
@Component({
  selector: 'app-species-marquee',
  imports: [Eyebrow, ImgFadeDirective, RevealDirective],
  templateUrl: './species-marquee.html',
  styleUrl: './species-marquee.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeciesMarquee {
  protected readonly reel = computed<ReelItem[]>(() =>
    [...species, ...species].map((sp, i) => ({
      ...sp,
      reelKey: `${sp.slug}-${i}`,
    })),
  );

  protected statusToneAttr(status: SpeciesStatus): string {
    return STATUS_TONES[status];
  }
}
