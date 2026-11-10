import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Linea, Trozo } from '../i18n/textos';

/**
 * Los renglones de un titular. Cada renglón sube desde su propia máscara,
 * escalonado por --i a partir de `desde`. Va dentro del <h1>/<h2>, que es
 * quien da la semántica.
 */
@Component({
  selector: 'app-titular',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (linea of lineas(); track $index) {
      <span class="linea">
        <!-- Los espacios entre trozos viajan dentro del texto; Angular quita
             los nodos que solo tienen espacios del formato. -->
        <span data-r [style.--i]="desde() + $index">
          @for (trozo of linea; track $index) {
            @if (oro(trozo); as palabra) {
              <span class="oro">{{ palabra }}</span>
            } @else {
              <ng-container>{{ trozo }}</ng-container>
            }
          }
        </span>
      </span>
    }
  `,
  styles: ':host { display: contents; }',
})
export class Titular {
  readonly lineas = input.required<readonly Linea[]>();
  readonly desde = input(0);

  protected oro(trozo: Trozo): string | null {
    return typeof trozo === 'string' ? null : trozo.oro;
  }
}
