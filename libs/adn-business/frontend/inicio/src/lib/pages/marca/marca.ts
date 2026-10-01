import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SITE } from '@adn-business-ui-shared/data/site';
import { IsotipoComponent } from '@adn-business-ui-shared/marca/isotipo';

/**
 * Firma de marca a sangre. El wordmark ocupa el ancho completo del
 * viewport: es la presencia alta del logotipo, y cierra el argumento de
 * los tres ejes con el lema de la unidad.
 */
@Component({
  selector: 'app-marca',
  standalone: true,
  imports: [IsotipoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marca.html',
  styleUrl: './marca.scss',
})
export class MarcaComponent {
  protected readonly site = SITE;
}
