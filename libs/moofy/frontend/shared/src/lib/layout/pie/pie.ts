import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NAV, PIE, SITE, enlaceWhatsapp } from '../../data/site';
import { LogoComponent } from '../../marca/logo';
import { IconoComponent } from '../../marca/icono';

/**
 * Pie en azul profundo, con el esquema del de bollería: cuatro columnas
 * con título (marca, navegación, contacto y pedidos por WhatsApp) y lo
 * legal con la firma del estudio (Claudio Andrade Solutions).
 * Fuera de la portada (`enInicio` en falso) la navegación lleva a
 * `/#seccion`.
 */
@Component({
  selector: 'app-pie',
  imports: [LogoComponent, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pie.html',
  styleUrl: './pie.scss',
})
export class PieComponent {
  /** En falso, los enlaces van a la portada en vez de a esta página. */
  readonly enInicio = input(true);

  protected readonly nav = NAV;
  protected readonly site = SITE;
  protected readonly pie = PIE;
  protected readonly whatsapp = enlaceWhatsapp(SITE.mensajeReunion);
}
