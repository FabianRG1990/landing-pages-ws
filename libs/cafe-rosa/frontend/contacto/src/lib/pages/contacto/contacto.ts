import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { CONTACT, RevealDirective } from '@cafe-rosa-ui-shared';

/** Icono disponible para un dato de contacto. */
type ContactIcon = 'map-pin' | 'phone' | 'mail';

interface ContactInfo {
  readonly icon: ContactIcon;
  readonly label: string;
  readonly value: string;
  readonly sub: string;
}

/**
 * Contacto — sección de eventos & catering: datos de contacto (dirección,
 * teléfono, email) + placeholder de mapa, junto a un formulario de contacto.
 * Equivale a `<ContactForm/>` del original React.
 */
@Component({
  selector: 'app-contacto-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './contacto.html',
  styleUrl: './contacto.scss',
})
export class ContactoPage {
  protected readonly sent = signal(false);

  protected readonly contactInfo: readonly ContactInfo[] = [
    {
      icon: 'map-pin',
      label: 'Dirección',
      value: `${CONTACT.address[0]}, ${CONTACT.address[1]}`,
      sub: CONTACT.metro,
    },
    {
      icon: 'phone',
      label: 'Teléfono',
      value: CONTACT.phone,
      sub: 'Lun–Dom · 8:00–21:00',
    },
    {
      icon: 'mail',
      label: 'Email',
      value: CONTACT.email,
      sub: 'Respondemos en menos de 2h',
    },
  ];

  protected readonly mapAddress = `${CONTACT.address[0]}, ${CONTACT.address[1]}`;

  protected readonly eventTypes: readonly string[] = [
    'Cumpleaños',
    'Boda / Pedida',
    'Evento corporativo',
    'Despedida',
    'Sesión de fotos',
    'Otro',
  ];

  protected onSubmit(e: Event): void {
    e.preventDefault();
    this.sent.set(true);
  }
}
