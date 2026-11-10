import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

@Component({
  selector: 'app-pie',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t().pie;
    <footer
      id="contacto"
      class="seccion pie"
      data-seccion="pie"
      data-tema="oscuro"
      aria-labelledby="pie-titulo"
    >
      <div class="contenedor">
        <div class="pie__llamada" data-calma data-foco>
          <h2 id="pie-titulo" class="display pie__titulo">
            <app-titular [lineas]="t.titulo" />
          </h2>
          <p class="lead pie__lead" data-r style="--i: 2">{{ t.lead }}</p>
          <div class="pie__acciones" data-r style="--i: 3">
            <a class="boton boton--oro" [href]="'mailto:' + t.correo">
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
            <a class="pie__correo" [href]="'mailto:' + t.correo">{{
              t.correo
            }}</a>
          </div>
        </div>

        <div class="pie__base" data-calma data-r style="--i: 4">
          <div class="pie__marca">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path
                d="M5 26 16 5l11 21h-5.4L16 15l-5.6 11z"
                fill="currentColor"
              />
            </svg>
            <span>AURUM</span>
          </div>
          <nav class="pie__columnas" [attr.aria-label]="t.demo">
            @for (c of t.columnas; track $index) {
              <div>
                <p class="pie__columna-titulo">{{ c.titulo }}</p>
                <ul>
                  @for (e of c.enlaces; track $index) {
                    <li>
                      <a href="#inicio">{{ e }}</a>
                    </li>
                  }
                </ul>
              </div>
            }
          </nav>
          <p class="pie__derechos">{{ t.derechos }}</p>
        </div>
      </div>
    </footer>
  `,
  styleUrl: './pie.scss',
})
export class Pie {
  protected readonly i18n = inject(Idioma);
}
