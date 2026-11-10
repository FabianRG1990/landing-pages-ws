import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Idioma } from '../i18n/idioma';

const REPOS = ['Ruleta', 'kanban', 'ajedrez', 'macros'] as const;

/** La portada de la app real: «¿En qué repositorio trabajamos hoy?». */
@Component({
  selector: 'app-pantalla-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: contents; }',
  template: `
    @let a = i18n.t().app;
    <div class="app app--inicio">
      <aside class="app-lateral">
        <p class="app-marca">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle
              cx="8"
              cy="8"
              r="6.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
            />
            <path d="M10.6 5.4 9 9 5.4 10.6 7 7z" fill="currentColor" />
          </svg>
          Tunneller
        </p>
        <ul class="app-menu">
          <li class="app-menu__item app-menu__item--activo">
            <span class="app-mas" aria-hidden="true">+</span>{{ a.nuevoChat }}
          </li>
          <li class="app-menu__item">{{ a.canvas }}</li>
          <li class="app-menu__item">{{ a.orquestador }}</li>
        </ul>
      </aside>
      <div class="app-inicio">
        <p class="app-saludo">{{ a.saludo }}</p>
        <div class="app-entrada" [class.app-entrada--lista]="!escribiendo()">
          <p class="app-entrada__texto">
            {{ texto() }}<span class="app-cursor" aria-hidden="true"></span>
          </p>
          <div class="app-entrada__pie">
            <span class="app-chip">Tunneller-Demo/Ruleta</span>
            <span class="app-permisos">{{ a.permisos }}</span>
            <span class="app-enviar" aria-hidden="true">
              <svg viewBox="0 0 16 16">
                <path
                  d="M8 12.5v-9M4 7.5l4-4 4 4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
              </svg>
            </span>
          </div>
        </div>
        <p class="app-repos__t">{{ a.repositorios }} · 4</p>
        <ul class="app-repos">
          <li class="app-repo app-repo--crear">+ {{ a.crear }}</li>
          @for (r of repos; track r) {
            <li class="app-repo" [class.app-repo--activo]="$first">
              <b>Tunneller-Demo/{{ r }}</b
              ><span>{{ a.publico }}</span>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class PantallaInicio {
  protected readonly i18n = inject(Idioma);
  protected readonly repos = REPOS;
  readonly texto = input('');
  readonly escribiendo = input(false);
}
