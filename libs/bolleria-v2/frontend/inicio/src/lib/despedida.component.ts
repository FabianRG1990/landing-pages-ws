import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Cierre de la PORTADA, en lugar del pie de página.
 *
 * El pie completo (cuatro columnas, WhatsApp, navegación) sigue existiendo en
 * Menú y Contacto; aquí se retira a petición del dueño del sitio y este bloque
 * ocupa su lugar: una despedida corta con un versículo, bajo el libro.
 *
 * No queda sin acceso a WhatsApp: la última página del libro dibuja sus propios
 * botones de ubicación y mensaje (ver `drawSocialButton` en about-book).
 */
@Component({
  selector: 'bol-despedida',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './despedida.component.html',
  styleUrl: './despedida.component.scss',
})
export class DespedidaComponent {}
