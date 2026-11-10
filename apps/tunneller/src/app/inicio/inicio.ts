import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { Escenario } from '../escenario/escenario';
import { Idioma } from '../i18n/idioma';
import { Cabecera } from './cabecera';
import { Control } from './control';
import { Hero } from './hero';
import { Pie } from './pie';
import { Proyectos } from './proyectos';
import { Recorrido } from './recorrido';

/** La landing: hero, recorrido, control, proyectos y pie. */
@Component({
  selector: 'app-inicio',
  imports: [Cabecera, Hero, Recorrido, Control, Proyectos, Pie],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="saltar" href="#contenido">{{ i18n.t().ui.saltar }}</a>
    <app-cabecera />
    <main id="contenido">
      <app-hero />
      <app-recorrido />
      <app-control />
      <app-proyectos />
    </main>
    <app-pie />
  `,
})
export class Inicio {
  protected readonly i18n = inject(Idioma);
  private readonly escenario = inject(Escenario);

  constructor() {
    afterNextRender(() => {
      this.i18n.iniciar();
      this.escenario.iniciar();
    });
    inject(DestroyRef).onDestroy(() => this.escenario.detener());
  }
}
