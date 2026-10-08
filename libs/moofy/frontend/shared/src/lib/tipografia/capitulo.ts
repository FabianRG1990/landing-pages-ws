import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * «01 — LA FÁBRICA»: el encabezado que numera cada capítulo. Es el hilo
 * que ordena la página (el patrón de capítulos de claudioandrade.solutions)
 * y el único sitio donde el rojo aparece como texto fuera de un botón.
 */
@Component({
  selector: 'app-capitulo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="capitulo mono">
      <span class="capitulo__num">{{ num() }}</span>
      <span class="capitulo__regla" aria-hidden="true"></span>
      <span class="mono--ink">{{ nombre() }}</span>
    </p>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class CapituloComponent {
  readonly num = input.required<string>();
  readonly nombre = input.required<string>();
}
