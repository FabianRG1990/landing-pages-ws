import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Area } from '../../models';

export interface ColumnaKanban {
  estado: string;
  titulo: string;
}

export interface TarjetaKanban {
  numero: string;
  estado: string;
  placa: string;
  descripcionVehiculo: string;
  cliente: string;
  motivo: string;
  tecnico?: string;
  fechaEstimada?: string;
  total: number;
  /** Otras áreas activas en la misma orden, ya con su propio estado (ej. "Pintura: Cabina de pintura"). */
  chips: string[];
  /** Si la orden todavía no tiene la otra área, permite agregarla desde la tarjeta. */
  agregarArea?: { area: Area; label: string };
}

/**
 * Tablero kanban genérico reutilizado por Mecánica y Pintura: cada área le
 * pasa sus propias columnas (estados) y tarjetas ya mapeadas desde su
 * sub-flujo. El "siguiente estado" se calcula por posición dentro de
 * `columnas` (excluyendo "cancelado", que es un estado terminal aparte).
 */
@Component({
  selector: 'ota-kanban-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.scss',
})
export class KanbanBoard {
  readonly columnas = input.required<ColumnaKanban[]>();
  readonly tarjetas = input.required<TarjetaKanban[]>();
  readonly colorVar = input<string>('--ota-accent');

  readonly avanzar = output<{ numero: string; estado: string }>();
  readonly cancelar = output<string>();
  readonly agregarAreaClick = output<{ numero: string; area: Area }>();

  private readonly pasosPrincipales = computed(() =>
    this.columnas().filter((c) => c.estado !== 'cancelado'),
  );

  protected readonly porColumna = computed(() => {
    const grupos = new Map<string, TarjetaKanban[]>();
    for (const columna of this.columnas()) grupos.set(columna.estado, []);
    for (const tarjeta of this.tarjetas()) {
      grupos.get(tarjeta.estado)?.push(tarjeta);
    }
    return grupos;
  });

  protected tarjetasDe(estado: string): TarjetaKanban[] {
    return this.porColumna().get(estado) ?? [];
  }

  protected siguienteEstado(estadoActual: string): ColumnaKanban | null {
    const pasos = this.pasosPrincipales();
    const idx = pasos.findIndex((c) => c.estado === estadoActual);
    if (idx === -1 || idx === pasos.length - 1) return null;
    return pasos[idx + 1];
  }

  protected esTerminal(estado: string): boolean {
    const pasos = this.pasosPrincipales();
    return estado === 'cancelado' || estado === pasos[pasos.length - 1]?.estado;
  }
}
