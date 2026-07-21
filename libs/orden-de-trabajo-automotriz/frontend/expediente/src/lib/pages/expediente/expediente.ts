import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AREAS,
  Area,
  OrdenTrabajo,
  OrdenesStore,
  estadoMecanicaLabel,
  estadoPinturaLabel,
  totalOrden,
} from '@orden-de-trabajo-automotriz-ui-shared';

@Component({
  selector: 'ota-expediente-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './expediente.html',
  styleUrl: './expediente.scss',
})
export class ExpedientePage {
  private readonly store = inject(OrdenesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly query = signal(
    this.route.snapshot.queryParamMap.get('q') ?? '',
  );
  protected readonly areas = AREAS;
  protected readonly totalOrden = totalOrden;

  protected readonly resultados = computed(() =>
    [...this.store.buscarPorPlacaOCliente(this.query())].sort((a, b) =>
      b.fechaIngreso.localeCompare(a.fechaIngreso),
    ),
  );

  protected readonly ficha = computed(() => this.resultados()[0]);

  protected buscar(valor: string): void {
    this.query.set(valor);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: valor || null },
      queryParamsHandling: 'merge',
    });
  }

  protected estadoDeArea(orden: OrdenTrabajo, area: Area): string | null {
    if (area === 'mecanica') {
      return orden.areas.mecanica ? estadoMecanicaLabel(orden.areas.mecanica.estado) : null;
    }
    return orden.areas.pintura ? estadoPinturaLabel(orden.areas.pintura.estado) : null;
  }
}
