import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '@cafe-rosa-ui-shared';

interface Flavor {
  readonly label: string;
  readonly val: number;
}

type BottomIcon = 'wind' | 'sun' | 'leaf';

interface BottomFeature {
  readonly icon: BottomIcon;
  readonly title: string;
  readonly sub: string;
}

/**
 * Historia — «El arte del café». Bento grid con la card grande de origen
 * (incluye el perfil de sabores con barras animadas por CSS al revelarse),
 * pastelería artesanal, ambiente rosa, y una fila inferior de 3 features.
 * Equivale a `<Features/>` del original React, sin framer-motion ni lucide.
 */
@Component({
  selector: 'app-historia-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './historia.html',
  styleUrl: './historia.scss',
})
export class HistoriaPage {
  protected readonly flavorProfile: readonly Flavor[] = [
    { label: 'Floral', val: 85 },
    { label: 'Frutal', val: 70 },
    { label: 'Caramelo', val: 90 },
    { label: 'Acidez', val: 55 },
    { label: 'Cuerpo', val: 80 },
    { label: 'Dulzor', val: 95 },
  ];

  protected readonly bottomFeatures: readonly BottomFeature[] = [
    { icon: 'wind', title: 'Tostado Suave', sub: 'Perfección en cada grado' },
    { icon: 'sun', title: 'Brunch de Lujo', sub: 'Sábados y domingos' },
    { icon: 'leaf', title: 'Ingredientes Bio', sub: 'Km 0 y sostenible' },
  ];
}
