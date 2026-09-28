import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Renglon } from '../data/site';

/**
 * Pinta un titular partido en renglones, con los tramos `em` en cursiva.
 * Va DENTRO del h1/h2, que es quien lleva la semántica y el estilo:
 *
 *   <h2 class="titular" appRevelar><app-renglones [renglones]="x.titulo" /></h2>
 *
 * Cada renglón es su propia máscara de revelado (_motion.scss); por eso
 * los titulares se escriben renglón a renglón en site.ts y no se parten
 * con SplitText, que depende de que la fuente ya haya cargado.
 */
@Component({
  selector: 'app-renglones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (r of renglones(); track $index; let i = $index) {
      <span class="renglon" [style.--r]="i"
        ><span class="renglon__in"
          >@for (t of r; track $index) {
            @if (t.em) {<em>{{ t.t }}</em>} @else {{{ t.t }}}
          }</span
        ></span
      >
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class RenglonesComponent {
  readonly renglones = input.required<readonly Renglon[]>();
}
