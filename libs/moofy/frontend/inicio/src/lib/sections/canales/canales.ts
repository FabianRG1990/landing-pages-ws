import { ChangeDetectionStrategy, Component, ElementRef, computed, signal, viewChildren } from '@angular/core';
import { CANALES } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';

/**
 * Capítulo 03: el comprador elige su canal y ve qué le resolvemos.
 *
 * Patrón de pestañas de WAI-ARIA con activación automática: el panel es
 * instantáneo, así que mover el foco con las flechas ya muestra el canal.
 * Tabindex itinerante (solo la pestaña activa entra en el orden de Tab),
 * flechas en los dos ejes porque la lista es vertical en escritorio y
 * horizontal en móvil, e Inicio/Fin para los extremos.
 */
@Component({
  selector: 'app-canales',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './canales.html',
  styleUrl: './canales.scss',
})
export class CanalesComponent {
  protected readonly c = CANALES;
  protected readonly indice = signal(0);
  protected readonly activo = computed(() => this.c.items[this.indice()]);

  /** Varias pestañas comparten foto: se pinta cada archivo una sola vez. */
  protected readonly imagenes = [...new Set(this.c.items.map((i) => i.imagen))].map((src) => ({ src }));

  private readonly pestanas = viewChildren<ElementRef<HTMLButtonElement>>('pestana');

  protected elegir(i: number): void {
    this.indice.set(i);
  }

  protected teclado(e: KeyboardEvent): void {
    const n = this.c.items.length;
    const actual = this.indice();
    let destino: number;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        destino = (actual + 1) % n;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        destino = (actual - 1 + n) % n;
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.indice.set(destino);
    const boton = this.pestanas()[destino]?.nativeElement;
    boton?.focus();
    // En móvil la fila de chips se desplaza para que el elegido se vea.
    boton?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
