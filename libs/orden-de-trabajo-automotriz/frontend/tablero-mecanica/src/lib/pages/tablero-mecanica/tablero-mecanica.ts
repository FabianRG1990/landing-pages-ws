import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Area,
  ESTADOS_MECANICA,
  EstadoMecanica,
  KanbanBoard,
  OrdenesStore,
  TarjetaKanban,
  estadoPinturaLabel,
  subtotalSubOrden,
} from '@orden-de-trabajo-automotriz-ui-shared';

@Component({
  selector: 'ota-tablero-mecanica-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KanbanBoard],
  templateUrl: './tablero-mecanica.html',
  styleUrl: './tablero-mecanica.scss',
})
export class TableroMecanicaPage {
  private readonly store = inject(OrdenesStore);

  protected readonly columnas = ESTADOS_MECANICA.map((e) => ({ estado: e.value, titulo: e.label }));

  protected readonly tarjetas = computed<TarjetaKanban[]>(() =>
    this.store.ordenesPorArea('mecanica').map((orden) => {
      const sub = orden.areas.mecanica;
      if (!sub) throw new Error(`Orden ${orden.numero} sin sub-flujo de mecánica.`);

      const chips: string[] = [];
      let agregarArea: TarjetaKanban['agregarArea'];
      if (orden.areas.pintura) {
        chips.push(`Pintura: ${estadoPinturaLabel(orden.areas.pintura.estado)}`);
      } else {
        agregarArea = { area: 'pintura', label: 'Agregar Pintura' };
      }

      return {
        numero: orden.numero,
        estado: sub.estado,
        placa: orden.vehiculo.placa,
        descripcionVehiculo: `${orden.vehiculo.marca} ${orden.vehiculo.modelo}`,
        cliente: orden.cliente.nombre,
        motivo: orden.motivoIngreso,
        tecnico: sub.tecnicoAsignado,
        fechaEstimada: sub.fechaEstimadaEntrega,
        total: subtotalSubOrden(sub),
        chips,
        agregarArea,
      };
    }),
  );

  protected avanzar(evento: { numero: string; estado: string }): void {
    this.store.cambiarEstadoMecanica(evento.numero, evento.estado as EstadoMecanica);
  }

  protected cancelar(numero: string): void {
    this.store.cambiarEstadoMecanica(numero, 'cancelado');
  }

  protected agregarArea(evento: { numero: string; area: Area }): void {
    this.store.agregarArea(evento.numero, evento.area);
  }
}
