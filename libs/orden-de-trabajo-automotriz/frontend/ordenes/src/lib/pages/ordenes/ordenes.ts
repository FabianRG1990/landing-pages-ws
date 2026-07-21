import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ESTADOS_ORDEN,
  EstadoOrden,
  OrdenesStore,
  totalOrden,
} from '@orden-de-trabajo-automotriz-ui-shared';

@Component({
  selector: 'ota-ordenes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './ordenes.html',
  styleUrl: './ordenes.scss',
})
export class OrdenesPage {
  private readonly store = inject(OrdenesStore);

  protected readonly ordenes = this.store.ordenes;
  protected readonly estados = ESTADOS_ORDEN;
  protected readonly totalOrden = totalOrden;

  protected cambiarEstado(numero: string, estado: string): void {
    this.store.cambiarEstado(numero, estado as EstadoOrden);
  }
}
