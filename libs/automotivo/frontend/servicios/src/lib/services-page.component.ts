import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AutomotivoStore,
  WHATSAPP_LINK,
  SERVICES,
  IconComponent,
} from '@automotivo-ui-shared';

@Component({
  selector: 'amv-services-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './services-page.component.html',
  styleUrl: './services-page.component.scss',
})
export class ServicesPageComponent {
  private readonly store = inject(AutomotivoStore);
  readonly waLink = WHATSAPP_LINK;
  readonly services = SERVICES.map((s, i) => ({ ...s, n: String(i + 1).padStart(2, '0') }));
  go = this.store.go;
}
