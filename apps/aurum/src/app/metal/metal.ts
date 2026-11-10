import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { Escenario } from '../escenario/escenario';
import { Pausa } from './pausa';

/**
 * La capa fija del metal. El lienzo no existe para lectores de pantalla y
 * aparece con un fundido solo cuando ya tiene un fotograma dibujado.
 */
@Component({
  selector: 'app-metal',
  imports: [Pausa],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #lienzo class="metal" aria-hidden="true"></canvas>
    <app-pausa />
  `,
  styleUrl: './metal.scss',
})
export class Metal {
  private readonly escenario = inject(Escenario);
  private readonly lienzo =
    viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => this.escenario.iniciar(this.lienzo().nativeElement));
    destroy.onDestroy(() => this.escenario.detener());
  }
}
