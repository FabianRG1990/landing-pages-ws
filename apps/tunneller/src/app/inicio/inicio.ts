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
import { Hero } from './hero';
import { Recorrido } from './recorrido';

/** La landing: cabecera, hero y recorrido; el resto llega después. */
@Component({
  selector: 'app-inicio',
  imports: [Cabecera, Hero, Recorrido],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="saltar" href="#contenido">{{ i18n.t().ui.saltar }}</a>
    <app-cabecera />
    <main id="contenido">
      <app-hero />
      <app-recorrido />
    </main>
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
