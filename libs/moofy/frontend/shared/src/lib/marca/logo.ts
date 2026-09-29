import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * El logo de Moofy, tal cual: rojo, filete blanco y contorno azul.
 *
 * Va como imagen y no redibujado en SVG: el trazo manuscrito es de la
 * marca y cualquier vectorización a mano lo altera. El archivo sale de
 * un PNG de 1761×893 recortado al contenido y exportado a 720 px de
 * ancho, suficiente para 240 px de ancho a 3x.
 *
 * Mientras Moofy no entregue el vector oficial, esta es la única
 * puerta de entrada del logo: reemplazar el archivo lo cambia en todo
 * el sitio.
 *
 * `troquel` usa la versión con un contorno blanco que sigue la silueta,
 * como una pegatina troquelada, para ponerlo sobre fondos oscuros sin
 * caja (su contorno azul se perdería en el azul). Sale del mismo archivo:
 * la silueta dilatada 15 px con transformada de distancia (borde
 * antialiasado) y los huecos interiores rellenos.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [attr.src]="troquel() ? 'img/marca/moofy-troquel.webp' : 'img/marca/moofy.webp'"
      [attr.width]="troquel() ? 758 : 720"
      [attr.height]="troquel() ? 363 : 325"
      [attr.alt]="alt()"
      [attr.loading]="diferido() ? 'lazy' : null"
      decoding="async"
    />
  `,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
    }

    img {
      width: 100%;
      height: auto;
    }
  `,
})
export class LogoComponent {
  /** Vacío cuando el logo acompaña a un texto que ya dice «Moofy». */
  readonly alt = input('Moofy');
  /** El del pie se carga diferido; el de la barra, no. */
  readonly diferido = input(false);
  /** Con el contorno blanco troquelado, para fondos oscuros. */
  readonly troquel = input(false);
}
