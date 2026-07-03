import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import {
  AutomotivoStore, BrandService, WHATSAPP_LINK,
  ABOUT_STATS, HOME_SERVICE_IMAGES, HOME_SERVICE_KEYS, REVIEWS, SERVICES, TICKER,
  IconComponent,
} from '@automotivo-ui-shared';

@Component({
  selector: 'amv-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, UpperCasePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly store = inject(AutomotivoStore);
  readonly brand = inject(BrandService);
  readonly waLink = WHATSAPP_LINK;

  readonly aboutStats = ABOUT_STATS;
  readonly ticker = [...TICKER, ...TICKER];
  readonly zig = HOME_SERVICE_KEYS.map((k) => SERVICES.find((s) => s.key === k)!).map((s, i) => ({
    ...s,
    img: HOME_SERVICE_IMAGES[s.key],
    flip: i % 2 === 1,
  }));
  readonly reviewsTop = [...REVIEWS.slice(0, 4), ...REVIEWS.slice(0, 4)];
  readonly reviewsBottom = [...REVIEWS.slice(4), ...REVIEWS.slice(4)];

  go = this.store.go;
}
