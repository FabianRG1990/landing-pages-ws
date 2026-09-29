import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FABRICA } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { ParallaxDirective } from '@moofy-ui-shared/motion/parallax.directive';
import { ContadorDirective } from '@moofy-ui-shared/motion/contador.directive';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';

/** Capítulo 01: el argumento central. Moofy fabrica, no revende. */
@Component({
  selector: 'app-fabrica',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective, ParallaxDirective, ContadorDirective, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fabrica.html',
  styleUrl: './fabrica.scss',
})
export class FabricaComponent {
  protected readonly f = FABRICA;
}
