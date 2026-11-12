import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { afterNextRender } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { SelectorIdioma } from './selector-idioma';

/**
 * Cabecera fija. Al bajar gana un velo gris translúcido para que el
 * contenido que pasa por debajo no se mezcle con los enlaces.
 */
@Component({
  selector: 'app-cabecera',
  imports: [SelectorIdioma],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t();
    <header class="cabecera" [class.cabecera--fondo]="desplazado()">
      <div class="contenedor cabecera__fila">
        <a class="marca" href="#inicio" [attr.aria-label]="t.ui.inicio">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <defs>
              <linearGradient id="marca-oro" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#c9a66b" />
                <stop offset="1" stop-color="#6f5530" />
              </linearGradient>
            </defs>
            <path
              d="M5 27V16a11 11 0 0 1 22 0v11h-4V16a7 7 0 0 0-14 0v11z"
              fill="url(#marca-oro)"
            />
            <path
              d="M13 27V16a3 3 0 0 1 6 0v11z"
              fill="url(#marca-oro)"
              opacity=".5"
            />
          </svg>
          <span>CONTEXT DEV</span>
        </a>
        <nav
          class="cabecera__nav"
          [attr.aria-label]="t.ui.navegacion"
          data-texto
        >
          <a href="#recorrido">{{ t.nav.recorrido }}</a>
          <a href="#control">{{ t.nav.control }}</a>
          <a href="#proyectos">{{ t.nav.proyectos }}</a>
        </nav>
        <div class="cabecera__acciones">
          <app-selector-idioma />
          <a
            class="boton boton--oro boton--chico cabecera__demo"
            href="#demo"
            data-texto
            >{{ t.nav.demo }}</a
          >
        </div>
      </div>
    </header>
  `,
  styleUrl: './cabecera.scss',
})
export class Cabecera {
  protected readonly i18n = inject(Idioma);
  protected readonly desplazado = signal(false);

  constructor() {
    afterNextRender(() => {
      const leer = () => this.desplazado.set(window.scrollY > 12);
      leer();
      window.addEventListener('scroll', leer, { passive: true });
    });
  }
}
