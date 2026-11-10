import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Escenario } from '../escenario/escenario';
import { Idioma } from '../i18n/idioma';
import { Pausa } from '../metal/pausa';
import { SelectorIdioma } from './selector-idioma';

/**
 * Cabecera fija. Toma el tema de la sección que tiene debajo, así nunca
 * queda texto claro sobre fondo claro. No es vidrio: al bajar gana un
 * degradado del color de fondo, que la separa del contenido sin un borde.
 */
@Component({
  selector: 'app-cabecera',
  imports: [SelectorIdioma, Pausa],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="cabecera"
      data-texto
      [attr.data-tema]="escenario.temaCabecera()"
      [class.cabecera--desplazada]="escenario.desplazado()"
    >
      <div class="contenedor cabecera__fila">
        <a class="marca" href="#inicio" [attr.aria-label]="i18n.t().ui.inicio">
          <svg class="marca__simbolo" viewBox="0 0 32 32" aria-hidden="true">
            <defs>
              <linearGradient id="marca-oro" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#efe0c0" />
                <stop offset="0.5" stop-color="#c8a46a" />
                <stop offset="1" stop-color="#8a6d40" />
              </linearGradient>
            </defs>
            <path
              d="M5 26 16 5l11 21h-5.4L16 15l-5.6 11z"
              fill="url(#marca-oro)"
            />
          </svg>
          <span class="marca__nombre">AURUM</span>
        </a>

        <nav class="cabecera__nav" [attr.aria-label]="i18n.t().ui.navegacion">
          <a href="#servicios">{{ i18n.t().nav.servicios }}</a>
          <a href="#metodo">{{ i18n.t().nav.metodo }}</a>
          <a href="#resultados">{{ i18n.t().nav.resultados }}</a>
        </nav>

        <div class="cabecera__acciones">
          <app-pausa variante="cabecera" />
          <app-selector-idioma />
          <a class="boton boton--oro cabecera__cta" href="#contacto">{{
            i18n.t().nav.demo
          }}</a>
        </div>
      </div>
    </header>
  `,
  styleUrl: './cabecera.scss',
})
export class Cabecera {
  protected readonly escenario = inject(Escenario);
  protected readonly i18n = inject(Idioma);
}
