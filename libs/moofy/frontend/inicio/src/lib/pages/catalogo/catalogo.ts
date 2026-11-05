import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { NavComponent } from '@moofy-ui-shared/layout/nav/nav';
import { PieComponent } from '@moofy-ui-shared/layout/pie/pie';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import {
  CATALOGO,
  LINEAS,
  PRODUCTOS,
  SITE,
  enlaceWhatsapp,
  foto800,
  mensajeProducto,
} from '@moofy-ui-shared/data/site';

/**
 * El catálogo completo (/catalogo): los veinte productos agrupados en
 * las seis líneas de la portada, con un índice de líneas que se queda
 * pegado bajo la barra y un botón de muestras por producto.
 *
 * Es una página aparte y no un modal: tiene su propia dirección (se
 * comparte, se guarda y el botón «atrás» funciona) y se prerenderiza
 * como la portada. No usa el scroll suave ni las escenas de GSAP de la
 * portada: es una página para leer, con scroll nativo.
 *
 * Los productos sin foto llevan la «M» de Moofy sobre el color de la
 * línea; no se inventa ninguna imagen.
 */
@Component({
  selector: 'app-catalogo',
  imports: [NavComponent, PieComponent, IconoComponent, RenglonesComponent, RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class CatalogoComponent {
  protected readonly c = CATALOGO;
  protected readonly foto800 = foto800;
  protected readonly whatsapp = enlaceWhatsapp(SITE.mensajeReunion);
  protected readonly total = PRODUCTOS.length;

  /** Cada línea con sus productos, en el orden de la portada. */
  protected readonly grupos = LINEAS.items.map((linea, i) => ({
    ...linea,
    num: String(i + 1).padStart(2, '0'),
    productos: PRODUCTOS.filter((p) => p.linea === linea.id),
  }));

  constructor() {
    inject(Meta).updateTag({ name: 'description', content: CATALOGO.descripcionPagina });
  }

  /**
   * Lleva a una línea sin recargar: con <base href="/"> un «#ancla» suelto
   * apuntaría a la portada, y según cómo se entró (/catalogo o
   * /catalogo/) el enlace de respaldo podría recargar la página. El foco
   * pasa al título de la línea, para el teclado y el lector de pantalla.
   */
  protected ir(evento: Event, id: string): void {
    const destino = document.getElementById('linea-' + id);
    if (!destino) return;
    evento.preventDefault();
    const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    destino.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    history.replaceState(null, '', location.pathname + '#linea-' + id);
    destino.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }

  protected muestras(producto: string): string {
    return enlaceWhatsapp(mensajeProducto(producto));
  }
}
