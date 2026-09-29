import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LINEAS, enlaceWhatsapp, mensajeMuestras } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';

/**
 * Capítulo 02: las seis líneas, en tarjetas al estilo de
 * claudioandrade.solutions. Cada tarjeta tiene una acción real: pedir
 * muestras de esa línea por WhatsApp, con el mensaje ya redactado.
 */
@Component({
  selector: 'app-lineas',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lineas.html',
  styleUrl: './lineas.scss',
})
export class LineasComponent {
  protected readonly l = LINEAS;

  protected muestras(linea: string): string {
    return enlaceWhatsapp(mensajeMuestras(linea));
  }
}
