import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BolleriaStore } from '../core/bolleria.store';
import { CONTACT } from '../data/contact-data';
import { waDirectLink } from '../core/whatsapp';
import { ScreenId } from '../core/models';

@Component({
  selector: 'bol-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  private readonly store = inject(BolleriaStore);
  readonly contact = CONTACT;
  /** El pie sale en TODAS las pantallas: este es el acceso a WhatsApp que no depende de en cuál esté la persona. */
  readonly waDirect = waDirectLink();

  go(screen: ScreenId): void {
    this.store.go(screen);
  }
}
