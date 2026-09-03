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
    return `tel:${this.contact.telDisplay.replace(/[^\d+]/g, '')}`;
  }

  get mailLink(): string {
    return `mailto:${this.contact.correo}`;
  }

  /**
   * Abre la ubicación en la app de navegación que tenga la persona.
   *
   * Solo interviene en Android, que es el único sistema donde el esquema `geo:`
   * hace salir el selector del sistema -Waze, Google Maps, la que tenga-. iOS no
   * lo entiende y en escritorio no significa nada, así que ahí no se toca nada y
   * el enlace hace lo suyo: abrir la ficha del negocio en Google Maps.
   *
   * Un `geo:` que ninguna app recoge no da error ni navega: simplemente no pasa
   * nada, y el enlace se quedaría muerto. Por eso se arma un plazo corto y, si
   * al vencer seguimos en la página -señal de que no se abrió nada-, se abre
   * Google Maps. Si sí se abrió una app la pestaña queda oculta, y ahí se
   * cancela el plazo para no abrir un mapa de más al volver.
   */
  comoLlegar(ev: MouseEvent): void {
    if (!/android/i.test(navigator.userAgent)) return;
    ev.preventDefault();
    const { lat, lon, mapsUrl } = this.contact;
    const reserva = window.setTimeout(() => window.open(mapsUrl, '_blank', 'noopener'), 1200);
    document.addEventListener('visibilitychange', () => window.clearTimeout(reserva), { once: true });
    const etiqueta = encodeURIComponent('La Bollería Panadería');
    window.location.href = `geo:${lat},${lon}?q=${lat},${lon}(${etiqueta})`;
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
