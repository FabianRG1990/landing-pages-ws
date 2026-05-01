import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { phosphorArrowUpRightBold } from '@ng-icons/phosphor-icons/bold';

import { exhibits } from '@acuario-ui-shared/data/data';
import { DepthTransition } from '@acuario-ui-shared/components/depth-transition/depth-transition';
import { ImgFadeDirective } from '@acuario-ui-shared/directives/img-fade/img-fade.directive';
import { PageHeader } from '@acuario-ui-shared/components/page-header/page-header';
import { RevealDirective } from '@acuario-ui-shared/directives/reveal/reveal.directive';

/**
 * ExhibicionesPage — recorrido editorial por los 6 biomas. Header + transición
 * + grid alternado (imagen ↔ texto, imagen ↔ texto…) con stats por exhibit.
 */
@Component({
  selector: 'app-exhibiciones-page',
  imports: [DepthTransition, ImgFadeDirective, NgIcon, PageHeader, RevealDirective],
  providers: [provideIcons({ phosphorArrowUpRightBold })],
  templateUrl: './exhibiciones.html',
  styleUrl: './exhibiciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExhibicionesPage {
  protected readonly exhibits = exhibits;
}
