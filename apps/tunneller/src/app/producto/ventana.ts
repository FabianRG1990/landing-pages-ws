import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Pantalla } from './pantalla';
import { Proceso } from './proceso';

/**
 * La ventana de la app en el recorrido: cabecera con el repositorio y la
 * pestaña, las cinco escenas apiladas (se ve la de la etapa actual) y el
 * panel de proceso a la derecha.
 */
@Component({
  selector: 'app-ventana',
  imports: [Pantalla, Proceso],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: contents; }',
  template: `
    @let a = i18n.t().app;
    <div class="app app--ventana">
      <header class="app-barra">
        <span class="app-barra__repo">{{
          etapa() === 4 ? 'Tunneller-Demo/ajedrez' : 'Tunneller-Demo/Ruleta'
        }}</span>
        <span class="app-barra__pestana" data-texto>{{
          a.pestanas[etapa()]
        }}</span>
        <span class="app-estado" [class.app-estado--hecho]="etapa() === 4">
          <i aria-hidden="true"></i>{{ a.estados[etapa()] }}
        </span>
      </header>
      <div class="app-cuerpo">
        <div class="app-escenas">
          @for (i of etapas; track i) {
            <app-pantalla
              [etapa]="i"
              [activa]="etapa() === i"
              [class.actual]="etapa() === i"
            />
          }
        </div>
        <app-proceso [etapa]="etapa()" />
      </div>
    </div>
  `,
})
export class Ventana {
  protected readonly i18n = inject(Idioma);
  protected readonly etapas = [0, 1, 2, 3, 4] as const;
  readonly etapa = input(0);
}
