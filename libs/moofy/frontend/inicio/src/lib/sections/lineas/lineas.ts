import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LINEAS } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';

/** Capítulo 02: las seis líneas, cada una con el canal donde mejor rinde. */
@Component({
  selector: 'app-lineas',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lineas.html',
  styleUrl: './lineas.scss',
})
export class LineasComponent {
  protected readonly l = LINEAS;
}
