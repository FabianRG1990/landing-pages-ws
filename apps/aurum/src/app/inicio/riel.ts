import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Escenario } from '../escenario/escenario';
import { Idioma } from '../i18n/idioma';

/**
 * Riel lateral de progreso: cuatro marcas, la activa en oro y con su
 * nombre. Dice dónde se está y cuánto falta sin pedir atención. Solo en
 * pantallas anchas, donde hay margen para él.
 */
@Component({
  selector: 'app-riel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="riel"
      data-texto
      [attr.aria-label]="i18n.t().ui.progreso"
      [attr.data-tema]="escenario.activa() % 2 === 1 ? 'claro' : 'oscuro'"
      [class.riel--oculto]="escenario.activa() === 0"
    >
      @for (item of items(); track item.id; let i = $index) {
        <a
          class="riel__item"
          [href]="'#' + item.id"
          [class.riel__item--activo]="escenario.activa() === i + 1"
          [attr.aria-current]="escenario.activa() === i + 1 ? 'true' : null"
        >
          <span class="riel__nombre">{{ item.nombre }}</span>
          <span class="riel__num">0{{ i + 1 }}</span>
          <span class="riel__marca" aria-hidden="true"></span>
        </a>
      }
    </nav>
  `,
  styleUrl: './riel.scss',
})
export class Riel {
  protected readonly escenario = inject(Escenario);
  protected readonly i18n = inject(Idioma);

  protected readonly items = computed(() => {
    const n = this.i18n.t().nav;
    return [
      { id: 'servicios', nombre: n.servicios },
      { id: 'metodo', nombre: n.metodo },
      { id: 'resultados', nombre: n.resultados },
      { id: 'contacto', nombre: n.demo },
    ];
  });
}
