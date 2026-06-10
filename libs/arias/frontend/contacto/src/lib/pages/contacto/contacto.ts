import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RevealDirective } from '@arias-ui-shared';

/** 06 · Contacto — datos, ubicación y formulario (abre el correo). */
@Component({
  selector: 'app-contacto-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RevealDirective],
  templateUrl: './contacto.html',
})
export class ContactoPage {
  protected nombre = '';
  protected email = '';
  protected telefono = '';
  protected mensaje = '';
  protected readonly status = signal('');

  private readonly platformId = inject(PLATFORM_ID);

  protected submit(): void {
    const nombre = this.nombre.trim();
    const email = this.email.trim();
    const tel = this.telefono.trim();
    const msg = this.mensaje.trim();

    if (!nombre || !email || !msg) {
      this.status.set('Por favor complete nombre, correo y mensaje.');
      return;
    }

    const subject = encodeURIComponent('Solicitud de cita — ' + nombre);
    const body = encodeURIComponent(
      'Nombre: ' + nombre + '\nCorreo: ' + email + '\nTeléfono: ' + tel + '\n\n' + msg,
    );
    this.status.set('Abriendo su correo…');
    if (isPlatformBrowser(this.platformId)) {
      window.location.href =
        'mailto:monica.ariaslepiz@gmail.com?subject=' + subject + '&body=' + body;
    }
    setTimeout(
      () => this.status.set('¡Gracias! Su mensaje está listo para enviarse.'),
      800,
    );
  }
}
