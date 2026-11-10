import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

@Component({
  selector: 'app-hero',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t().hero;
    <section
      id="inicio"
      class="seccion hero"
      data-seccion="hero"
      data-tema="oscuro"
      aria-labelledby="hero-titulo"
    >
      <div class="contenedor hero__cuerpo">
        <div class="hero__texto" data-calma data-foco>
          <p class="etiqueta" data-r style="--i: 0">{{ t.etiqueta }}</p>
          <h1 id="hero-titulo" class="display hero__titulo">
            <app-titular [lineas]="t.titulo" [desde]="1" />
          </h1>
          <p class="lead hero__lead" data-r style="--i: 3">{{ t.lead }}</p>
          <div class="hero__acciones" data-r style="--i: 4">
            <a class="boton boton--oro" href="#contacto">
              {{ t.cta }}
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            </a>
            <a class="boton boton--linea" href="#metodo">{{
              t.ctaSecundario
            }}</a>
          </div>
        </div>
      </div>

      <div class="contenedor hero__pie" data-calma data-r style="--i: 6">
        <dl class="hero__datos">
          @for (d of t.datos; track $index) {
            <div class="hero__dato">
              <dt>{{ d.texto }}</dt>
              <dd>{{ d.valor }}</dd>
            </div>
          }
        </dl>
        <a class="hero__desliza" href="#servicios">
          <span>{{ t.desliza }}</span>
          <span class="hero__desliza-linea" aria-hidden="true"></span>
        </a>
      </div>
    </section>
  `,
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly i18n = inject(Idioma);
}
