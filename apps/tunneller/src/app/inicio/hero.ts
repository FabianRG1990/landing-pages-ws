import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

/**
 * Hero: la primera pantalla entera. El titular, el texto y las dos
 * acciones, centrados sobre el metal líquido del fondo, que aquí es el
 * protagonista. Abajo, una señal de scroll: una gota de luz que baja por
 * un hilo. La app se ve completa y trabajando justo debajo, en el
 * recorrido.
 */
@Component({
  selector: 'app-hero',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let h = i18n.t().hero;
    <section class="hero seccion--oscura" id="inicio" data-seccion="hero">
      <div class="contenedor hero__texto">
        <p class="etiqueta" data-r style="--i: 0">{{ h.etiqueta }}</p>
        <h1 class="display hero__titulo" data-r style="--i: 1">
          <app-titular [linea]="h.titulo" />
        </h1>
        <p class="lead hero__lead" data-r style="--i: 2">{{ h.lead }}</p>
        <div class="hero__acciones" data-r style="--i: 3">
          <a class="boton boton--oro" href="#demo">
            {{ h.cta }}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              aria-hidden="true"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
          <a class="boton boton--linea" href="#recorrido">{{
            h.ctaSecundario
          }}</a>
        </div>
      </div>
      <span class="hero__bajar" aria-hidden="true" data-r style="--i: 5"
        ><i></i
      ></span>
    </section>
  `,
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly i18n = inject(Idioma);
}
