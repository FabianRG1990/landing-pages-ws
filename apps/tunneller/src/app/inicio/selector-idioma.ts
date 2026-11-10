import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';

/**
 * Interruptor ES/EN: una perla de champán que se desliza sobre un riel de
 * platino cepillado. Al pasar el cursor la perla se inclina hacia la otra
 * opción; al cambiar, un brillo la cruza una vez. Son dos botones con
 * aria-pressed: se usan con teclado y los lee cualquier lector.
 */
@Component({
  selector: 'app-selector-idioma',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="idioma"
      role="group"
      [attr.aria-label]="i18n.t().ui.grupoIdioma"
      [class.idioma--en]="i18n.codigo() === 'en'"
    >
      <span class="idioma__perla" aria-hidden="true"></span>
      <button
        type="button"
        class="idioma__opcion"
        lang="es"
        [attr.aria-pressed]="i18n.codigo() === 'es'"
        (click)="i18n.cambiar('es')"
      >
        <span aria-hidden="true">ES</span
        ><span class="solo-lector">Español</span>
      </button>
      <button
        type="button"
        class="idioma__opcion"
        lang="en"
        [attr.aria-pressed]="i18n.codigo() === 'en'"
        (click)="i18n.cambiar('en')"
      >
        <span aria-hidden="true">EN</span
        ><span class="solo-lector">English</span>
      </button>
    </div>
  `,
  styleUrl: './selector-idioma.scss',
})
export class SelectorIdioma {
  protected readonly i18n = inject(Idioma);
}
