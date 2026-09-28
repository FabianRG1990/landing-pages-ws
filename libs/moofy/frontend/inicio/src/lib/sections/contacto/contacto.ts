import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CANALES, CONTACTO, SITE, enlaceWhatsapp, mensajeCanal } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';

/**
 * Capítulo 05: la conversión. Sin formulario (no hay backend y un
 * formulario B2B largo espanta): el comprador elige su canal y el enlace
 * abre WhatsApp Business de Moofy con el mensaje ya redactado para él.
 * Sin elegir canal, el mensaje es el genérico: el botón nunca queda muerto.
 */
@Component({
  selector: 'app-contacto',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacto.html',
  styleUrl: './contacto.scss',
})
export class ContactoComponent {
  protected readonly k = CONTACTO;
  protected readonly site = SITE;
  protected readonly canales = CANALES.items;

  protected readonly canal = signal<string | null>(null);
  protected readonly whatsapp = computed(() => enlaceWhatsapp(mensajeCanal(this.canal())));
  protected readonly visita = enlaceWhatsapp(SITE.mensajeVisita);
}
