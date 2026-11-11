import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

/**
 * Control: cuatro piezas de la app que demuestran que la IA no decide
 * sola. Cada tarjeta enseña el control real (el interruptor, los tres
 * botones, la línea «Revertir», los enlaces a GitHub) y se activa al
 * entrar la sección.
 */
@Component({
  selector: 'app-control',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = i18n.t().control;
    @let e = i18n.t().pantallas.especificacion;
    <section class="seccion seccion--oscura" id="control" data-seccion="control">
      <div class="contenedor">
        <header class="cabeza-seccion">
          <p class="etiqueta" data-r style="--i: 0">{{ c.etiqueta }}</p>
          <h2 class="titulo" data-r style="--i: 1">
            <app-titular [linea]="c.titulo" />
          </h2>
          <p class="lead" data-r style="--i: 2">{{ c.lead }}</p>
        </header>

        <ul class="rejilla">
          <li class="tarjeta" data-r style="--i: 3">
            <div class="muestra" aria-hidden="true">
              <p class="interruptor">
                <span class="interruptor__riel"><i></i></span
                >{{ c.piloto.etiqueta }}
              </p>
              <p class="contador">{{ c.piloto.auto }} <b>3</b></p>
            </div>
            <h3 class="tarjeta__titulo">{{ c.piloto.titulo }}</h3>
            <p class="tarjeta__texto">{{ c.piloto.texto }}</p>
          </li>

          <li class="tarjeta" data-r style="--i: 4">
            <div class="muestra" aria-hidden="true">
              <p class="botones">
                <span class="b b--si">✓ {{ e.aprobar }}</span>
                <span class="b">{{ e.cambios }}</span>
                <span class="b b--no">{{ e.detener }}</span>
              </p>
            </div>
            <h3 class="tarjeta__titulo">{{ c.aprobar.titulo }}</h3>
            <p class="tarjeta__texto">{{ c.aprobar.texto }}</p>
          </li>

          <li class="tarjeta" data-r style="--i: 5">
            <div class="muestra muestra--texto" aria-hidden="true">
              <p>{{ c.revertir.ejemplo }}</p>
              <p class="revertir">{{ c.revertir.accion }}</p>
            </div>
            <h3 class="tarjeta__titulo">{{ c.revertir.titulo }}</h3>
            <p class="tarjeta__texto">{{ c.revertir.texto }}</p>
          </li>

          <li class="tarjeta" data-r style="--i: 6">
            <div class="muestra muestra--lista" aria-hidden="true">
              @for (x of c.github.items; track $index) {
                <p>
                  <svg viewBox="0 0 16 16">
                    <path
                      d="M8 .2a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7 0-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.6 4 .3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 .2z"
                      fill="currentColor"
                    />
                  </svg>
                  {{ x }}
                  @if ($index > 0) {
                    <span class="ok">✓</span>
                  }
                </p>
              }
            </div>
            <h3 class="tarjeta__titulo">{{ c.github.titulo }}</h3>
            <p class="tarjeta__texto">{{ c.github.texto }}</p>
          </li>
        </ul>
      </div>
    </section>
  `,
  styleUrl: './control.scss',
})
export class Control {
  protected readonly i18n = inject(Idioma);
}
