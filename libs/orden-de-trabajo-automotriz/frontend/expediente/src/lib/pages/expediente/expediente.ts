import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  OrdenesStore,
  estadoLabel,
  totalOrden,
} from '@orden-de-trabajo-automotriz-ui-shared';

@Component({
  selector: 'ota-expediente-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe],
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
  protected readonly totalOrden = totalOrden;
  protected readonly estadoLabel = estadoLabel;

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
}
