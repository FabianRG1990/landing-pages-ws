import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Area,
  ESTADOS_PINTURA,
  EstadoPintura,
  KanbanBoard,
  OrdenesStore,
  TarjetaKanban,
  estadoMecanicaLabel,
  subtotalSubOrden,
} from '@orden-de-trabajo-automotriz-ui-shared';

@Component({
  selector: 'ota-tablero-pintura-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KanbanBoard],
  templateUrl: './tablero-pintura.html',
  styleUrl: './tablero-pintura.scss',
})
export class TableroPinturaPage {
  private readonly store = inject(OrdenesStore);

  protected readonly columnas = ESTADOS_PINTURA.map((e) => ({ estado: e.value, titulo: e.label }));

  protected readonly tarjetas = computed<TarjetaKanban[]>(() =>
    this.store.ordenesPorArea('pintura').map((orden) => {
      const sub = orden.areas.pintura;
      if (!sub) throw new Error(`Orden ${orden.numero} sin sub-flujo de pintura.`);

      const chips: string[] = [];
      let agregarArea: TarjetaKanban['agregarArea'];
      if (orden.areas.mecanica) {
        chips.push(`Mecánica: ${estadoMecanicaLabel(orden.areas.mecanica.estado)}`);
      } else {
        agregarArea = { area: 'mecanica', label: 'Agregar Mecánica' };
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
    this.store.cambiarEstadoPintura(evento.numero, evento.estado as EstadoPintura);
  }

  protected cancelar(numero: string): void {
    this.store.cambiarEstadoPintura(numero, 'cancelado');
  }

  protected agregarArea(evento: { numero: string; area: Area }): void {
    this.store.agregarArea(evento.numero, evento.area);
  }
}
