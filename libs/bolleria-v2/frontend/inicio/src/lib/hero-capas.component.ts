import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore, waDirectLink } from '@bolleria-v2-ui-shared';

/**
 * Hero de la v2: la escena de obrador separada en capas, con la profundidad ya
 * horneada en cada una.
 *
 * Sustituye a `HeroScrollComponent`, que capturaba el scroll durante 700vh para
 * reproducir 233 cuadros (90,4 MB de descarga antes de enseñar nada). Aquí el
 * mensaje está completo desde el primer fotograma.
 *
 * Las capas salen de la propia imagen aprobada, no de una escena regenerada:
 * apiladas reproducen el original sin un solo píxel al descubierto. Un primer
 * intento con capas generadas aparte quedó a un 56,7 % de la referencia -otra
 * distancia de cámara, el pan mucho más grande- y no servía.
 *
 * De qué sirven las capas aquí: la profundidad no se simula moviendo cosas, se
 * construye tratando cada plano por separado y horneando el resultado. Sobre la
 * imagen plana esto es imposible -un desenfoque del fondo hace sangrar el pan
 * sobre el muro y deja halo-; con el fondo aislado, el borde del pan queda
 * nítido contra un fondo suave, que es lo que hace un objetivo real. Lo mismo
 * con el color: lo lejano pierde saturación y se enfría, lo cercano gana cuerpo.
 * Medido, la separación entre el pan y el muro pasa de 2,76x a 4,92x en color y
 * de 3,86x a 4,85x en detalle.
 *
 * El desenfoque del fondo no se decide sólo por la máscara del bodegón: se
 * multiplica además por lo poco nítido que ya está cada píxel. Un píxel con
 * detalle propio no se desenfoca nunca, así que el borde de la máscara no puede
 * partir un objeto en dos nitideces. Sin ese candado la máscara dejaba fuera el
 * ramo de flores por la mitad, la balda de panes y la pizarra, y se veían
 * desiguales.
 *
 * Se probó también mover las capas con el ratón, con un modelo de cámara real.
 * Funcionaba -el fondo clavado, el primer plano abriéndose- pero se descartó: la
 * profundidad tenía que estar en la imagen, no en el movimiento. Queda sólo el
 * paralaje de scroll del olivo, que ya existía.
 */
@Component({
  selector: 'bol-hero-capas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-capas.component.html',
  styleUrl: './hero-capas.component.scss',
})
export class HeroCapasComponent implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly store = inject(BolleriaStore);
  readonly waDirect = waDirectLink();

  /**
   * El olivo del primer plano, lo único que se mueve. `vel` es la fracción de la
   * altura del hero que recorre la capa con el scroll; en negativo sube.
   *
   * Las dos llevan horneado un desenfoque mayor que el del fondo: están más cerca
   * que el plano de foco, y ese desenfoque de primer plano es la firma de la
   * fotografía de producto cara. El fondo lleva reconstruido lo que tapaban, así
   * que pueden desplazarse sin descubrir ningún hueco.
   */
  readonly capas = [
    { src: 'assets/hero-capas/hero-rama.webp', vel: 0.028 },
    { src: 'assets/hero-capas/hero-hojas.webp', vel: -0.045 },
  ];

  private rafId = 0;
  private pendiente = false;
  private ultimoP = -1;
  private readonly onScroll = () => this.pedirCuadro();

  constructor() {
    if (!this.isBrowser) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reducido) return;
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });
    this.pedirCuadro();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  /** Coalesce de eventos: como mucho un recálculo por fotograma. */
  private pedirCuadro(): void {
    if (this.pendiente) return;
    this.pendiente = true;
    this.rafId = requestAnimationFrame(() => {
      this.pendiente = false;
      this.aplicar();
    });
  }

  /**
   * Escribe una sola propiedad en el host y deja que las capas se recalculen
   * solas en CSS. El progreso es fraccionario a propósito: cuantizarlo produciría
   * escalones visibles en las capas lentas.
   */
  private aplicar(): void {
    const alto = window.innerHeight || 1;
    const p = Math.min(1, Math.max(0, window.scrollY / alto));
    if (Math.abs(p - this.ultimoP) < 0.0005) return;
    this.ultimoP = p;
    this.host.nativeElement.style.setProperty('--p', p.toFixed(4));
  }

  irAlMenu(): void {
    this.store.go('menu');
  }
}
