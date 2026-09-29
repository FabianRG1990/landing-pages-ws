import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NAV, PIE, SITE, enlaceWhatsapp } from '../../data/site';
import { LogoComponent } from '../../marca/logo';
import { IconoComponent } from '../../marca/icono';

/**
 * Pie compacto en tres franjas: la marca con el cierre por WhatsApp; las
 * secciones, el contacto directo y las redes; y lo legal con la firma
 * del estudio (Claudio Andrade Solutions), como en bollería.
 */
@Component({
  selector: 'app-pie',
  imports: [LogoComponent, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pie.html',
  styleUrl: './pie.scss',
})
export class PieComponent {
  protected readonly nav = NAV;
  protected readonly site = SITE;
  protected readonly pie = PIE;
  protected readonly whatsapp = enlaceWhatsapp(SITE.mensajeReunion);
}
