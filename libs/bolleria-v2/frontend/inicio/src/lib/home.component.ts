import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AboutBookComponent } from './about-book.component';
import { AboutBook2026Component } from './about-book-2026.component';
import { DespedidaComponent } from './despedida.component';

/**
 * Que pantallas reciben el libro NUEVO.
 *
 * Son dos condiciones unidas, porque el encargo tenia dos frases: "escritorio,
 * todos los tamanos" y "cualquier pantalla horizontal". Un monitor con la
 * ventana mas alta que ancha cumple la primera y no la segunda, asi que se
 * aplican las dos y basta con una.
 *
 * Lo que queda fuera es lo importante: una pantalla ESTRECHA y EN VERTICAL -o
 * sea, el telefono de pie- sigue con el libro de siempre, sin que se le toque
 * ni un pixel. Esa es la condicion no negociable del encargo.
 */
const LIBRO_NUEVO = '(min-width: 901px), (orientation: landscape)';

@Component({
  selector: 'bol-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutBookComponent, AboutBook2026Component, DespedidaComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * En servidor se sirve el libro ANTERIOR. Es la eleccion conservadora: no hay
   * forma de saber la orientacion antes de pintar, y equivocarse hacia el libro
   * nuevo dejaria al telefono de pie descargando 292 cuadros que no va a usar.
   */
  readonly libroNuevo = signal(false);

  constructor() {
    if (!this.isBrowser) return;
    const mq = window.matchMedia(LIBRO_NUEVO);
    this.libroNuevo.set(mq.matches);
    // Al girar el telefono cambia el libro. Cada uno tiene su geometria y su
    // recorrido, asi que trasladar la pagina exacta entre ambos no seria fiable:
    // el que entra arranca en su primera pagina y el scroll vuelve al principio
    // de la seccion, que es lo unico que deja los dos en un estado coherente.
    mq.addEventListener('change', (ev) => {
      if (ev.matches === this.libroNuevo()) return;
      this.libroNuevo.set(ev.matches);
      this.vuelveAlLibro();
    });
  }

  private vuelveAlLibro(): void {
    // Tras el cambio hay que esperar a que Angular monte el otro componente y
    // la pista nueva mida, o el scroll se recolocaria contra la altura vieja.
    setTimeout(() => {
      const pista = document.querySelector('.bol-libro__pista, .bol-book__track');
      if (!pista) return;
      const top = window.scrollY + pista.getBoundingClientRect().top;
      window.scrollTo({ top, behavior: 'auto' });
    }, 60);
  }
}
