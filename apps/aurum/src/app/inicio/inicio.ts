import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Metal } from '../metal/metal';
import { Hero } from './hero';
import { Metodo } from './metodo';
import { Pie } from './pie';
import { Resultados } from './resultados';
import { Servicios } from './servicios';

/**
 * La landing: cuatro segmentos y el pie, alternando grafito y acero.
 * Hero (oscuro) · Servicios (claro) · Método (oscuro) · Resultados (claro)
 * · Pie (oscuro). El metal es una sola capa fija detrás de todo.
 */
@Component({
  selector: 'app-inicio',
  imports: [Metal, Hero, Servicios, Metodo, Resultados, Pie],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="saltar" href="#contenido">{{ i18n.t().ui.saltar }}</a>
    <app-metal />
    <main id="contenido">
      <app-hero />
      <app-servicios />
      <app-metodo />
      <app-resultados />
    </main>
    <app-pie />
  `,
})
export class Inicio {
  protected readonly i18n = inject(Idioma);

  constructor() {
    afterNextRender(() => this.i18n.iniciar());
  }
}
