import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
} from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Metal } from '../metal/metal';

@Component({
  selector: 'app-inicio',
  imports: [Metal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-metal />
    <main id="contenido"></main>
  `,
})
export class Inicio {
  protected readonly i18n = inject(Idioma);

  constructor() {
    afterNextRender(() => this.i18n.iniciar());
  }
}
