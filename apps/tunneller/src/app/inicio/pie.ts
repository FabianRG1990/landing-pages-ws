import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

// Destino de cada enlace de las columnas, en el mismo orden que el texto.
const DESTINOS = [
  ['#recorrido', '#control', '#proyectos'],
  ['mailto:', '#demo'],
] as const;

/** Cierre: la llamada a la acción y la base con marca y enlaces. */
@Component({
  selector: 'app-pie',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = i18n.t().pie;
    <footer class="seccion pie" id="demo" data-seccion="pie">
      <div class="contenedor">
        <div class="pie__llamada">
          <h2 class="display pie__titulo" data-r style="--i: 0">
            <app-titular [linea]="p.titulo" />
          </h2>
          <p class="lead pie__lead" data-r style="--i: 1">{{ p.lead }}</p>
          <div class="pie__acciones" data-r style="--i: 2">
            <a class="boton boton--oro" [href]="'mailto:' + p.correo">
              {{ p.cta }}
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
            <a class="pie__correo" [href]="'mailto:' + p.correo">{{
              p.correo
            }}</a>
          </div>
        </div>

        <div class="pie__base">
          <p class="pie__marca">TUNNELLER</p>
          <div class="pie__columnas">
            @for (col of p.columnas; track $index; let c = $index) {
              <div>
                <p class="pie__columna-titulo">{{ col.titulo }}</p>
                <ul>
                  @for (e of col.enlaces; track $index; let j = $index) {
                    <li>
                      <a [href]="destino(c, j, p.correo)">{{ e }}</a>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
          <p class="pie__derechos">{{ p.derechos }}</p>
        </div>
      </div>
    </footer>
  `,
  styleUrl: './pie.scss',
})
export class Pie {
  protected readonly i18n = inject(Idioma);

  protected destino(columna: number, enlace: number, correo: string): string {
    const d = DESTINOS[columna]?.[enlace] ?? '#inicio';
    return d === 'mailto:' ? d + correo : d;
  }
}
