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
  /**
   * Acceso a WhatsApp del pie. El pie ya NO sale en la portada -ahí cierra
   * `<bol-despedida />`-, así que este es el acceso de Menú y Contacto; en la
   * portada el suyo son los botones que dibuja la última página del libro.
   */
  readonly waDirect = waDirectLink();

  go(screen: ScreenId): void {
    this.store.go(screen);
  }
}
