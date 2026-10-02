import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore } from '@bolleria-v2-ui-shared';

/**
 * Cierre de la PORTADA, en lugar del pie de página.
 *
 * El pie completo (cuatro columnas, WhatsApp, navegación) sigue existiendo en
 * Menú y Contacto; aquí se retira a petición del dueño del sitio y este bloque
 * ocupa su lugar: una despedida corta con un versículo, bajo el libro.
 *
 * No queda sin acceso a WhatsApp: la última página del libro dibuja sus propios
 * botones de ubicación y mensaje (ver `drawSocialButton` en about-book).
 *
 * ENTRA CUANDO EL LIBRO SE HA CERRADO, no cuando llega el scroll. El libro
 * persigue al scroll una vuelta detrás de otra, así que bajando deprisa la
 * despedida asomaba con el libro todavía pasando hojas o bajando la tapa.
 * Ahora espera a `libroCerrado` y a estar a la vista, y entonces entra pieza a
 * pieza (ver el SCSS). Si el libro se reabre, se retira.
 */
@Component({
  selector: 'bol-despedida',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './despedida.component.html',
  styleUrl: './despedida.component.scss',
  host: {
    '[class.es-espera]': "fase() === 'espera'",
    '[class.es-dentro]': "fase() === 'dentro'",
  },
})
export class DespedidaComponent {
  private readonly store = inject(BolleriaStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Si el bloque ha llegado a la pantalla. */
  private readonly aLaVista = signal(false);

  /**
   * Se queda en true una vez que ha entrado, aunque el bloque salga de la
   * pantalla: volver a subir un poco no tiene que repetir la entrada. Solo la
   * deshace que el libro se reabra.
   */
  private readonly entro = signal(false);

  /**
   * - libre: ningún libro manda (en el servidor, o sin cargar); se ve sin más.
   * - espera: el libro no ha terminado de cerrarse; invisible.
   * - dentro: libro cerrado y bloque a la vista; entra.
   */
  readonly fase = computed<'libre' | 'espera' | 'dentro'>(() => {
    const cerrado = this.store.libroCerrado();
    if (cerrado === null) return 'libre';
    return cerrado && this.entro() ? 'dentro' : 'espera';
  });

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    effect(() => {
      const cerrado = this.store.libroCerrado();
      if (cerrado === false) this.entro.set(false);
      else if (cerrado && this.aLaVista()) this.entro.set(true);
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const bloque = this.host.nativeElement.querySelector('.bol-despedida__inner');
      if (!bloque) return;
      // Cuenta como a la vista cuando el bloque asoma por encima del 15 % de
      // abajo de la pantalla: entrar pegado al borde inferior se perdería.
      const io = new IntersectionObserver(([e]) => this.aLaVista.set(e.isIntersecting), {
        rootMargin: '0px 0px -15% 0px',
      });
      io.observe(bloque);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
