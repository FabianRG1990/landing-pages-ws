import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Linea, Trozo } from '../i18n/textos';

/**
 * El texto de un titular con su palabra de oro. Va dentro del <h1>/<h2>,
 * que es quien da la semántica y la animación de entrada.
 */
@Component({
  selector: 'app-titular',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Los espacios entre trozos viajan dentro del texto; Angular quita
         los nodos que solo tienen espacios del formato. -->
    @for (trozo of linea(); track $index) {
      @if (oro(trozo); as palabra) {
        <span class="oro">{{ palabra }}</span>
      } @else {
        <ng-container>{{ trozo }}</ng-container>
      }
    }
  `,
  styles: ':host { display: contents; }',
})
export class Titular {
  readonly linea = input.required<Linea>();

  protected oro(trozo: Trozo): string | null {
    return typeof trozo === 'string' ? null : trozo.oro;
  }
}
