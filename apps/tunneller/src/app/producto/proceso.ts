import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Idioma } from '../i18n/idioma';

// Por cada etapa del recorrido: cuántos pasos del panel están hechos y
// cuál está en curso (−1: ninguno, el proyecto terminó).
const HECHOS = [0, 3, 4, 5, 7] as const;
const ACTUAL = [0, 3, 4, 5, -1] as const;

/** El panel «Proceso» de la app: de Destino a Proyecto terminado. */
@Component({
  selector: 'app-proceso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: contents; }',
  template: `
    @let a = i18n.t().app;
    <aside class="app-proceso" aria-hidden="true">
      <p class="app-proceso__t">{{ a.proceso }}</p>
      <ol>
        @for (e of a.etapas; track $index) {
          @let esHecho = $index < hechos();
          @let esActual = $index === actual();
          <li [class.hecho]="esHecho" [class.actual]="esActual">
            <span class="app-proceso__icono">
              @if (esHecho) {
                <svg viewBox="0 0 16 16">
                  <path
                    d="M4.5 8.2l2.3 2.3 4.7-4.9"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                  />
                </svg>
              }
            </span>
            <span class="app-proceso__texto">
              {{ e }}
              <small>{{
                esHecho ? a.hecho : esActual ? a.enCurso : a.pendiente
              }}</small>
            </span>
          </li>
        }
      </ol>
    </aside>
  `,
})
export class Proceso {
  protected readonly i18n = inject(Idioma);
  readonly etapa = input(0);
  protected readonly hechos = computed(() => HECHOS[this.etapa()] ?? 0);
  protected readonly actual = computed(() => ACTUAL[this.etapa()] ?? -1);
}
