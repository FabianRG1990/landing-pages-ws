import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavComponent } from '@adn-business-ui-shared/layout/nav/nav';
import { EJES, PROGRAMAS, SITE } from '@adn-business-ui-shared/data/site';

/**
 * Pagina de un programa. Version ligera y declarada como demo: existe
 * para que el cliente vea la profundidad prevista del sitio, no como
 * contenido definitivo.
 */
@Component({
  selector: 'app-programa',
  standalone: true,
  imports: [NavComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './programa.html',
  styleUrl: './programa.scss',
})
export class ProgramaComponent {
  private readonly ruta = inject(ActivatedRoute);
  private readonly clave = toSignal(
    this.ruta.paramMap.pipe(),
    { initialValue: this.ruta.snapshot.paramMap },
  );

  protected readonly site = SITE;

  protected readonly indice = computed(() => {
    const c = this.clave().get('programa') ?? 'board';
    const i = PROGRAMAS.columnas.findIndex((x) => x.clave === c);
    return i >= 0 ? i : 0;
  });

  protected readonly columna = computed(() => PROGRAMAS.columnas[this.indice()]);
  protected readonly eje = computed(() => EJES[this.indice()]);
  protected readonly filas = computed(() =>
    PROGRAMAS.filas.map((f) => ({ etiqueta: f.etiqueta, valor: f.valores[this.indice()] })),
  );
}
