import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CONTACT, mailContactLink, waContactLink, waDirectLink } from '@bolleria-ui-shared';

@Component({
  selector: 'bol-contact-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.scss',
})
export class ContactPageComponent {
  readonly contact = CONTACT;
  readonly waDirect = waDirectLink();

  get telLink(): string {
    return `tel:${this.contact.waDisplay.replace(/[^\d+]/g, '')}`;
  }
  get mailLink(): string {
    return `mailto:${this.contact.correo}`;
  }

  /** Transcripción fiel de `sendWa` — abre WhatsApp con los valores actuales del formulario. */
  sendWa(nombre: string, tel: string, msg: string): void {
    window.open(waContactLink(nombre, tel, msg), '_blank', 'noopener');
  }

  /** Transcripción fiel de `sendMail`. */
  sendMail(nombre: string, tel: string, msg: string): void {
    window.location.href = mailContactLink(nombre, tel, msg);
  }
}
