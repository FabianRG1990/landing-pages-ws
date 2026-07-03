import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AutomotivoStore,
  BRAND,
  VALUES,
  IconComponent,
} from '@automotivo-ui-shared';

const VALUE_ICONS: string[][] = [
  ['M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z', 'M9 12l2 2 4-4'],
  ['M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z'],
  ['M4 5h16v10H7l-3 3z', 'M8 9h8M8 12h5'],
  ['M13 2L5 13h6l-1 9 9-12h-6z'],
];

@Component({
  selector: 'amv-about-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
})
export class AboutPageComponent {
  private readonly store = inject(AutomotivoStore);
  readonly fb = BRAND.facebook;
  readonly values = VALUES.map((v, i) => ({ ...v, icon: VALUE_ICONS[i] }));
  go = this.store.go;
}
