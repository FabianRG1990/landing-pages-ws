import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

/**
 * Método: tres pasos unidos por una línea que se dibuja con el scroll.
 * Cada paso se enciende cuando la línea llega a él, así el ojo sigue el
 * orden 1 → 2 → 3 sin tener que buscarlo.
 */
@Component({
  selector: 'app-metodo',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t().metodo;
    <section
      id="metodo"
      class="seccion metodo"
      data-seccion="metodo"
      data-tema="oscuro"
      aria-labelledby="metodo-titulo"
    >
      <div class="contenedor">
        <header class="metodo__cabeza" data-calma data-foco>
          <p class="etiqueta" data-r style="--i: 0">{{ t.etiqueta }}</p>
          <h2 id="metodo-titulo" class="titulo metodo__titulo">
            <app-titular [lineas]="t.titulo" [desde]="1" />
          </h2>
          <p class="lead metodo__lead" data-r style="--i: 3">{{ t.lead }}</p>
        </header>

        <ol class="metodo__pasos" data-avance data-calma>
          @for (p of t.pasos; track $index) {
            <li class="paso" [style.--n]="$index">
              <span class="paso__nodo" aria-hidden="true"></span>
              <p class="paso__plazo">{{ p.plazo }}</p>
              <h3 class="paso__titulo">
                <span class="paso__num">0{{ $index + 1 }}</span
                >{{ p.titulo }}
              </h3>
              <p class="paso__texto">{{ p.texto }}</p>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
  styleUrl: './metodo.scss',
})
export class Metodo {
  protected readonly i18n = inject(Idioma);
}
