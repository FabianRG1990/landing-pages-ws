import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NAV, PIE, SITE, enlaceWhatsapp } from '../../data/site';
import { LogoComponent } from '../../marca/logo';

/** Pie: la marca, las secciones, el contacto directo y lo legal. */
@Component({
  selector: 'app-pie',
  imports: [LogoComponent],
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
