import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Lo que el velo esta haciendo. `fuera` no pinta nada. */
export type FaseVelo = 'fuera' | 'puesto' | 'saliendo';

/**
 * El velo del giro: tapa el relevo entre los dos libros.
 *
 * Al girar el telefono cambia el libro entero -se destruye uno y se construye
 * el otro, con su geometria, su pista y sus cuadros-, y eso no se puede hacer a
 * la vista: el cliente al que se le acaba de pedir "gira el telefono" no puede
 * encontrarse el montaje. Asi que se cubre con papel, se hace el relevo detras
 * y se destapa cuando el otro libro ya esta listo.
 *
 * Cubre DE GOLPE y se va con calma, y esa asimetria esta medida: con un
 * fundido de entrada de 140 ms se colaban a la vista los primeros redibujados
 * del libro que se va -la ventana ya ha cambiado de forma y el todavia esta
 * ahi-. Tapar tiene que ganarle al desorden; destapar es una entrega, y ahi si
 * hay 180 ms de fundido. Tampoco compite con la cortina del horno que separa
 * PAGINAS: aquella es un viaje y se puede permitir 2,4 s; esto es un parpadeo
 * dentro de la misma pagina.
 *
 * No decide nada: `home` lleva el tiempo, porque es quien sabe cuando el libro
 * que entra ha terminado de medirse.
 */
@Component({
  selector: 'bol-velo-giro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './velo-giro.component.html',
  styleUrl: './velo-giro.component.scss',
  host: {
    '[class.esta-puesto]': "fase() === 'puesto'",
    '[class.se-va]': "fase() === 'saliendo'",
    'aria-hidden': 'true',
  },
})
export class VeloGiroComponent {
  readonly fase = input<FaseVelo>('fuera');
}
