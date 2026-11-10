import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

/**
 * Servicios: cada fila se enciende al subir (--avance, que solo crece) y
 * un trazo de latón se llena debajo de ella. Se lee de arriba abajo, en el
 * orden en que llega a la vista.
 */
@Component({
  selector: 'app-servicios',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t().servicios;
    <section
      id="servicios"
      class="seccion"
      data-seccion="servicios"
      data-tema="claro"
      aria-labelledby="servicios-titulo"
    >
      <div class="contenedor">
        <header class="servicios__cabeza" data-calma data-foco>
          <div>
            <p class="etiqueta" data-r style="--i: 0">{{ t.etiqueta }}</p>
            <h2 id="servicios-titulo" class="titulo servicios__titulo">
              <app-titular [lineas]="t.titulo" [desde]="1" />
            </h2>
          </div>
          <p class="lead" data-r style="--i: 3">{{ t.lead }}</p>
        </header>

        <ol class="servicios__lista" data-calma>
          @for (s of t.items; track $index) {
            <li class="servicio" data-avance>
              <span class="servicio__num">0{{ $index + 1 }}</span>
              <h3 class="servicio__titulo">{{ s.titulo }}</h3>
              <p class="servicio__texto">{{ s.texto }}</p>
              <p class="servicio__canales">{{ s.canales }}</p>
              <span class="servicio__trazo" aria-hidden="true"></span>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
  styleUrl: './servicios.scss',
})
export class Servicios {
  protected readonly i18n = inject(Idioma);
}
