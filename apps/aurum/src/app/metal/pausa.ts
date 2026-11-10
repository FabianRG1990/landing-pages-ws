import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Escenario } from '../escenario/escenario';
import { Idioma } from '../i18n/idioma';

/**
 * Pausa del movimiento del fondo (WCAG 2.2.2). En escritorio flota en el
 * margen inferior izquierdo; en móvil vive en la cabecera, porque ahí no
 * tapa contenido.
 */
@Component({
  selector: 'app-pausa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (escenario.conMetal()) {
      @let etiqueta =
        escenario.pausado() ? i18n.t().ui.reanudar : i18n.t().ui.pausar;
      <button
        type="button"
        [class]="'pausa pausa--' + variante()"
        [attr.aria-pressed]="escenario.pausado()"
        [attr.aria-label]="etiqueta"
        [attr.title]="etiqueta"
        (click)="escenario.alternarPausa()"
      >
        @if (escenario.pausado()) {
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 3.5v9l7-4.5z" fill="currentColor" />
          </svg>
        } @else {
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 3.5h2v9H5zM9 3.5h2v9H9z" fill="currentColor" />
          </svg>
        }
      </button>
    }
  `,
  styleUrl: './pausa.scss',
})
export class Pausa {
  protected readonly escenario = inject(Escenario);
  protected readonly i18n = inject(Idioma);
  readonly variante = input<'flotante' | 'cabecera'>('flotante');
}
