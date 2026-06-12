import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '@interiorismo-ui-shared';

/** Estudio — quiénes somos, filosofía y cifras del atelier. */
@Component({
  selector: 'app-estudio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './estudio.html',
})
export class EstudioPage {}
